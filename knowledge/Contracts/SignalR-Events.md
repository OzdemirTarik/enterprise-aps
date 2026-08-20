# 📑 SignalR Hub Olayları ve Sözleşmeleri

> **Kategori:** [[00-Index|Sözleşmeler]]  
> **Hub URL:** `/hubs/schedule`

---

## 📤 İstemciye Yayınlanan Olaylar (Server -> Client)

### 1. `OperationRescheduled`
```typescript
interface OperationRescheduledPayload {
  operationId: string;
  newStartTime: string; // ISO 8601
  newEndTime: string;
  affectedSuccessorIds: string[];
}
```

### 2. `TrackLockStateChanged`
```typescript
interface TrackLockStateChangedPayload {
  machineId: string;
  lockedByUserId: string;
  isLocked: boolean;
  lockedAt: string;
}
```
