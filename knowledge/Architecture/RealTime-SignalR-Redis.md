# ⚡ Real-Time SignalR & Redis Dağıtık Kilit Mimarisi

> **Kategori:** [[00-Index|Mimari]]  
> **İlgili Departmanlar:** `DEPT=backend`, `DEPT=db_dev`, `DEPT=frontend`  
> **İlgili ADR:** [[ADR-002-redis-distributed-lock]]

---

## 📡 SignalR WebSocket Akışı

Çok kullanıcılı ortamda, herhangi bir planlamacının yaptığı çizelgeleme değişikliği anında diğer tüm kullanıcılara delta olarak iletilir.

```mermaid
sequenceDiagram
    actor PlannerA as Planlamacı A
    participant UI as React Gantt UI
    participant Hub as ScheduleHub (.NET 8)
    participant Redis as Redis Pub/Sub & Locks
    actor PlannerB as Planlamacı B

    PlannerA->>UI: Operasyonu Taşı (Drag & Drop)
    UI->>Hub: MoveOperationCommand (Id, NewStartTime)
    Hub->>Redis: AcquireTrackLock(MachineId, UserId)
    Hub->>Hub: DAG Recalculate Deltas
    Hub->>Redis: ReleaseTrackLock
    Hub-->>PlannerA: 200 OK + Delta
    Hub--)PlannerB: Broadcast "OperationsRescheduled" (Deltas)
    PlannerB-->>UI: Gantt Çizgileri Anında Güncellenir
```

---

## 🔒 Dağıtık Kilit (Distributed Locking)

- **Anahtar Deseni:** `lock:machine:{MachineId}` veya `lock:operation:{OperationId}`
- **TTL (Zaman Aşımı):** 30 saniye (Heartbeat ile uzatılabilir).
- **Amaç:** İki kullanıcının aynı makine hattındaki operasyonları aynı anda çakışan saatlere taşımasını önlemek.
