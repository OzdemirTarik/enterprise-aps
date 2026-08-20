<RULE>
# Enterprise APS — Multi-Agent Geliştirme Yönergeleri & Kuralları

Bu proje **Enterprise APS (Advanced Planning and Scheduling)** elektronik üretim (PCBA / EMS) çizelgeleme sistemidir.
Sistem Docker üzerinde çalışır ve çok katmanlı, yüksek performanslı bir mimariye sahiptir.

## 🏗️ Mimari ve Teknolojik Katmanlar
1. **Frontend (Port 3000):** React 18, TypeScript, Tailwind CSS, Zustand, Lucide Icons, Vite.
   - Dosya dizini: `frontend/`
   - Container: `aps_frontend` (Vite dev server çalışır, kod değişikliklerinde otomatik HMR yenilenir).
   - WebSocket / SignalR: `http://backend:5000/hubs/scheduling`

2. **Backend (Port 5000):** .NET 8, ASP.NET Core Web API, MediatR (CQRS), SignalR, EF Core.
   - Dosya dizini: `backend/`
   - Projeler: `EnterpriseAps.Domain`, `EnterpriseAps.Application`, `EnterpriseAps.Infrastructure`, `EnterpriseAps.Api`
   - Container: `aps_backend` (`dotnet watch` ile çalışır, C# kod değişikliklerinde otomatik derlenir ve yeniden başlar).
   - Swagger / Test: `http://localhost:5000/swagger` & `http://localhost:5000/api/health`

3. **Veritabanı & Önbellek:**
   - PostgreSQL (TimescaleDB pg16) -> Port `5439` (Container: `aps_postgres`, Veritabanı: `aps_db`)
   - Redis 7 -> Port `6389` (Container: `aps_redis`, Dağıtık kilit ve SignalR backplane için)
   - Başlangıç SQL Şeması: `scripts/init.sql`

## 👥 Ajan Rolleri & Görev Dağılımı (DEPT)
- **`DEPT=orchestrator` (Yönetim):** Ana mimari kararları, iş bölümü, alt ajanların (`factory.py run`) tetiklenmesi, durum takibi ve paylaşılan sözleşmelerin (`factory.py share`) yönetimi.
- **`DEPT=frontend` (Frontend Geliştirici):** Gantt çizelgesi, KPI çubuğu, çekmece (drawer) panelleri, Zustand state yönetimi, SignalR istemcisi ve responsive UI bileşenleri.
- **`DEPT=backend` (Backend Geliştirici):** CQRS komut/sorguları, DAG algoritması optimizasyonları, makine değişim süreleri (setup matrix), REST API uç noktaları, SignalR hub metodları.
- **`DEPT=db_dev` (Veritabanı Mühendisi):** PostgreSQL/TimescaleDB şemaları, EF Core modelleri ve migration'lar, Redis anahtar yapılandırmaları.
- **`DEPT=system` (Sistem & Test):** Docker konteyner durumları (`docker compose ps`), entegrasyon testleri, sağlık kontrolleri ve performans ölçümleri.

## ⚙️ Çoklu Ajan Çalışma Kuralları
1. **Token Tasarrufu & Özet Çıktı:** Alt ajanlar (`factory.py run`) ile çalıştırıldığında lafı uzatmadan işi yapmalı, sadece yapılan değişiklikleri 1-2 teknik cümleyle özetleyip oturumu sonlandırmalıdır.
2. **Ortak Hafıza (Shared Contracts):** Backend ve Frontend arasında yeni bir DTO, API rotası veya WebSocket olayı eklendiğinde `factory.py share --key <alan> --value <tanım>` ile `.agents/state.json` ortak hafızasına kaydedilmelidir.
3. **Konteyner Yeniden Derleme:** Yeni bir npm paketi veya nuget paketi eklendiğinde ilgili servisi yeniden derleyin:
   `docker compose build <service> && docker compose up -d <service>`
4. **Git ve Kod Temizliği:** `node_modules/`, `bin/`, `obj/`, `dist/` gibi derleme çıktılarını asla git'e eklemeyin (`.gitignore` dosyasını koruyun).
5. **Obsidian Dokümantasyonu:** Mimari kararlar, API sözleşmeleri ve aktif görevler `knowledge/` altında tutulur.
</RULE>
