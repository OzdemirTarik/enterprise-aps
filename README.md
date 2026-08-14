# ⚡ Enterprise APS — Industrial Electronics & PCBA Manufacturing Scheduling System

A high-throughput, sub-millisecond, real-time **Advanced Planning and Scheduling (APS)** and **Manufacturing Execution System (MES)** workstation purpose-built for **Electronics Manufacturing Services (EMS / PCBA)**.

Built on an in-memory Directed Acyclic Graph (DAG) scheduling engine with sequence-dependent setup matrix optimizations, multi-user real-time collaboration via SignalR & Redis, and PostgreSQL database persistence.

---

## 🌟 Key Capabilities & Features

### 1. In-Memory DAG Scheduling Engine
- **Sub-Millisecond Graph Recalculation:** Instant recalculation and ripple cascading of operation dependencies along complex precedence networks.
- **Sequence-Dependent Setup Matrix:** Automatic calculation of machine changeover penalties:
  - Feeder Cart Reloads & Setup Verification (45m)
  - Solder Alloy Thermal Re-profiling (`SAC305` Lead-Free ⇄ `SnPb` Leaded)
  - Fine-Pitch Stencil Swap & Cleaning Delays
- **Downtime Collision Evasion:** Maintenance windows (e.g. SMT Squeegee Wipe, Wave Solder Dross Skimming) automatically push overlapping tasks downstream without breaking precedence constraints.

### 2. Multi-Line EMS & PCBA Work Centers
- **SMT Lines:**
  - `SMT-LINE-01`: High-Speed SMT (DEK Stencil Printer + Koh Young 3D SPI + Yamaha YSM20R Pick & Place + Heller 10-Zone Reflow + 3D AOI)
  - `SMT-LINE-02`: Flexible NPI SMT (MPM Stencil Printer + ASM SIPLACE SX + Reflow + AOI)
- **THT & Soldering:**
  - `THT-WAVE-01`: Lead-Free Dual Wave Solder Conveyor (Ersa PowerWave)
  - `THT-SELECTIVE-01`: High-Precision Selective Soldering Cell (Pillarhouse Multi-Nozzle)
- **Test & Inspection:**
  - `ICT-STATION-01`: In-Circuit Testing & Boundary Scan (Keysight 3070 / SPEA Flying Probe)
  - `FCT-BENCH-01`: Automated Functional Test & Firmware Flashing Benches
- **Coating & Depaneling:**
  - `COAT-UV-01`: Conformal Moisture Coating Dispenser & In-Line UV Curing (Nordson Asymtek)
  - `DEPANEL-ROUTER-01`: High-Speed Dual-Table CNC PCB Depaneling Router

### 3. Interactive Zero-Latency Gantt Workstation
- **Drag-to-Move & Edge Resizing:** Magnetic 15-minute grid snapping with real-time dependency line updates.
- **Right-Click Context Menu:** Split operations into sub-lots, lock/pin operations, or edit parameters.
- **Quick Routing Templates:** Pre-configured workflows for *Dual-Sided SMT + THT + FCT*, *Single SMT + Wave*, *NPI Prototype*, and *Medical Class III (ISO 13485)*.
- **Category Filter Tabs & Real-time Search:** Filter work centers by SMT, THT, Test, or Coating; live search by operation or Work Order ID.

### 4. Real-Time Collaboration & Concurrency
- **SignalR Hub:** WebSocket broadcasts of live scheduling deltas, resource locks, and operator presence.
- **Distributed Locking:** Redis-backed machine track locking prevents conflicting concurrent edits.

---

## 🏗️ Architecture & Technology Stack

```
+---------------------------------------------------------------------------------------------------------+
|                                    EMS / PCBA WORKSTATION (React + TS)                                  |
|   +-------------------------------------------------------------------------------------------------+   |
|   |  KPI Bar: Makespan | SMT Line OEE | Feeder Setup Ratio | OTD Compliance (IATF 16949 / ISO 13485) |   |
|   +-------------------------------------------------------------------------------------------------+   |
|   |  Toolbar: [+ New PCBA Work Order] [🏭 Line Manager] [⚠️ SMT Auto-Wipe] [🔍 SMT/THT/Test Filters] |   |
|   +-------------------------------------------------------------------------------------------------+   |
|   |  Interactive Gantt Matrix:                                                                      |   |
|   |  - SMT-LINE-01 (High-Speed Dual Lane) | SMT-LINE-02 (Flexible NPI) | THT-WAVE-01 | THT-SELECTIVE-01  |   |
|   |  - ICT-STATION-01 | FCT-BENCH-01 | COAT-UV-01 | DEPANEL-ROUTER-01                               |   |
|   |  - Stage Colors: Top-SMT (Cyan), Bottom-SMT (Blue), THT (Amber), AOI (Purple), Test (Green)    |   |
|   +-------------------------------------------------------------------------------------------------+   |
|   |  EMS Inspector Drawer: PCB Model, Feeder Cart ID, Solder Alloy (SAC305/SnPb), DAG Precedence    |   |
+--------------------------------------------------^------------------------------------------------------+
                                                   | SignalR WebSocket / REST API (Port 5000)
+--------------------------------------------------v------------------------------------------------------+
|                                         .NET 8 BACKEND API                                              |
|   +-------------------------------------------------------------------------------------------------+   |
|   |  In-Memory DAG Scheduler: Sub-millisecond Feeder Setup & Solder Alloy Changeover Calculations   |   |
|   |  - SAC305 <-> SnPb Alloy Profiling | Stencil Clean Delays | SMT Squeegee Auto-Wipe Maintenance |   |
|   +-------------------------------------------------------------------------------------------------+   |
|   |  PostgreSQL Database: Master Data Seeding with 5 Multi-Layer Dual-Sided PCBA Production Batches |   |
+---------------------------------------------------------------------------------------------------------+
```

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Zustand, Lucide Icons, Vite |
| **Backend** | .NET 8 (C#), ASP.NET Core Web API, MediatR (CQRS), SignalR |
| **Persistence** | PostgreSQL (TimescaleDB), Entity Framework Core (Code-First) |
| **Distributed Cache / Locks** | Redis 7 |
| **Containerization** | Docker, Docker Compose |

---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/)

### Running the Application

1. **Clone the repository:**
   ```bash
   git clone https://github.com/OzdemirTarik/enterprise-aps.git
   cd enterprise-aps
   ```

2. **Launch the Docker containers:**
   ```bash
   docker compose up -d --build
   ```

3. **Open the applications:**
   - **Gantt Workstation UI:** [http://localhost:3000](http://localhost:3000)
   - **Backend API & Swagger:** [http://localhost:5000/swagger](http://localhost:5000/swagger)

---

## 📜 License
MIT License
