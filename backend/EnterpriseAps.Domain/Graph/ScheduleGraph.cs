using System.Collections.Concurrent;
using EnterpriseAps.Domain.Entities;
using EnterpriseAps.Domain.Enums;

namespace EnterpriseAps.Domain.Graph;

public class ScheduleGraph : IScheduleGraph
{
    private readonly ReaderWriterLockSlim _lock = new(LockRecursionPolicy.SupportsRecursion);

    private readonly Dictionary<string, Resource> _resources = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, WorkOrder> _workOrders = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, Operation> _operations = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, ResourceDowntime> _downtimes = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<(string? ResourceId, string From, string To), int> _setupMatrix = new();

    // Adjacency graph representations for DAG lookups
    private readonly Dictionary<string, HashSet<string>> _directSuccessors = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, HashSet<string>> _directPredecessors = new(StringComparer.OrdinalIgnoreCase);

    public void Initialize(
        IEnumerable<Resource> resources,
        IEnumerable<WorkOrder> workOrders,
        IEnumerable<Operation> operations,
        IEnumerable<SetupMatrixItem> setupMatrices,
        IEnumerable<ResourceDowntime>? downtimes = null)
    {
        _lock.EnterWriteLock();
        try
        {
            _resources.Clear();
            _workOrders.Clear();
            _operations.Clear();
            _downtimes.Clear();
            _setupMatrix.Clear();
            _directSuccessors.Clear();
            _directPredecessors.Clear();

            foreach (var r in resources)
            {
                _resources[r.Id] = r;
            }

            foreach (var wo in workOrders)
            {
                _workOrders[wo.Id] = wo;
            }

            foreach (var s in setupMatrices)
            {
                _setupMatrix[(s.ResourceId, s.FromProductType, s.ToProductType)] = s.SetupMinutes;
            }

            if (downtimes != null)
            {
                foreach (var dt in downtimes)
                {
                    _downtimes[dt.Id] = dt;
                }
            }

            foreach (var op in operations)
            {
                _operations[op.Id] = op.Clone();

                if (!_directSuccessors.ContainsKey(op.Id))
                    _directSuccessors[op.Id] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                if (!_directPredecessors.ContainsKey(op.Id))
                    _directPredecessors[op.Id] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                foreach (var predId in op.PrecedenceOperationIds)
                {
                    _directPredecessors[op.Id].Add(predId);

                    if (!_directSuccessors.ContainsKey(predId))
                        _directSuccessors[predId] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    _directSuccessors[predId].Add(op.Id);
                }
            }

            // Perform initial setup time normalization across all machines
            RecalculateMachineSetupsInternal();
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public IReadOnlyList<Resource> GetAllResources()
    {
        _lock.EnterReadLock();
        try
        {
            return _resources.Values.OrderBy(r => r.Name).ToList();
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public IReadOnlyList<Operation> GetAllOperations()
    {
        _lock.EnterReadLock();
        try
        {
            return _operations.Values.Select(op => op.Clone()).ToList();
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public IReadOnlyList<WorkOrder> GetAllWorkOrders()
    {
        _lock.EnterReadLock();
        try
        {
            return _workOrders.Values.ToList();
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public IReadOnlyList<SetupMatrixItem> GetAllSetupMatrices()
    {
        _lock.EnterReadLock();
        try
        {
            return _setupMatrix.Select(kvp => new SetupMatrixItem
            {
                ResourceId = kvp.Key.ResourceId,
                FromProductType = kvp.Key.From,
                ToProductType = kvp.Key.To,
                SetupMinutes = kvp.Value
            }).ToList();
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public IReadOnlyList<ResourceDowntime> GetAllDowntimes()
    {
        _lock.EnterReadLock();
        try
        {
            return _downtimes.Values.OrderBy(d => d.StartTime).ToList();
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public Operation? GetOperation(string operationId)
    {
        _lock.EnterReadLock();
        try
        {
            return _operations.TryGetValue(operationId, out var op) ? op.Clone() : null;
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public Resource? GetResource(string resourceId)
    {
        _lock.EnterReadLock();
        try
        {
            return _resources.TryGetValue(resourceId, out var r) ? r : null;
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public WorkOrder? GetWorkOrder(string workOrderId)
    {
        _lock.EnterReadLock();
        try
        {
            return _workOrders.TryGetValue(workOrderId, out var wo) ? wo : null;
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public ResourceDowntime? GetDowntime(string downtimeId)
    {
        _lock.EnterReadLock();
        try
        {
            return _downtimes.TryGetValue(downtimeId, out var dt) ? dt : null;
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public int GetSetupMinutes(string resourceId, string fromProductType, string toProductType)
    {
        if (string.IsNullOrEmpty(fromProductType) || string.IsNullOrEmpty(toProductType))
        {
            return 0;
        }

        if (string.Equals(fromProductType, toProductType, StringComparison.OrdinalIgnoreCase))
        {
            return 5; // Minimal inspection/cleaning setup
        }

        if (_setupMatrix.TryGetValue((resourceId, fromProductType, toProductType), out var specificMinutes))
        {
            return specificMinutes;
        }

        if (_setupMatrix.TryGetValue((null, fromProductType, toProductType), out var globalMinutes))
        {
            return globalMinutes;
        }

        return 15; // Default sequence penalty
    }

    public ScheduleDelta RescheduleOperation(
        string operationId,
        string targetResourceId,
        DateTime targetStartTime,
        bool autoCascade = true)
    {
        _lock.EnterWriteLock();
        try
        {
            if (!_operations.TryGetValue(operationId, out var targetOp))
            {
                return new ScheduleDelta
                {
                    TriggeredByOperationId = operationId,
                    Success = false,
                    ErrorMessage = $"Operation '{operationId}' not found in schedule graph."
                };
            }

            if (!_resources.ContainsKey(targetResourceId))
            {
                return new ScheduleDelta
                {
                    TriggeredByOperationId = operationId,
                    Success = false,
                    ErrorMessage = $"Target Resource '{targetResourceId}' does not exist."
                };
            }

            var affectedMap = new Dictionary<string, Operation>(StringComparer.OrdinalIgnoreCase);

            // 1. Precedence earliest constraint
            var earliestPrecedenceAllowed = DateTime.MinValue;
            if (_workOrders.TryGetValue(targetOp.WorkOrderId, out var wo))
            {
                earliestPrecedenceAllowed = wo.ReleaseDate;
            }

            foreach (var predId in targetOp.PrecedenceOperationIds)
            {
                if (_operations.TryGetValue(predId, out var predOp))
                {
                    if (predOp.PlannedEndTime > earliestPrecedenceAllowed)
                    {
                        earliestPrecedenceAllowed = predOp.PlannedEndTime;
                    }
                }
            }

            var effectiveStartTime = targetStartTime < earliestPrecedenceAllowed
                ? earliestPrecedenceAllowed
                : targetStartTime;

            // 2. Downtime collision evasion
            effectiveStartTime = EvadeResourceDowntimes(targetResourceId, effectiveStartTime, targetOp.DurationMinutes);

            // 3. Update Target Operation
            targetOp.RequiredResourceId = targetResourceId;
            targetOp.PlannedStartTime = effectiveStartTime;

            var previousOpOnMachine = _operations.Values
                .Where(o => o.RequiredResourceId == targetResourceId && o.Id != targetOp.Id && o.PlannedEndTime <= effectiveStartTime)
                .OrderByDescending(o => o.PlannedEndTime)
                .FirstOrDefault();

            var fromType = previousOpOnMachine?.ProductType ?? string.Empty;
            targetOp.SetupDurationMinutes = string.IsNullOrEmpty(fromType)
                ? 0
                : GetSetupMinutes(targetResourceId, fromType, targetOp.ProductType);

            targetOp.PlannedEndTime = targetOp.PlannedStartTime.AddMinutes(targetOp.SetupDurationMinutes + targetOp.DurationMinutes);
            affectedMap[targetOp.Id] = targetOp;

            if (autoCascade)
            {
                ResolveMachineOverlaps(targetResourceId, affectedMap);
                RippleDownstreamPrecedences(targetOp.Id, affectedMap);
            }

            UpdateOperationStatuses();

            return new ScheduleDelta
            {
                TriggeredByOperationId = operationId,
                AffectedOperations = affectedMap.Values.Select(o => o.Clone()).ToList(),
                Timestamp = DateTime.UtcNow,
                Success = true
            };
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public ScheduleDelta ResizeOperation(
        string operationId,
        int newDurationMinutes,
        bool autoCascade = true)
    {
        _lock.EnterWriteLock();
        try
        {
            if (!_operations.TryGetValue(operationId, out var targetOp))
            {
                return new ScheduleDelta
                {
                    TriggeredByOperationId = operationId,
                    Success = false,
                    ErrorMessage = $"Operation '{operationId}' not found."
                };
            }

            if (newDurationMinutes < 15) newDurationMinutes = 15;

            var affectedMap = new Dictionary<string, Operation>(StringComparer.OrdinalIgnoreCase);
            targetOp.DurationMinutes = newDurationMinutes;
            targetOp.PlannedEndTime = targetOp.PlannedStartTime.AddMinutes(targetOp.SetupDurationMinutes + targetOp.DurationMinutes);
            affectedMap[targetOp.Id] = targetOp;

            if (autoCascade)
            {
                ResolveMachineOverlaps(targetOp.RequiredResourceId, affectedMap);
                RippleDownstreamPrecedences(targetOp.Id, affectedMap);
            }

            UpdateOperationStatuses();

            return new ScheduleDelta
            {
                TriggeredByOperationId = operationId,
                AffectedOperations = affectedMap.Values.Select(o => o.Clone()).ToList(),
                Timestamp = DateTime.UtcNow,
                Success = true
            };
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public ScheduleDelta SplitOperation(
        string operationId,
        int splitDurationMinutes,
        out Operation newOperation)
    {
        _lock.EnterWriteLock();
        try
        {
            if (!_operations.TryGetValue(operationId, out var originalOp))
            {
                newOperation = new Operation();
                return new ScheduleDelta
                {
                    TriggeredByOperationId = operationId,
                    Success = false,
                    ErrorMessage = $"Operation '{operationId}' not found."
                };
            }

            if (splitDurationMinutes <= 0 || splitDurationMinutes >= originalOp.DurationMinutes)
            {
                newOperation = new Operation();
                return new ScheduleDelta
                {
                    TriggeredByOperationId = operationId,
                    Success = false,
                    ErrorMessage = $"Split duration must be between 1 and {originalOp.DurationMinutes - 1} minutes."
                };
            }

            var remainingDuration = originalOp.DurationMinutes - splitDurationMinutes;

            // 1. Update original op
            originalOp.DurationMinutes = splitDurationMinutes;
            originalOp.PlannedEndTime = originalOp.PlannedStartTime.AddMinutes(originalOp.SetupDurationMinutes + originalOp.DurationMinutes);

            // 2. Create sub-operation
            var newOpId = $"{originalOp.Id}-B";
            newOperation = new Operation
            {
                Id = newOpId,
                WorkOrderId = originalOp.WorkOrderId,
                SequenceIndex = originalOp.SequenceIndex + 1,
                Name = $"{originalOp.Name} (Part 2)",
                ProductType = originalOp.ProductType,
                RequiredResourceId = originalOp.RequiredResourceId,
                DurationMinutes = remainingDuration,
                SetupDurationMinutes = 5,
                PlannedStartTime = originalOp.PlannedEndTime.AddMinutes(5),
                PlannedEndTime = originalOp.PlannedEndTime.AddMinutes(5 + 5 + remainingDuration),
                Status = originalOp.Status,
                ColorCode = originalOp.ColorCode,
                PrecedenceOperationIds = new List<string> { originalOp.Id }
            };

            // 3. Update adjacency and re-route successors of original op to newOp
            _operations[newOperation.Id] = newOperation.Clone();
            _directSuccessors[newOperation.Id] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            _directPredecessors[newOperation.Id] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { originalOp.Id };

            if (_directSuccessors.TryGetValue(originalOp.Id, out var oldSuccList))
            {
                var copyList = oldSuccList.ToList();
                foreach (var succId in copyList)
                {
                    if (_operations.TryGetValue(succId, out var succOp))
                    {
                        succOp.PrecedenceOperationIds.Remove(originalOp.Id);
                        succOp.PrecedenceOperationIds.Add(newOperation.Id);

                        if (_directPredecessors.TryGetValue(succId, out var succPreds))
                        {
                            succPreds.Remove(originalOp.Id);
                            succPreds.Add(newOperation.Id);
                        }

                        _directSuccessors[newOperation.Id].Add(succId);
                    }
                }
                oldSuccList.Clear();
            }

            if (!_directSuccessors.ContainsKey(originalOp.Id))
                _directSuccessors[originalOp.Id] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            _directSuccessors[originalOp.Id].Add(newOperation.Id);

            var affectedMap = new Dictionary<string, Operation>(StringComparer.OrdinalIgnoreCase)
            {
                [originalOp.Id] = originalOp,
                [newOperation.Id] = newOperation
            };

            ResolveMachineOverlaps(originalOp.RequiredResourceId, affectedMap);
            RippleDownstreamPrecedences(newOperation.Id, affectedMap);
            UpdateOperationStatuses();

            return new ScheduleDelta
            {
                TriggeredByOperationId = operationId,
                AffectedOperations = affectedMap.Values.Select(o => o.Clone()).ToList(),
                Timestamp = DateTime.UtcNow,
                Success = true
            };
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public ScheduleDelta AddOrUpdateOperation(Operation operation, bool autoCascade = true)
    {
        _lock.EnterWriteLock();
        try
        {
            _operations[operation.Id] = operation.Clone();

            if (!_directSuccessors.ContainsKey(operation.Id))
                _directSuccessors[operation.Id] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (!_directPredecessors.ContainsKey(operation.Id))
                _directPredecessors[operation.Id] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var predId in operation.PrecedenceOperationIds)
            {
                _directPredecessors[operation.Id].Add(predId);
                if (!_directSuccessors.ContainsKey(predId))
                    _directSuccessors[predId] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                _directSuccessors[predId].Add(operation.Id);
            }

            var affectedMap = new Dictionary<string, Operation>(StringComparer.OrdinalIgnoreCase)
            {
                [operation.Id] = operation
            };

            if (autoCascade)
            {
                ResolveMachineOverlaps(operation.RequiredResourceId, affectedMap);
                RippleDownstreamPrecedences(operation.Id, affectedMap);
            }

            UpdateOperationStatuses();

            return new ScheduleDelta
            {
                TriggeredByOperationId = operation.Id,
                AffectedOperations = affectedMap.Values.Select(o => o.Clone()).ToList(),
                Timestamp = DateTime.UtcNow,
                Success = true
            };
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public ScheduleDelta DeleteOperation(string operationId, bool autoCascade = true)
    {
        _lock.EnterWriteLock();
        try
        {
            if (!_operations.TryGetValue(operationId, out var targetOp))
            {
                return new ScheduleDelta
                {
                    TriggeredByOperationId = operationId,
                    Success = true
                };
            }

            _operations.Remove(operationId);

            // Clean precedence references
            if (_directSuccessors.TryGetValue(operationId, out var succIds))
            {
                foreach (var succId in succIds)
                {
                    if (_operations.TryGetValue(succId, out var succOp))
                    {
                        succOp.PrecedenceOperationIds.Remove(operationId);
                    }
                    if (_directPredecessors.TryGetValue(succId, out var succPreds))
                    {
                        succPreds.Remove(operationId);
                    }
                }
            }

            _directSuccessors.Remove(operationId);
            _directPredecessors.Remove(operationId);

            var affectedMap = new Dictionary<string, Operation>(StringComparer.OrdinalIgnoreCase);
            if (autoCascade)
            {
                ResolveMachineOverlaps(targetOp.RequiredResourceId, affectedMap);
            }

            UpdateOperationStatuses();

            return new ScheduleDelta
            {
                TriggeredByOperationId = operationId,
                AffectedOperations = affectedMap.Values.Select(o => o.Clone()).ToList(),
                Timestamp = DateTime.UtcNow,
                Success = true
            };
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public void AddOrUpdateResource(Resource resource)
    {
        _lock.EnterWriteLock();
        try
        {
            _resources[resource.Id] = resource;
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public void DeleteResource(string resourceId)
    {
        _lock.EnterWriteLock();
        try
        {
            _resources.Remove(resourceId);
            // Reassign or delete operations assigned to this resource if needed
            var toRemove = _operations.Values.Where(o => o.RequiredResourceId == resourceId).Select(o => o.Id).ToList();
            foreach (var opId in toRemove)
            {
                DeleteOperation(opId, false);
            }
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public void AddOrUpdateWorkOrder(WorkOrder workOrder)
    {
        _lock.EnterWriteLock();
        try
        {
            _workOrders[workOrder.Id] = workOrder;
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public void DeleteWorkOrder(string workOrderId)
    {
        _lock.EnterWriteLock();
        try
        {
            _workOrders.Remove(workOrderId);
            var opsToRemove = _operations.Values.Where(o => o.WorkOrderId == workOrderId).Select(o => o.Id).ToList();
            foreach (var opId in opsToRemove)
            {
                DeleteOperation(opId, false);
            }
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public ScheduleDelta AddOrUpdateDowntime(ResourceDowntime downtime, bool autoCascade = true)
    {
        _lock.EnterWriteLock();
        try
        {
            _downtimes[downtime.Id] = downtime;

            var affectedMap = new Dictionary<string, Operation>(StringComparer.OrdinalIgnoreCase);

            // Shift any operations overlapping with this downtime
            var machineOps = _operations.Values
                .Where(o => o.RequiredResourceId == downtime.ResourceId)
                .OrderBy(o => o.PlannedStartTime)
                .ToList();

            foreach (var op in machineOps)
            {
                if (op.PlannedStartTime < downtime.EndTime && op.PlannedEndTime > downtime.StartTime)
                {
                    // Push after downtime
                    var shiftDelta = downtime.EndTime - op.PlannedStartTime;
                    op.PlannedStartTime = downtime.EndTime;
                    op.PlannedEndTime = op.PlannedStartTime.AddMinutes(op.SetupDurationMinutes + op.DurationMinutes);
                    affectedMap[op.Id] = op;

                    if (autoCascade)
                    {
                        ResolveMachineOverlaps(downtime.ResourceId, affectedMap);
                        RippleDownstreamPrecedences(op.Id, affectedMap);
                    }
                }
            }

            UpdateOperationStatuses();

            return new ScheduleDelta
            {
                TriggeredByOperationId = $"DOWNTIME_{downtime.Id}",
                AffectedOperations = affectedMap.Values.Select(o => o.Clone()).ToList(),
                Timestamp = DateTime.UtcNow,
                Success = true
            };
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public ScheduleDelta DeleteDowntime(string downtimeId, bool autoCascade = true)
    {
        _lock.EnterWriteLock();
        try
        {
            _downtimes.Remove(downtimeId);
            return new ScheduleDelta
            {
                TriggeredByOperationId = $"DOWNTIME_DEL_{downtimeId}",
                Success = true
            };
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public void AddOrUpdateSetupMatrix(SetupMatrixItem item)
    {
        _lock.EnterWriteLock();
        try
        {
            _setupMatrix[(item.ResourceId, item.FromProductType, item.ToProductType)] = item.SetupMinutes;
            RecalculateMachineSetupsInternal();
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public void DeleteSetupMatrix(int id)
    {
        _lock.EnterWriteLock();
        try
        {
            var keyToRemove = _setupMatrix.Keys.FirstOrDefault(k => true);
            // In setup matrix removal we refresh from DB
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    private DateTime EvadeResourceDowntimes(string resourceId, DateTime targetStart, int durationMin)
    {
        var activeDts = _downtimes.Values
            .Where(d => d.ResourceId == resourceId)
            .OrderBy(d => d.StartTime)
            .ToList();

        var currentStart = targetStart;
        bool adjusted = true;

        while (adjusted)
        {
            adjusted = false;
            var currentEnd = currentStart.AddMinutes(durationMin);

            foreach (var dt in activeDts)
            {
                if (currentStart < dt.EndTime && currentEnd > dt.StartTime)
                {
                    currentStart = dt.EndTime;
                    adjusted = true;
                    break;
                }
            }
        }

        return currentStart;
    }

    private void ResolveMachineOverlaps(string resourceId, Dictionary<string, Operation> affectedMap)
    {
        var machineOps = _operations.Values
            .Where(o => o.RequiredResourceId == resourceId)
            .OrderBy(o => o.PlannedStartTime)
            .ToList();

        for (int i = 0; i < machineOps.Count - 1; i++)
        {
            var current = machineOps[i];
            var next = machineOps[i + 1];

            if (next.PlannedStartTime < current.PlannedEndTime)
            {
                var nextSetup = GetSetupMinutes(resourceId, current.ProductType, next.ProductType);
                var nextStart = current.PlannedEndTime;
                nextStart = EvadeResourceDowntimes(resourceId, nextStart, next.DurationMinutes);

                next.SetupDurationMinutes = nextSetup;
                next.PlannedStartTime = nextStart;
                next.PlannedEndTime = next.PlannedStartTime.AddMinutes(nextSetup + next.DurationMinutes);

                affectedMap[next.Id] = next;
                RippleDownstreamPrecedences(next.Id, affectedMap);
            }
        }
    }

    private void RippleDownstreamPrecedences(string parentOpId, Dictionary<string, Operation> affectedMap)
    {
        if (!_operations.TryGetValue(parentOpId, out var parentOp)) return;
        if (!_directSuccessors.TryGetValue(parentOpId, out var successorIds)) return;

        foreach (var succId in successorIds)
        {
            if (!_operations.TryGetValue(succId, out var succOp)) continue;

            if (succOp.PlannedStartTime < parentOp.PlannedEndTime)
            {
                var newStart = EvadeResourceDowntimes(succOp.RequiredResourceId, parentOp.PlannedEndTime, succOp.DurationMinutes);
                succOp.PlannedStartTime = newStart;
                succOp.PlannedEndTime = succOp.PlannedStartTime.AddMinutes(succOp.SetupDurationMinutes + succOp.DurationMinutes);
                affectedMap[succOp.Id] = succOp;

                ResolveMachineOverlaps(succOp.RequiredResourceId, affectedMap);
                RippleDownstreamPrecedences(succOp.Id, affectedMap);
            }
        }
    }

    private void RecalculateMachineSetupsInternal()
    {
        foreach (var resource in _resources.Values)
        {
            var ops = _operations.Values
                .Where(o => o.RequiredResourceId == resource.Id)
                .OrderBy(o => o.PlannedStartTime)
                .ToList();

            for (int i = 0; i < ops.Count; i++)
            {
                var current = ops[i];
                if (i == 0)
                {
                    current.SetupDurationMinutes = 0;
                }
                else
                {
                    var prev = ops[i - 1];
                    current.SetupDurationMinutes = GetSetupMinutes(resource.Id, prev.ProductType, current.ProductType);
                }
                current.PlannedEndTime = current.PlannedStartTime.AddMinutes(current.SetupDurationMinutes + current.DurationMinutes);
            }
        }
    }

    private void UpdateOperationStatuses()
    {
        foreach (var op in _operations.Values)
        {
            if (_workOrders.TryGetValue(op.WorkOrderId, out var wo))
            {
                if (op.PlannedEndTime > wo.DueDate)
                {
                    op.Status = OperationStatus.Delayed;
                }
                else if (op.Status == OperationStatus.Delayed)
                {
                    op.Status = OperationStatus.Planned;
                }
            }
        }
    }

    public ScheduleDelta OptimizeSchedule(string strategy = "HEURISTIC_SPT_EDD")
    {
        _lock.EnterWriteLock();
        try
        {
            var sortedWorkOrders = _workOrders.Values
                .OrderBy(w => w.Priority)
                .ThenBy(w => w.DueDate)
                .ToList();

            var machineTimelines = _resources.Keys.ToDictionary(k => k, _ => DateTime.UtcNow.Date.AddHours(8));
            var affected = new Dictionary<string, Operation>(StringComparer.OrdinalIgnoreCase);

            foreach (var wo in sortedWorkOrders)
            {
                var woOps = _operations.Values
                    .Where(o => o.WorkOrderId == wo.Id)
                    .OrderBy(o => o.SequenceIndex)
                    .ToList();

                DateTime currentWoChainTime = wo.ReleaseDate > DateTime.UtcNow.Date.AddHours(8)
                    ? wo.ReleaseDate
                    : DateTime.UtcNow.Date.AddHours(8);

                foreach (var op in woOps)
                {
                    var machineId = op.RequiredResourceId;
                    if (!machineTimelines.TryGetValue(machineId, out var machineAvailTime))
                    {
                        machineAvailTime = DateTime.UtcNow.Date.AddHours(8);
                    }

                    var startTime = machineAvailTime > currentWoChainTime ? machineAvailTime : currentWoChainTime;
                    startTime = EvadeResourceDowntimes(machineId, startTime, op.DurationMinutes);

                    var prevOpOnMachine = _operations.Values
                        .Where(o => o.RequiredResourceId == machineId && affected.ContainsKey(o.Id) && o.PlannedEndTime <= startTime)
                        .OrderByDescending(o => o.PlannedEndTime)
                        .FirstOrDefault();

                    var setupMin = prevOpOnMachine == null
                        ? 0
                        : GetSetupMinutes(machineId, prevOpOnMachine.ProductType, op.ProductType);

                    op.SetupDurationMinutes = setupMin;
                    op.PlannedStartTime = startTime;
                    op.PlannedEndTime = startTime.AddMinutes(setupMin + op.DurationMinutes);

                    machineTimelines[machineId] = op.PlannedEndTime.AddMinutes(5);
                    currentWoChainTime = op.PlannedEndTime;

                    affected[op.Id] = op;
                }
            }

            UpdateOperationStatuses();

            return new ScheduleDelta
            {
                TriggeredByOperationId = "OPTIMIZE_ENGINE",
                AffectedOperations = affected.Values.Select(o => o.Clone()).ToList(),
                Timestamp = DateTime.UtcNow,
                Success = true
            };
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public ScheduleKpi CalculateKpis()
    {
        _lock.EnterReadLock();
        try
        {
            var ops = _operations.Values.ToList();
            if (ops.Count == 0)
            {
                return new ScheduleKpi
                {
                    ScheduleStart = DateTime.UtcNow,
                    ScheduleEnd = DateTime.UtcNow
                };
            }

            var scheduleStart = ops.Min(o => o.PlannedStartTime);
            var scheduleEnd = ops.Max(o => o.PlannedEndTime);
            var totalHorizonMinutes = Math.Max(1.0, (scheduleEnd - scheduleStart).TotalMinutes);
            var totalHorizonHours = totalHorizonMinutes / 60.0;

            var totalDurationMinutes = ops.Sum(o => (double)o.DurationMinutes);
            var totalSetupMinutes = ops.Sum(o => (double)o.SetupDurationMinutes);

            var setupRatio = (totalDurationMinutes + totalSetupMinutes) > 0
                ? (totalSetupMinutes / (totalDurationMinutes + totalSetupMinutes)) * 100.0
                : 0.0;

            var resourceUtil = new Dictionary<string, double>();
            foreach (var r in _resources.Values)
            {
                var rOps = ops.Where(o => o.RequiredResourceId == r.Id).ToList();
                var rBusyMinutes = rOps.Sum(o => o.DurationMinutes + o.SetupDurationMinutes);
                var utilPercent = Math.Min(100.0, (rBusyMinutes / totalHorizonMinutes) * 100.0);
                resourceUtil[r.Id] = Math.Round(utilPercent, 1);
            }

            var delayedCount = 0;
            foreach (var wo in _workOrders.Values)
            {
                var woOps = ops.Where(o => o.WorkOrderId == wo.Id).ToList();
                if (woOps.Count > 0)
                {
                    var woFinish = woOps.Max(o => o.PlannedEndTime);
                    if (woFinish > wo.DueDate)
                    {
                        delayedCount++;
                    }
                }
            }

            var totalWos = Math.Max(1, _workOrders.Count);
            var onTimeRate = Math.Max(0.0, ((totalWos - delayedCount) / (double)totalWos) * 100.0);

            var avgUtil = resourceUtil.Values.Count > 0 ? resourceUtil.Values.Average() : 0.0;
            var oeePercent = Math.Round(avgUtil * (1.0 - (setupRatio / 200.0)) * 0.96, 1);

            return new ScheduleKpi
            {
                TotalMakespanHours = Math.Round(totalHorizonHours, 1),
                OverallOeePercentage = Math.Max(0.0, Math.Min(100.0, oeePercent)),
                TotalSetupTimeHours = Math.Round(totalSetupMinutes / 60.0, 1),
                SetupRatioPercentage = Math.Round(setupRatio, 1),
                DelayedWorkOrdersCount = delayedCount,
                OnTimeDeliveryRatePercentage = Math.Round(onTimeRate, 1),
                TotalOperationsCount = ops.Count,
                TotalWorkOrdersCount = _workOrders.Count,
                ResourceUtilization = resourceUtil,
                ScheduleStart = scheduleStart,
                ScheduleEnd = scheduleEnd
            };
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public void ResetToInitial(
        IEnumerable<Resource> resources,
        IEnumerable<WorkOrder> workOrders,
        IEnumerable<Operation> operations,
        IEnumerable<SetupMatrixItem> setupMatrices,
        IEnumerable<ResourceDowntime>? downtimes = null)
    {
        Initialize(resources, workOrders, operations, setupMatrices, downtimes);
    }
}
