# 🎯 Aktif Sprint ve Görev Panosu (Kanban / Dataview)

> **Proje:** Enterprise APS  
> **Görünüm:** Obsidian Kanban / Dataview Destekli

---

## 📋 Backlog (Bekleyenler)

- [ ] Task 8: GitHub Actions CI Pipeline (`DEPT=system`)
  - [ ] `.github/workflows/ci.yml` oluştur
  - [ ] Backend xUnit testleri + Frontend lint/build adımları

---

## ⚙️ In Progress (Devam Edenler)

- [ ] Task 1: `EnterpriseAps.Tests` xUnit Test Projesi Oluşturma (`DEPT=system` & `DEPT=backend`)
  - [ ] `dotnet new xunit -n EnterpriseAps.Tests` oluştur ve `.sln` bağla
  - [ ] FluentAssertions, Moq, Microsoft.NET.Test.Sdk ekle
- [ ] Task 4: Zustand Store Çoklu Seçim & Toplu Eylemler (`DEPT=frontend`)
  - [ ] `useScheduleStore.ts` içinde `selectedOperationIds` desteği
  - [ ] `bulkReschedule` ve `bulkLock` metodları

---

## 🧪 In Review & Testing (Test / Doğrulama)

- [ ] Task 2: `ScheduleGraph` Çekirdek Birim Testleri (`DEPT=backend`)
  - [ ] Precedence dalgalanma testleri
  - [ ] SMT Setup matrisi süre hesaplama testleri
- [ ] Task 3: Döngüsel Bağımlılık (Cycle Detection) DFS Algoritması (`DEPT=backend`)

---

## ✅ Done (Tamamlananlar)

- [x] Task 0: Obsidian Knowledge Base & Workflow Entegrasyonu (`DEPT=orchestrator`)
- [x] Temel In-Memory DAG Scheduler prototipi (`DEPT=backend`)
- [x] React 18 Gantt Workstation temel UI (`DEPT=frontend`)
