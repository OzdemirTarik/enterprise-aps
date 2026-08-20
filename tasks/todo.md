# Enterprise APS — Görev Listesi (Tasks / Todo)

## Faz 1: Test & Güvenilirlik Altyapısı (Backend & System)
- [ ] Task 1: `EnterpriseAps.Tests` xUnit Test Projesi Oluşturma (`DEPT=system` & `DEPT=backend`)
  - [ ] `dotnet new xunit -n EnterpriseAps.Tests` oluştur ve `.sln` dosyasına bağla
  - [ ] FluentAssertions, Moq, Microsoft.NET.Test.Sdk paketlerini ekle
  - [ ] `EnterpriseAps.Domain` ve `EnterpriseAps.Application` referanslarını tanımla
- [ ] Task 2: `ScheduleGraph` Çekirdek Birim Testleri (`DEPT=backend`)
  - [ ] Precedence gecikme ve ardıl zincir dalgalanma testleri
  - [ ] Makine çakışma çözümleme (`ResolveMachineOverlaps`) testleri
  - [ ] SMT Setup matrisi süre hesaplama testleri (SAC305/SnPb, Feeder)
  - [ ] Vardiya takvimi & planlı bakım duruşu atlama (`EvadeOffShift`) testleri
- [ ] Task 3: Döngüsel Bağımlılık (Cycle Detection) Algoritması (`DEPT=backend`)
  - [ ] `ScheduleGraph` içine `HasCycle` / `ValidateNoCycle` DFS kontrolü ekle
  - [ ] `CreateOperation` / `UpdateOperation` CQRS komutlarında validasyon entegrasyonu
  - [ ] Döngü yakalama birim testlerini (`CycleDetectionTests.cs`) yaz

## Faz 2: Çoklu Operasyon Seçimi & Toplu Yönetim (Frontend)
- [ ] Task 4: Zustand Store Çoklu Seçim & Toplu Eylemler Altyapısı (`DEPT=frontend`)
  - [ ] `useScheduleStore.ts` içinde `selectedOperationIds: string[]` yönetimi
  - [ ] `toggleSelectOperation(id, isMulti)` ve `clearSelection()` metodları
  - [ ] `bulkReschedule(operationIds, deltaMinutes)` ve `bulkLock(operationIds)` desteği
- [ ] Task 5: Gantt UI Çoklu Seçim ve Bulk Action Toolbar (`DEPT=frontend`)
  - [ ] `GanttOperationBlock.tsx` içinde `Ctrl+Click` / `Cmd+Click` yakalama
  - [ ] Seçili bloklar için görsel çerçeve (`ring-2 ring-primary`) efekti
  - [ ] Seçili operasyonlar için yüzen Toplu İşlem Çubuğu (Bulk Action Toolbar)

## Faz 3: Veritabanı & Üretim Dağıtım Standartları (DB & DevOps)
- [ ] Task 6: EF Core 8 Migration Altyapısı (`DEPT=db_dev`)
  - [ ] `Microsoft.EntityFrameworkCore.Design` paketini ekle
  - [ ] `ApsDbContextFactory` tanımla
  - [ ] `InitialCreate` migration'ını oluştur ve `DbInitializer`'a entegre et
- [ ] Task 7: Üretim Multi-Stage Dockerfile'ları (`DEPT=system`)
  - [ ] `backend/Dockerfile` (SDK build + aspnet-alpine runtime)
  - [ ] `frontend/Dockerfile` + `frontend/nginx.conf` (Vite build + Nginx alpine)
- [ ] Task 8: GitHub Actions CI Pipeline (`DEPT=system`)
  - [ ] `.github/workflows/ci.yml` (Backend testleri + Frontend lint/build)
