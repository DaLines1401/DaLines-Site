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
- 🛸 **Cyberpunk Command Center:** แบ็กกราวด์อนุภาคโต้ตอบเมาส์ (Interactive Constellation Canvas 60fps), เรดาร์สแกนคลื่นสดพร้อมนาฬิกานับถอยหลังรอบไลฟ์, DaLines Cyber Soundboard แผงเสียงมีมพร้อมแถบคลื่นเสียง, และ Valorant Challenge Randomizer สุ่มโจทย์ท้าทายในสตรีม
- 🎯 **Valorant Crosshair & 10s Aim Challenge:** จำลองเป้าเล็ง Valorant พร้อมมินิเกมวัดความไวการยิง 10 วินาที
- 🎬 **DaLines Hall of Fame (Twitch Clips):** คลังคลิปไฮไลท์ยอดนิยมตลอดกาลจาก [twitch.tv/dalines/clips?range=all](https://www.twitch.tv/dalines/clips?range=all) แสดงปก Thumbnail คมชัด, ตัวกรองแยกตามเกม (VALORANT, Apex Legends, GTA V & อื่นๆ), ระบบเล่นคลิปผ่าน Twitch Embed Player ใน Modal, ปุ่มกด Like และปุ่มแชร์
- 🎮 **FPS E-DPI Calculator & Sensitivity Converter:** เครื่องคำนวณ E-DPI และแปลงค่าความไวเมาส์ข้ามเกม 8 เกมดัง (Valorant, Apex Legends, Fortnite, Delta Force, CS2, Overwatch 2, CoD/Warzone, PUBG) แม่นยำ 100% ตามระยะทางจริง (cm/360°) พร้อมแถบวิเคราะห์สไตล์การเล็ง (Arm/Wrist Aim), แนะนำขนาดแผ่นรองเมาส์, ปุ่มลัดโหลดค่าโปรเพลเยอร์ DaLines (800 DPI), และปุ่มคัดลอกค่าแต่ละเกมในคลิกเดียว
- 🏆 **Valorant Esports Career & Live Match Tracker:** ศูนย์รวมสถิติแรงก์สด Valorant ประจำช่อง DaLines#TTV (เซิร์ฟเวอร์ APAC) ซิงค์ตรงจากเกมและ Cloudflare Worker API แสดงตราสัญลักษณ์แรงก์ Diamond 1, หลอดคะแนน RR Progress Bar, สถิติ Career & Last 20 Matches (K/D 1.08, 148 ADR, Winrate 55% 11W-9L), Peak Rank: Immortal 1 34RR (Ep 7: Act III), 3 เอเจนท์ตัวเมนตามชั่วโมงเล่นจริง (Sova 769 hrs, Jett 399 hrs, Killjoy 308 hrs), ไทม์ไลน์ผลการแข่งล่าสุดพร้อม K/D และแต้ม RR, ปุ่มคัดลอก Riot ID, ปุ่มซิงค์สด, **ระบบค้นหาแรงก์ผู้เล่นสด (Live Player Lookup)** ค้นหา Riot ID ของผู้ชมหรือเพื่อนในตี้ได้ทุกเซิร์ฟเวอร์ (AP, NA, EU, KR, LATAM, BR) พร้อมระบบเปรียบเทียบแรงก์กับ DaLines และเปลี่ยนสกินตราสัญลักษณ์ตามแรงก์ที่ค้นพบ (Iron ถึง Radiant) อัตโนมัติ!
- 🌌 **DaLines Scrollytelling Battlestation & Story (`/story`):** หน้าเว็บย่อย 3D WebGL (Three.js + GSAP ScrollTrigger) ถ่ายทอดการเดินทาง, เจาะลึกมุมโต๊ะคอม Battlestation (Ryzen 5 5600, RTX 5060 Ti, ATK Ghost Mouse 800 DPI, Loga Pad), สถิติเกม FPS (Valorant, Apex, PoE2), และระบบเสียงสังเคราะห์ Cyber Web Audio FX พร้อม Chapter Navigator
- 🎬 **DaLines Brutalist Motion Showcase V2 (`/showcase-v2`):** วิดีโอ Motion Graphics 15 วินาที (1920x1080 @ 60 FPS, 900 เฟรม) สไตล์ Swiss / Minimal Tech พร้อมดนตรีอิเล็กทรอนิกส์สังเคราะห์ขึ้นจากโค้ดล้วน 100% (Node.js Math Sound Synth) เรนเดอร์เป็นไฟล์ `dalines_showcase_15s.mp4` ด้วย FFmpeg
- 🏎️ **Optimized Performance:** Preconnect, Zero Cumulative Layout Shift (CLS), และ SEO / Open Graph Image Preview ขนาดเต็ม

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
DaLines-Hub/
├── index.html         # โค้ดหน้าเว็บหลัก (HTML + Tailwind + JS)
├── party.html         # DaLines Cozy Party Lounge (มินิเกม Chibi Gacha & Wheel of Fate)
├── story/             # 🌌 หน้าเว็บย่อย 3D Scrollytelling Battlestation & Story
│   └── index.html     # โค้ด Three.js + GSAP ScrollTrigger + Web Audio FX
├── showcase/          # Brutalist WebGL 12s Motion Graphic Video Showcase (Version 1)
├── showcase-v2/       # 🎬 Brutalist Motion Graphics 15s + Pure Code Audio Synth (Version 2)
│   ├── index.html     # หน้าเว็บพรีวิว 15s Interactive Player
│   ├── synth_audio.js # สคริปต์สังเคราะห์ดนตรี Stereo WAV 15 วินาที
│   ├── render.js      # เรนเดอร์ 900 เฟรมด้วย Puppeteer + รวมวิดีโอด้วย FFmpeg
│   ├── export-video.bat # ดับเบิลคลิกเพื่อเรนเดอร์วิดีโอ 15s MP4 บน Windows
│   └── dalines_showcase_15s.mp4 # ไฟล์วิดีโอผลลัพธ์คุณภาพสูง
├── Logo.png           # โลโก้และรูปโปรไฟล์ DaLines (300x300)
├── banner-480.png     # รูปแบนเนอร์หลักประจำช่อง (853x480)
├── manifest.json      # ไฟล์ Web App Manifest (PWA)
├── sitemap.xml        # ไฟล์แผนผังเว็บไซต์ (Sitemap SEO)
├── auto-deploy.bat    # ⚡ ดับเบิลคลิกเพื่อ Auto Deploy ทันทีใน 1 วินาที
├── auto-watch.bat     # 👁️ เปิดทิ้งไว้เพื่อ Auto Deploy อัตโนมัติทุกครั้งที่กด Save (Ctrl+S)
├── val-sync.bat       # 🎮 ดับเบิลคลิกเพื่อซิงค์แรงก์ & สถิติ Valorant สดจากเครื่องขึ้นเว็บทันที
├── worker.js          # ⚡ Cloudflare Worker API (/api/valorant & Static Assets)
├── tools/             # 🛠️ สคริปต์เครื่องมือเสริม (val-sync.ps1 Direct Daemon)
├── wrangler.jsonc     # ไฟล์คอนฟิก Cloudflare Workers
├── .gitignore         # ไฟล์ละเว้นที่ไม่ต้อง push ขึ้น Git
└── README.md          # เอกสารแนะนำโปรเจกต์
```

---

## 🎮 วิธีการใช้งาน Valorant Direct Live Sync (สำหรับสตรีมเมอร์)

ระบบ Valorant Career & Match Tracker มี API ภายในเชื่อมต่อตรงระหว่างคอมพิวเตอร์ของสตรีมเมอร์กับ Cloudflare Worker โดยไม่ต้องพึ่งพาบริการภายนอก:

1. **⚡ ซิงค์แบบ 1 คลิก (One-Click Sync):**
   - ดับเบิลคลิกที่ไฟล์ `val-sync.bat` บนเครื่องคอมพิวเตอร์
   - เลือกเมนู **[1]** เพื่อส่งค่าสถิติล่าสุด (Diamond 1, 50 RR, 1.08 KD, 148 ADR) ขึ้นเว็บทันที
2. **⚙️ กรอกแก้ไขตัวเลขสด (Manual Quick Edit):**
   - เลือกเมนู **[2]** ในหน้าต่างเพื่อพิมพ์แรงก์, คะแนน RR, หรือ K/D ใหม่ แล้วระบบจะอัปเดตหน้าเว็บทันทีแบบเรียลไทม์
3. **👁️ โหมดตรวจจับขณะสตรีม (Auto-Watch Mode):**
   - เลือกเมนู **[3]** เพื่อให้สคริปต์ตรวจจับโปรเซสตัวเกม Valorant บนเครื่องขณะกำลังสตรีม

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
