# 🎮 DaLines-Site

Official Profile Hub & Battle Station for **DaLines** — Streamer, Gamer, and FPS/Battle Royale Creator.

🌐 **Live URL:** [https://pages.dalines.workers.dev/](https://pages.dalines.workers.dev/)

---

## 🚀 Key Features

- ⚡ **Auto-Deploy with Cloudflare Workers CI/CD:** ทุกครั้งที่มีการ Commit หรือ Push โค้ดขึ้น Branch `main` บน GitHub ระบบจะ Deploy ขึ้น Cloudflare Workers ทันทีอัตโนมัติ
- 💰 **EZDN Donation Integration:** เชื่อมต่อระบบโดเนท [ezdn.app/dalines](https://ezdn.app/dalines) แจ้งเตือนขึ้นจอสด
- 🎯 **Valorant Crosshair One-Click Copy:** โค้ดเป้าเล็ง Valorant ของ DaLines พร้อมปุ่มคลิกคัดลอกลง Clipboard ทันที
- 🔴 **Real-Time Twitch Live Status:** ตรวจจับสถานะสตรีมจริง (Online / Offline) และเกมที่กำลังเล่นอัตโนมัติผ่าน Twitch API (DecAPI)
- 🎥 **YouTube Channel & Twitch Embed:** รวมช่องทางดูสตรีมสดและช่อง YouTube [youtube.com/@DaLinesTTV](https://www.youtube.com/@DaLinesTTV)
- 📱 **PWA (Progressive Web App):** รองรับ "Add to Home Screen" บนมือถือ iOS / Android เป็นไอคอนแอป DaLines ใช้งานแบบ Standalone
- 🎨 **Dynamic Themes:** สลับธีมสีได้ 3 รูปแบบ (Toxic Emerald, Cyber Cyan, Twitch Violet)
- 🔊 **Web Audio FX:** ระบบเสียงเอฟเฟกต์ (เปิด/ปิดได้) ทำงานด้วย Web Audio API
- 🌐 **Multi-Language (TH / EN):** รองรับ 2 ภาษา สลับได้ตลอดเวลา
- 🏎️ **Optimized Performance:** Preconnect, Zero Cumulative Layout Shift (CLS), และ SEO / Open Graph Image Preview ขนาดเต็ม

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
DaLines-Hub/
├── index.html         # โค้ดหน้าเว็บหลัก (HTML + Tailwind + JS)
├── Logo.png           # โลโก้และรูปโปรไฟล์ DaLines (300x300)
├── banner-480.png     # รูปแบนเนอร์หลักประจำช่อง (853x480)
├── manifest.json      # ไฟล์ Web App Manifest (PWA)
├── auto-deploy.bat    # ⚡ ดับเบิลคลิกเพื่อ Auto Deploy ทันทีใน 1 วินาที
├── auto-watch.bat     # 👁️ เปิดทิ้งไว้เพื่อ Auto Deploy อัตโนมัติทุกครั้งที่กด Save (Ctrl+S)
├── wrangler.jsonc     # ไฟล์คอนฟิก Cloudflare Workers Static Assets
├── .gitignore         # ไฟล์ละเว้นที่ไม่ต้อง push ขึ้น Git
└── README.md          # เอกสารแนะนำโปรเจกต์
```

---

## 🚀 วิธีการใช้งาน Auto Deploy

โปรเจกต์นี้มีระบบ Auto Deploy ให้เลือกใช้ 2 โหมด:

1. **⚡ โหมดรวดเร็วคลิกเดียว (Instant 1-Click Deploy):**
   - ดับเบิลคลิกที่ไฟล์ `auto-deploy.bat`
   - ระบบจะตรวจจับไฟล์ใหม่ -> บันทึก Commit อัตโนมัติ -> Push ขึ้น GitHub -> Cloudflare ทำการ Deploy สู่หน้าเว็บจริงทันที แล้วปิดหน้าต่างให้อัตโนมัติ

2. **👁️ โหมดตรวจจับการเปลี่ยนแปลงอัตโนมัติ (Realtime Watcher):**
   - ดับเบิลคลิกเปิดไฟล์ `auto-watch.bat` แล้วย่อหน้าต่างลง Taskbar
   - เมื่อคุณแก้ไขไฟล์อะไรก็ตามแล้วกดบันทึก (`Ctrl + S`) ระบบจะตรวจจับและ Auto Deploy ให้อัตโนมัติทันทีโดยที่คุณไม่ต้องกดอะไรอีกเลย!

---

## 🛠️ การตั้งค่า Cloudflare Workers Build

- **Build command:** `None`
- **Deploy command:** `npx wrangler deploy`
- **Root directory:** `/`
- **Production branch:** `main`

---

## 💻 วิธีการรันและทดสอบในเครื่อง (Local Development)

หากต้องการทดสอบในเครื่องด้วย Node.js และ Wrangler:

```bash
npx wrangler dev
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:8787` เพื่อดูตัวอย่างหน้าเว็บ

---

© 2026 DaLines. All Rights Reserved.
