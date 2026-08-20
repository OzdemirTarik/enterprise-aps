# 👑 Enterprise APS — Geliştirici Kokpiti (Knowledge Base)

> **Proje:** Industrial Electronics & PCBA Manufacturing Scheduling System  
> **Teknoloji:** .NET 8 (CQRS, MediatR, SignalR, DAG), React 18 (TypeScript, Tailwind, Zustand, Gantt), PostgreSQL/TimescaleDB, Redis

---

## 🗺️ İçindekiler Haritası (Map of Content)

### 🏗️ 1. Sistem Mimarisi & Görsel Haritalar
- [[System-Overview.canvas| Genel Sistem Mimarisi (Canvas Diyagramı)]]
- [[DAG-Scheduler-Engine| In-Memory DAG Sıralama ve Bağımlılık Motoru]]
- [[RealTime-SignalR-Redis| Real-Time SignalR ve Dağıtık Redis Kilit Mimarisi]]
- [[Workstation-Gantt-State| React 18 Gantt & Zustand State Yönetimi]]

---

### 🏭 2. PCBA & EMS Domain Kütüphanesi (Glossary)
- [[SMT-Lines| SMT Hatları ve Makine Hücreleri (High-Speed & NPI)]]
- [[Solder-Alloys-Thermal| Lehim Alaşımları ve Termal Geçiş Cezaları (SAC305 ⇄ SnPb)]]
- [[Feeder-Cart-Reload| Besleyici (Feeder) Setup ve Değişim Matrisi]]
- [[Quality-Standards| Üretim Kalite ve Uyumluluk Standartları (IATF 16949 / ISO 13485)]]

---

### 🏛️ 3. Mimari Karar Kayıtları (ADR)
- [[ADR-001-in-memory-dag| ADR-001: Neden In-Memory DAG Scheduler Seçildi?]]
- [[ADR-002-redis-distributed-lock| ADR-002: Dağıtık İstasyon ve Hat Kilitleme Stratejisi]]
- [[ADR-003-cqrs-mediatr-pattern| ADR-003: Backend CQRS ve MediatR Deseni]]

---

### 📑 4. API & Olay Sözleşmeleri (Contracts)
- [[SignalR-Events| SignalR Hub Olayları ve WebSocket Payload Şemaları]]
- [[Rest-Endpoints| CQRS Komut & Sorgu REST Uç Noktaları]]

---

### 📋 5. Görevler & Departman Panoları (Tasks)
- [[Sprint-Board| 🎯 Aktif Sprint ve Görev Panosu (Kanban / Dataview)]]
- [[Agent-Handovers| 🤝 Departmanlar Arası İş Devir (Handover) Kayıtları]]
- [[Roadmap| 🚀 Faz 1, Faz 2 ve Faz 3 Yol Haritası]]

---

### 📐 6. Şablonlar (Templates)
- [[ADR-Template| Yeni Mimari Karar Şablonu]]
- [[Feature-Spec-Template| Yeni Özellik / Kural Spesifikasyon Şablonu]]
- [[Agent-Task-Template| Ajan Görev Tanım Şablonu]]

---

## 🤖 Antigravity AI Ajan İş Akışı Kısayolları

| Departman | Rol | İlgili Dizin / Doküman |
| :--- | :--- | :--- |
| `DEPT=orchestrator` | Proje Yöneticisi & Görev Dağıtıcı | [[Sprint-Board]], [[Agent-Handovers]] |
| `DEPT=backend` | .NET 8, CQRS, SignalR, DAG Motoru | [[DAG-Scheduler-Engine]], [[Rest-Endpoints]] |
| `DEPT=frontend` | React 18, Gantt, Zustand UI | [[Workstation-Gantt-State]], [[SignalR-Events]] |
| `DEPT=db_dev` | PostgreSQL, TimescaleDB, Redis | [[RealTime-SignalR-Redis]], [[ADR-002-redis-distributed-lock]] |
| `DEPT=system` | Docker, Testler, CI/CD | [[Roadmap]], [[Quality-Standards]] |
