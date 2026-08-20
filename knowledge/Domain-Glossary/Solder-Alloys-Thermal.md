# 🌡️ Lehim Alaşımları ve Termal Geçiş Cezaları

> **Kategori:** [[00-Index|Domain Kütüphanesi]]  
> **İlgili Motor:** [[DAG-Scheduler-Engine]]

---

## 🧪 Alaşım Türleri

1. **SAC305 (Kurşunsuz / Lead-Free):**
   - Bileşim: %96.5 Sn, %3.0 Ag, %0.5 Cu
   - Erime Sıcaklığı: ~217°C
   - Tepe Reflow Sıcaklığı: 240°C - 250°C
   - Standart: RoHS & WEEE uyumlu tüketici ve endüstriyel kartlar.

2. **Sn63Pb37 / Sn62Pb36Ag2 (Kurşunlu / Leaded):**
   - Erime Sıcaklığı: ~183°C (Ötektik)
   - Tepe Reflow Sıcaklığı: 215°C - 225°C
   - Standart: Havacılık, savunma ve kritik medikal kartlar (muafiyet kapsamı).

---

## ⏱️ Termal Profil Değişim Cezaları (Setup Matrix)

| Önceki Alaşım | Sonraki Alaşım | Fırın Sıcaklık Ayar Süresi | Fırın Temizliği / N2 Ayarı | Toplam Gecikme |
| :--- | :--- | :--- | :--- | :--- |
| SAC305 | SAC305 | 0 dk | 0 dk | **0 dk** |
| SAC305 | Sn63Pb37 | 25 dk (Soğuma) | 20 dk | **45 dk** |
| Sn63Pb37 | SAC305 | 20 dk (Isınma) | 15 dk | **35 dk** |
