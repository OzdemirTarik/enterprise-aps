# 🏛️ ADR-002: Dağıtık Redis Kilit Mimarisi

- **Durum:** Kabul Edildi (Accepted)
- **Tarih:** 2026-08-20

---

## 📝 Bağlam (Context)
Birden fazla planlamacının aynı makine hattında aynı zaman diliminde çakışan operasyon taşıması yarış durumlarına (Race Condition) yol açar.

## 🎯 Karar (Decision)
Makine hattı veya operasyon taşınırken `RedLock` algoritması tabanlı Redis dağıtık kilit mekanizması uygulanacaktır.

## ⚖️ Sonuçlar
- **Artılar:** Çift kayıt ve hat çakışmalarının %100 engellenmesi.
- **Eksiler:** Redis bağımlılığı.
