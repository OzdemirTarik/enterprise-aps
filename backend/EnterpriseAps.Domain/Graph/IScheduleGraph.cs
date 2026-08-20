using EnterpriseAps.Domain.Entities;

namespace EnterpriseAps.Domain.Graph;

public interface IScheduleGraph
{
    void Initialize(
        IEnumerable<Resource> resources,
        IEnumerable<WorkOrder> workOrders,
        IEnumerable<Operation> operations,
        IEnumerable<SetupMatrixItem> setupMatrices,
        IEnumerable<ResourceDowntime>? downtimes = null,
        IEnumerable<ShiftSchedule>? shifts = null);

    IReadOnlyList<Resource> GetAllResources();
    IReadOnlyList<Operation> GetAllOperations();
    IReadOnlyList<WorkOrder> GetAllWorkOrders();
    IReadOnlyList<SetupMatrixItem> GetAllSetupMatrices();
    IReadOnlyList<ResourceDowntime> GetAllDowntimes();
    IReadOnlyList<ShiftSchedule> GetAllShifts();
    DateTime GetNextWorkingTime(DateTime time);
    DateTime CalculateWorkingEndTime(DateTime start, int durationMin);

    void UpdateShifts(IEnumerable<ShiftSchedule> shifts);

    Operation? GetOperation(string operationId);
    Resource? GetResource(string resourceId);
    WorkOrder? GetWorkOrder(string workOrderId);
    ResourceDowntime? GetDowntime(string downtimeId);

    int GetSetupMinutes(string resourceId, string fromProductType, string toProductType);

    ScheduleDelta RescheduleOperation(
        string operationId,
        string targetResourceId,
        DateTime targetStartTime,
        bool autoCascade = true);

    ScheduleDelta ResizeOperation(
        string operationId,
        int newDurationMinutes,
        bool autoCascade = true);

    ScheduleDelta SplitOperation(
        string operationId,
        int splitDurationMinutes,
        out Operation newOperation);

    ScheduleDelta AddOrUpdateOperation(Operation operation, bool autoCascade = true);
    ScheduleDelta DeleteOperation(string operationId, bool autoCascade = true);

    void AddOrUpdateResource(Resource resource);
    void DeleteResource(string resourceId);

    void AddOrUpdateWorkOrder(WorkOrder workOrder);
    void DeleteWorkOrder(string workOrderId);

    ScheduleDelta AddOrUpdateDowntime(ResourceDowntime downtime, bool autoCascade = true);
    ScheduleDelta DeleteDowntime(string downtimeId, bool autoCascade = true);

    void AddOrUpdateSetupMatrix(SetupMatrixItem item);
    void DeleteSetupMatrix(int id);

    ScheduleDelta OptimizeSchedule(string strategy = "HEURISTIC_SPT_EDD");

    ScheduleKpi CalculateKpis();

    bool WouldCreateCycle(string operationId, IEnumerable<string> candidatePredecessors);

    void ResetToInitial(
        IEnumerable<Resource> resources,
        IEnumerable<WorkOrder> workOrders,
        IEnumerable<Operation> operations,
        IEnumerable<SetupMatrixItem> setupMatrices,
        IEnumerable<ResourceDowntime>? downtimes = null);
}
