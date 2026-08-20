# 📑 REST API Uç Noktaları

> **Kategori:** [[00-Index|Sözleşmeler]]

---

| Metod | Uç Nokta | CQRS Karşılığı | Açıklama |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/schedule/snapshot` | `GetScheduleSnapshotQuery` | Tüm hat ve operasyonların anlık çizelgesi |
| `POST` | `/api/schedule/reschedule` | `RescheduleOperationCommand` | Operasyonu yeni zamana taşı ve dalgalanmayı hesapla |
| `POST` | `/api/schedule/lock-track` | `LockTrackCommand` | Makine hattını düzenleme için kilitle |
| `GET` | `/api/kpis/oee` | `GetLineKpisQuery` | Hat OEE ve Makespan metrikleri |
