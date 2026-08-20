# 🎨 React 18 Gantt & Zustand State Yönetimi

> **Kategori:** [[00-Index|Mimari]]  
> **İlgili Departman:** `DEPT=frontend`  
> **Kod Dosyaları:** `frontend/src/store/useScheduleStore.ts`, `frontend/src/components/gantt/`

---

## 🧩 State Mimarisi

```mermaid
graph TD
    Store[Zustand Store: useScheduleStore]
    WS[WebSocket Client / SignalR] -->|Delta Events| Store
    UserUI[Kullanıcı Etkileşimi: Drag/Zoom/Filter] -->|Action| Store
    Store --> GanttGrid[Gantt Matrix Grid]
    Store --> Inspector[EMS Inspector Drawer]
    Store --> KPIBar[KPI Header: Makespan, OEE]
```

---

## ⚡ Performans Prensipleri
1. **Virtual Rendering:** Yalnızca görünür zaman penceresi ve makineler render edilir.
2. **Magnetic Grid Snapping:** 15 dakikalık ızgaraya manyetik yapışma.
3. **Optimistic Updates:** UI anında güncellenir, backend doğrulaması başarısız olursa geri alınır.
