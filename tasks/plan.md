# Implementation Plan: Enterprise APS Öncelikli İyileştirme & Risk Yönetimi Paketi

## Overview
Bu planlama belgesi, Enterprise APS sisteminin üretim aşamasına (Production-Ready) geçişi için tespit edilen kritik riskleri ve öncelikli geliştirme maddelerini 5 departman (`orchestrator`, `backend`, `frontend`, `db_dev`, `system`) arasında modüler ve doğrulanabilir görev paketlerine bölmektedir.

---

## 🏗️ Architecture & Technical Decisions

- **Test Katmanı:** .NET 8 için xUnit, FluentAssertions ve Moq kütüphaneleri kullanılacak. Çekirdek In-Memory DAG motoru (`ScheduleGraph`) için uçtan uca deterministik zaman senaryoları kurgulanacak.
- **Döngü Tespiti (Cycle Detection):** DFS / Graph Traversal algoritması ile operasyon bağımlılıkları güncellenirken $O(V+E)$ karmaşıklığında anlık döngü kontrolü yapılacak, döngü tespit edilirse `ValidationException` (HTTP 400) üretilecek.
- **Frontend Çoklu Seçim:** Zustand store üzerinde `selectedOperationIds: string[]` durumu tutulacak; `Ctrl+Click` / `Cmd+Click` kombinasyonları ve toplu eylem çubuğu (Bulk Action Toolbar) ile yönetilecek.
- **Migration Stratejisi:** EF Core 8 `dotnet ef migrations` yapısına geçilecek; `ApsDbContextFactory` tanımlanarak `scripts/init.sql` ile tam senkron PostgreSQL 16 / TimescaleDB migration'ı repo altına alınacak.
- **Prodüksiyon Konteynerizasyonu:** Backend için `aspnet:8.0-alpine`, Frontend için `nginx:alpine` multi-stage build yapılandırılacak; GitHub Actions CI ile PR'larda otomatik test koşulacak.

---

## 📋 Task List & Department Breakdown

### Faz 1: Temel Güvenilirlik & Test Altyapısı (Backend & System)
- [ ] **Task 1 (DEPT=backend & system):** `EnterpriseAps.Tests` xUnit Test Projesinin Oluşturulması ve Çözüme Eklenmesi
- [ ] **Task 2 (DEPT=backend):** `ScheduleGraph` Çekirdek Motoru için Kapsamlı Birim Testlerin Yazılması (Precedence, Ripple, Setup, Vardiya & Duruş)
- [ ] **Task 3 (DEPT=backend):** Operasyon Bağımlılıklarında Döngüsel Bağımlılık (Cycle Detection) Algoritmasının Eklenmesi ve Test Edilmesi

### Checkpoint 1: Backend Doğrulama
- `dotnet test` tüm testleri sıfır hatayla geçer.
- `ScheduleGraph` köşe senaryoları ve döngü tespiti doğrulanır.

---

### Faz 2: Kullanıcı Deneyimi & Çoklu Operasyon Yönetimi (Frontend)
- [ ] **Task 4 (DEPT=frontend):** Zustand Store'da Çoklu Seçim (`selectedOperationIds`) ve Toplu Eylemler Durumunun Eklenmesi
- [ ] **Task 5 (DEPT=frontend):** Gantt Bileşenlerinde `Ctrl+Click` Çoklu Seçim Görselleştirmesi ve Toplu İşlem Menüsünün (Bulk Action Toolbar) Entegrasyonu

### Checkpoint 2: Frontend Doğrulama
- `npm run test` ve `npm run build` hatasız tamamlanır.
- Kullanıcı birden fazla operasyon seçip toplu öteleme ve kilit uygulayabilir.

---

### Faz 3: Veri Kalıcılığı & Üretim Dağıtım Standartları (DB & DevOps)
- [ ] **Task 6 (DEPT=db_dev):** EF Core 8 Migration Altyapısının Kurulması (`InitialCreate`) ve `MigrateAsync` Entegrasyonu
- [ ] **Task 7 (DEPT=system):** Multi-Stage Üretim `Dockerfile` (Backend & Frontend) ve Nginx Yapılandırmasının Hazırlanması
- [ ] **Task 8 (DEPT=system):** GitHub Actions CI/CD İş Akışının (`.github/workflows/ci.yml`) Oluşturulması

### Checkpoint 3: Tamamlanma & Entegrasyon
- Docker container'ları sağlıklı çalışır.
- CI workflow adımları yerel olarak doğrulanır.

---

## ⚠️ Risks and Mitigations

| Risk | Etki | Önlem / Çözüm Stratejisi |
| :--- | :---: | :--- |
| **Döngü tespitinde büyük graf performansı** | Düşük | Sadece değişen düğümün ardıl alt grafı (transitive closure) üzerinde DFS çalıştırılarak $O(V)$ sürede bitirilir. |
| **Çoklu operasyon kaydırmada kilit karmaşası** | Orta | Toplu işlem öncesinde seçili tüm hatlar için Redis kilitleri tek atomik işlemde doğrulanır. |
| **TimescaleDB ile EF Core Migration çakışması** | Düşük | Hypertables veya PG eklentileri `migrationBuilder.Sql` ile idempotent script olarak entegre edilir. |
