# HisoBox Brend Tizimi — Qo'llanma

**Sana:** 2026-10-12 · **Holat:** qabul qilindi
Brend nomi manbai — `backend/src/hiso_box/domain/brand.json` (bu yerda faqat qo'llanma va asset'lar).

## 1. Tizim xaritasi — har bir izhoda o'z joyi

| # | Asset | Rol | Qayerda ishlatiladi | Qayerda ISHLATILMAYDI |
|---|---|---|---|---|
| 1 | **H monogram (tekis)** | Asosiy belgi (system mark) | PWA ikonalar (192/512/maskable), favicon, `/panel`, `/app`, `/admin`, yuklama ekrani | matn ichida emoji o'rnida |
| 2 | **H monogram (chuqurlik)** | Boyitilgan ikon | Telegram bot avatari, do'kon (app store) varianti, OG/share kartochkalari, favicon uchun alternativ | juda kichik o'lcham (<32px) — chuqurlik yo'qoladi |
| 3 | **Lockup asosiy (H + HisoBox)** | To'liq brend yozuvi | Veb sayt header'i, marketing, email imzosi, hujjatlar | mobil ilova ichida (faqat belgi) |
| 4 | **Lockup do'stona ("o"lar quti)** | Yumshoq variant | Ijtimoiy tarmoqlar postlari, Telegram kanal banneri, taqvim/matbuot | rasmiy hujjatlar, shartnomalar |
| 5 | **Daftar illustratsiyasi** | Konsepsiya rasmi | Landing bo'limlari, "qanday ishlaydi", bo'sh holatlar (empty states) | ikon o'rnida |
| 6 | **Maskot (kalkulyatorli quti)** | Personaj | Onboarding, maslahatlar (tips), xatolarni yumshatish, stikerlar | to'lov/shadlitiv (finans) oynalarida — jiddiylikni pasaytiradi |

## 2. Qoidalar

1. **Belgi hech qachon ikonka + yozuv birga kichik joyda** — 32px dan kichik joyda faqat belgi.
2. **Chuqurlik varianti faqat PNG** – vektor kerak bo'lsa, tekis variant ishlatiladi.
3. **Maskot va illustratsiya — hikoya vositalari**: marketing va onboarding'da; hisob-kitob ekranlarida emas.
4. Belgi doim bir xil nisbatda (1:1); landshaft emas, cho'zilmaydi.
5. Minimal atrofdagi bo'shliq: belgi diametrining 25% i.
6. Rang: faqat palitradan (`--hb-accent: #4b3fd6`, `--hb-on-accent: #ffffff`, ink `#14162e`). Kuchli fon ustida oq belgi, oppoq fon ustida indigo belgi.
7. Brend nomi yozilishi: `HisoBox` (CamelCase). Kichik harf (`hisobox`) faqat handle, domen va kodda.

## 3. Ishlash tizimi (avtomatik)

- **SVG belgi (vektor) saytda:** header va footer `BrandMark` komponenti orqali geometriyadan chiziladi — PNG kerak emas, o'tkir ekranlarda mukammal.
- **OG/share kartochkasi:** `frontend/public/panel/icons/og-share.png` (1200×630, C1 asosida) — `seo.ts` uni `og:image` qilib beradi; Telegram/WhatsApp'da havola shu rasm bilan ochiladi.
- **Landing sahifa:** B1 illustratsiyasi "daftar" bo'limida, D2 maskot "qanday ishlaydi" bo'limida (`src/assets/brand/`, Vite bundle, matnlar i18n katalogdan).

- `brand.json` dagi `mark` geometriyasi — belgining **manbasi**. Frontend `brand.ts` uni o'qiydi.
- `frontend/scripts/pwaIcons.ts` — geometriyadan PWA ikonalar, favicon va manifestni **generatsiya qiladi** (commit qilinadi).
- Geometriya o'zgarsa: `node scripts/pwaIcons.ts --check` (test `pwaFiles.test.tsx` buziladi).
- RGBA/tuzilma: 96×96 canvas, corner 22; uch blok: ikkita vertikal (yumaloq), bir markaziy.

## 4. Fayllar

```
docs/brand/BRAND-KIT.md           (bu qo'llanma)
docs/brand/assets/mark-icon-flat.png       tekis belgi (1024)
docs/brand/assets/mark-icon-depth.png      chuqurlik belgi (1024)
docs/brand/assets/lockup-primary.png       asosiy lockup (H + HisoBox)
docs/brand/assets/lockup-friendly.png      do'stona lockup
docs/brand/assets/illustration-ledger.png  daftar konsepsiyasi
docs/brand/assets/mascot-calculator.png    maskot
```

Originallar: `D:/Linux/qarz-brand-naming/logo-concepts/` (5 yo'nalish, 10 variant).

## 5 Kelasi qadamlar (tavsiya)

- [ ] Telegram avatari: `mark-icon-depth.png` (1024×1024) — BotFather'da o'rnatiladi (API ruxsat bermaydi)
- [ ] OG/share rasmi: C1 lockup asosida 1200×630 — keyingi ish
- [ ] Vektor (SVG) lockup —PNG o'rniga sayt uchun; hand-made path kerak
- [ ] Landing sahifada B1/D2 ishtiroki — marketing ishi
