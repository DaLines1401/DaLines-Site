# 🎮 DaLines-Site

Official Profile Hub & Battle Station for **DaLines** — Streamer, Gamer, and FPS/Battle Royale Creator.

🌐 **Live URL:** [https://pages.dalines.workers.dev/](https://pages.dalines.workers.dev/)

---

## 🚀 Features

- ⚡ **Auto-Deploy with Cloudflare Workers CI/CD:** ทุกครั้งที่มีการ Commit หรือ Push โค้ดขึ้น Branch `main` ระบบจะทำการ Deploy ขึ้น Cloudflare Workers ทันทีอัตโนมัติ
- 🎯 **Twitch Live Embed:** รองรับการดูไลฟ์สดและแชทแบบ Real-time พร้อมแก้ปัญหา Domain Parent Blocking
- 🎨 **Dynamic Themes:** สลับธีมสีได้ 3 รูปแบบ (Toxic Emerald, Cyber Cyan, Twitch Violet)
- 🔊 **Web Audio FX:** ระบบเสียงเอฟเฟกต์ (เปิด/ปิดได้) ทำงานด้วย Web Audio API
- 🌐 **Multi-Language (TH / EN):** รองรับภาษาไทยและภาษาอังกฤษ
- 📱 **Fully Responsive:** ออกแบบสำหรับสมาร์ตโฟน แท็บเล็ต และคอมพิวเตอร์อย่างลื่นไหล
- 🏎️ **Optimized Performance:** รองรับ Preconnect, Zero Layout Shift (CLS), และ SEO / Open Graph Image Preview

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
DaLines-Hub/
├── index.html         # โค้ดหน้าเว็บหลัก (HTML + Tailwind + JS)
├── Logo.png           # โลโก้และรูปโปรไฟล์ DaLines
├── banner-480.png     # รูปแบนเนอร์หลักประจำช่อง
├── wrangler.jsonc     # ไฟล์คอนฟิก Cloudflare Workers Static Assets
├── .gitignore         # ไฟล์ละเว้นที่ไม่ต้อง push ขึ้น Git
└── README.md          # เอกสารแนะนำโปรเจกต์
```

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
# ติดตั้ง dependencies / ทดสอบรัน
npx wrangler dev
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:8787` เพื่อดูตัวอย่างหน้าเว็บ

---

© 2026 DaLines. All Rights Reserved.
