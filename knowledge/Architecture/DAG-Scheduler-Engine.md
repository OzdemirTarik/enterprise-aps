# ⚙️ In-Memory DAG Scheduler Motoru

> **Kategori:** [[00-Index|Mimari]]  
> **İlgili Departman:** `DEPT=backend`  
> **Kod Dosyaları:** `backend/src/EnterpriseAps.Domain/Services/ScheduleGraph.cs`

---

## 🎯 Amaç ve Yetenekler

Enterprise APS'in kalbinde, tüm üretim operasyonları arasındaki öncül/ardıl ilişkilerini yönlü döngüsüz çizge (**DAG - Directed Acyclic Graph**) olarak modelleyen yüksek performanslı bir in-memory motor bulunur.

```mermaid
graph LR
    TopSMT[Top SMT Reflow] -->|Min 15m Soğuma| BotSMT[Bottom SMT Reflow]
    BotSMT -->|Precedence| THT[THT Wave Soldering]
    THT -->|Precedence| ICT[ICT Test & Boundary Scan]
    ICT -->|Precedence| FCT[FCT Functional Test]
    FCT -->|Precedence| Coat[Conformal Coating UV]
```

---

## 🔑 Temel Algoritmik Kurallar

### 1. Ripple Effect (Zincirleme Dalgalanma)
Bir operasyon zaman çizelgesinde sürüklendiğinde veya uzadığında:
- Tüm doğrudan ve dolaylı ardılları (**Successors**) otomatik olarak ileri ötelenir.
- Öncüllerin (**Predecessors**) bitiş zamanı ihlal edilemez (`EarlyStart = max(Predecessors.EndTime + MinLeadTime)`).

### 2. Sequence-Dependent Setup Matrix
Aynı hatta arka arkaya gelen iki operasyon arasında:
- [[Solder-Alloys-Thermal|Lehim alaşımı değişimi]]: SAC305'ten SnPb'ye geçerken fırın sıcaklık stabilizasyonu (45 dk).
- [[Feeder-Cart-Reload|Feeder Değişimi]]: Yeni PCB modeli için besleyici araba değişimi ve barkod okuma (30 dk).

### 3. Cycle Detection (Döngü Tespiti)
- Grafiğe döngüsel bağımlılık eklenmesi durumunda (A -> B -> C -> A) DFS tabanlı döngü tespit algoritması anında `CycleDependencyException` fırlatır.
