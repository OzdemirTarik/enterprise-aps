# 🏛️ ADR-003: CQRS ve MediatR Deseni

- **Durum:** Kabul Edildi (Accepted)
- **Tarih:** 2026-08-20

---

## 🎯 Karar
Backend .NET 8 uygulamasında iş kuralları ve durum değişiklikleri **CQRS (Command Query Responsibility Segregation)** ve **MediatR** ile organize edilecektir.
- Komutlar: `RescheduleOperationCommand`, `LockTrackCommand`, `CreateWorkOrderCommand`
- Sorgular: `GetScheduleSnapshotQuery`, `GetLineKpisQuery`
