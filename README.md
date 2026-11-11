# 🎮 DaLines-Site

Profile Hub & Battle Station ของ **DaLines** รวมช่องทางติดตาม สตรีมสด และเครื่องมือสำหรับคนเล่น FPS

🌐 เว็บไซต์: [dalines-site.dalines.workers.dev](https://dalines-site.dalines.workers.dev/)

## ฟีเจอร์หลัก

- Twitch Live Status, เครื่องเล่นสตรีมและแชท, คลังคลิปพร้อมตัวกรองเกม
- EZDN Donation, ช่องทาง YouTube/TikTok/Discord และปุ่มคัดลอกชื่อในเกม/เป้า Valorant
- เครื่องคำนวณ eDPI และแปลงความไวเมาส์ระหว่างเกม, วงล้อชาเลนจ์, Soundboard และการเชื่อมต่อ OBS ผ่าน PeerJS
- ภาษาไทย/อังกฤษ, ธีมสี 3 แบบ, เปิด/ปิดเสียง และไอคอนสำหรับเพิ่มเว็บบนหน้าจอหลัก
- ฉากหลังอนุภาคที่ปรับตามอุปกรณ์ รองรับการลดภาพเคลื่อนไหว และตารางสตรีมตามเวลาไทย (UTC+7)

## เริ่มพัฒนาในเครื่อง

ใช้ Node.js 20.9 ขึ้นไป แล้วรันจากโฟลเดอร์โปรเจกต์:

```sh
npm ci
npm run dev
```

เปิด [http://localhost:4173](http://localhost:4173) เพื่อดูเว็บ คำสั่ง `dev` สร้างไฟล์ก่อนเปิดเซิร์ฟเวอร์ เมื่อแก้ไฟล์ต้นฉบับให้รัน `npm run build` อีกครั้งแล้วรีเฟรชหน้า

ตรวจสอบและสร้างไฟล์สำหรับเผยแพร่:

```sh
npm run check
npm run preview
```

`npm run check` สร้างเว็บและทดสอบพฤติกรรมหลักพร้อมตรวจไฟล์สำหรับเผยแพร่ ส่วน `npm run build` สร้างไฟล์ใน `dist/` อย่างเดียว และ `npm run preview` เปิดดูผลลัพธ์ผ่านพอร์ต 4173 หากใช้ `npm test` โดยตรง ต้องสร้าง `dist/` ให้เรียบร้อยก่อน

## โครงสร้างโปรเจกต์

```text
index.html             โครงสร้างหน้าเว็บและเนื้อหา
assets/app.js          การทำงานหลัก แท็บ สตรีม เครื่องมือ และ OBS
assets/effects.js      ฉากหลัง ตารางสตรีม เสียง และวงล้อ
assets/custom.css      สไตล์เฉพาะ ธีม และการลดภาพเคลื่อนไหว
assets/tailwind.css    จุดเริ่มต้นสำหรับสร้าง Tailwind CSS
tailwind.config.cjs    รายการไฟล์ที่ใช้สแกนคลาส
scripts/build.mjs      สร้าง CSS/JS ย่อขนาด แปลงภาพ และเตรียม dist/
scripts/serve.mjs      เซิร์ฟเวอร์ดูเว็บในเครื่อง
tests/                 ชุดทดสอบพฤติกรรมหลัก
wrangler.jsonc         การสร้างและเผยแพร่บน Cloudflare Workers
dist/                  ผลลัพธ์ที่สร้างใหม่ ไม่ต้องแก้โดยตรง
```

ไฟล์ PNG ต้นฉบับ, QR Donation, Manifest, Robots และ Sitemap อยู่ที่โฟลเดอร์หลัก ไฟล์ต้นฉบับ สคริปต์ และชุดทดสอบจะไม่ถูกรวมในเว็บที่เผยแพร่

## การปรับประสิทธิภาพ

- สร้าง Tailwind CSS ล่วงหน้า แยกและย่อ CSS/JS พร้อมชื่อไฟล์ที่เปลี่ยนตามเนื้อหาเพื่อใช้แคช
- โหลดเครื่องเล่นและ PeerJS เมื่อใช้งาน หยุดงานเบื้องหลังที่ไม่จำเป็น และจำกัดฉากหลังไว้ที่ 30fps
- สร้างภาพ WebP สำหรับหน้าเว็บจาก PNG เดิม โดยยังเก็บต้นฉบับไว้

| ภาพ | PNG ต้นฉบับ | WebP ที่สร้าง | ลดขนาด |
| --- | ---: | ---: | ---: |
| แบนเนอร์ | 684,778 ไบต์ | 84,342 ไบต์ | 87.7% |
| รูปโปรไฟล์ | 111,294 ไบต์ | 17,962 ไบต์ | 83.9% |

ตัวเลขนี้วัดจากขนาดไฟล์ภาพที่สร้างจริง ไม่ใช่คะแนน Lighthouse หรือผลวัดความเร็วของเว็บไซต์จริง

## เผยแพร่ผ่าน Cloudflare Workers

`wrangler.jsonc` กำหนด `build.command` เป็น `npm run build` และ `assets.directory` เป็น `./dist` ดังนั้น Wrangler จะสร้างไฟล์ก่อนเผยแพร่:

```sh
npm ci
npm run check
npx wrangler deploy
```

สำหรับ Cloudflare Workers Builds ใช้ Root directory `/`, Production branch `main` และ Deploy command `npx wrangler deploy` โดยให้ Wrangler เรียกขั้นตอน Build จากไฟล์ตั้งค่า ไม่จำเป็นต้องสั่ง Build ซ้ำ

สคริปต์ `auto-deploy.bat` และ `auto-watch.bat` เดิมยังใช้ได้: สคริปต์จะ Commit/Push ขึ้น GitHub แล้วให้ Cloudflare สร้าง `dist/` และเผยแพร่ตามการเชื่อมต่อที่ตั้งไว้ การแก้ไฟล์ในเครื่องอย่างเดียวไม่ได้อัปเดตเว็บไซต์จริง

© 2026 DaLines. All Rights Reserved.
