# 🏛️ ADR-001: In-Memory DAG Sıralama Motoru Seçimi

- **Durum:** Kabul Edildi (Accepted)
- **Tarih:** 2026-08-20
- **Karar Vericiler:** Antigravity Architect, Enterprise APS Team

---

## 📝 Bağlam (Context)
PCBA üretiminde 500+ operasyonun 15+ makine üzerinde bağımlılıkları bulunmaktadır. Kullanıcı Gantt üzerinde bir bloğu sürüklediğinde alt milisaniye (<5ms) içinde tüm ardıl operasyonların yeniden hesaplanması gerekmektedir. Veritabanında recursive SQL veya stored procedure kullanımı WebSocket üzerinden gerçek zamanlı deneyim için yetersiz kalmaktadır.

## 🎯 Karar (Decision)
Tüm çizelgeleme mantığı .NET 8 üzerinde `ScheduleGraph` sınıfı ile bellek içinde (in-memory) yönlü döngüsüz çizge (**DAG**) olarak tutulacaktır. Veritabanı (PostgreSQL) yalnızca periyodik durum kaydı ve başlangıç yüklemesi için kullanılacaktır.

## ⚖️ Sonuçlar (Consequences)
- **Artılar:** Alt milisaniye gecikme, akıcı Gantt deneyimi, deterministik hesaplama.
- **Eksiler:** Bellek yönetimi ve sunucu yeniden başladığında grafın DB'den tekrar ayağa kaldırılması (`Hydration`) gereksinimi.
