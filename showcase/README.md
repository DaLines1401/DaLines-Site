# DaLines Showcase // Brutalist WebGL Motion Graphic

โปรเจกต์ Video Showcase ความยาว 12 วินาที (Resolution: **1920x1080**, **60 FPS**, รวมทั้งหมด **720 เฟรม**) สไตล์ **Brutalist WebGL Motion Graphic** ขับเคลื่อนด้วย **Three.js** และ **GSAP Timeline** ตามธีมและข้อมูลจริงของ [DaLines Official Portfolio](https://dalines-site.dalines.workers.dev/)

---

## 📁 โครงสร้างโปรเจกต์

```text
showcase/
├── index.html          # ไฟล์หลัก HTML + Three.js + GSAP + CSS Cyberpunk HUD ในไฟล์เดียว
├── render.js           # สคริปต์ Puppeteer สำหรับบันทึกภาพทีละเฟรมแบบ Deterministic
├── package.json        # กำหนด Dependencies (Puppeteer) และ scripts
├── export-video.bat    # สคริปต์ Batch รันคำสั่งอัตโนมัติ 1-Click บน Windows
├── README.md           # คู่มือการใช้งานและคำสั่ง FFmpeg
└── frames/             # โฟลเดอร์เก็บรูปภาพเฟรมที่ถูกเรนเดอร์ (frame_0001.png - frame_0720.png)
```

---

## 🎬 โครงสร้าง 4 ฉากหลัก (12.0 วินาที)

| ฉาก | ช่วงเวลา (วินาที) | หัวข้อ / เนื้อหา | Visual & 3D WebGL Graphic |
|---|---|---|---|
| **Scene 1** | `0.0s - 3.0s` | **Hero Identity**<br>ข้อความ `"DALINES"` ขนาดใหญ่<br>ซับไตเติล `"GAMER • CONTENT CREATOR • TECH"` | 3D Wireframe Icosahedron หมุนพร้อม Inner Octahedron Core สี Cyan/Teal ลอยเหนือ Perspective Wave Grid แบบ Antigravity |
| **Scene 2** | `3.0s - 6.5s` | **Battlestation Hardware**<br>Grid การ์ดสเปกเครื่องสไตล์ Brutalist HUD:<br>• CPU: `AMD RYZEN 5 5600`<br>• GPU: `GEFORCE RTX 5060 Ti`<br>• MOUSE: `ATK GHOST ULTIMATE`<br>• PAD: `LOGA X CARNIVAL` | กล้องแพนเปลี่ยนมุมมอง, วัตถุ 3D แปลงรูปทรงเป็น Geometric Torus Knot Wireframe บนแกนขวา พร้อมแอนิเมชันเกจวัดประสิทธิภาพ |
| **Scene 3** | `6.5s - 9.5s` | **Active Combat Titles**<br>ไฮไลต์รายชื่อเกมหลัก:<br>• `PATH OF EXILE 2`<br>• `VALORANT`<br>• `APEX LEGENDS` | Kinetic Typography + Text Glitch Flash, 3D Kinetic Ring Gyroscope หมุนด้วยความเร็วสูง พร้อมประกายอนุภาคข้อมูล Cyber Dust |
| **Scene 4** | `9.5s - 12.0s` | **Channels & Outro**<br>ช่องทางถ่ายทอดสดหลัก:<br>• `TWITCH • TIKTOK • KICK`<br>• ไฮไลต์โดเมนหลัก `dalines-site.dalines.workers.dev` | Monolithic Cyberpunk Billboard เรืองแสงนีออน Cyan กล้องจัดวางมุมมองกว้างแบบ Cinematic เชื่อมต่อแอนิเมชันสำหรับ Loop ได้อย่างสมบูรณ์ |

---

## ⚙️ ระบบคุมจังหวะเรนเดอร์ (Deterministic Rendering)

ไฟล์ `index.html` มีฟังก์ชัน:
```javascript
window.renderFrame(timeInSeconds);
```
- ซิงก์ **GSAP Master Timeline** ด้วย `.seek(time, false)`
- คำนวณตำแหน่ง มุมหมุนของวัตถุ 3D Three.js และการกระเพื่อมของ Antigravity Grid ด้วยสมการทางคณิตศาสตร์ที่เป็น Pure Function ของค่าเวลา `t`
- เรนเดอร์ Three.js scene ตรงตาม timestamp แบบ Frame-by-Frame ทำให้การจับภาพแต่ละเฟรมคมชัด ไม่มีการตกหล่นหรือเฟรมเรตไม่คงที่

### ฟีเจอร์ Live Preview ในเบราว์เซอร์
เมื่อเปิด `index.html` ในเบราว์เซอร์ทั่วไป จะมี **Interactive Control Bar** ด้านล่างหน้าจอ:
- ปุ่ม **Play / Pause** (หรือกดปุ่ม `Spacebar`)
- แถบ **Time Scrubber Slider** เลื่อนเวลาดูแต่ละวินาทีและเฟรมได้ทันที
- ปุ่ม **Fit Screen / 100% 1080p** สำหรับย่อ-ขยายหน้าจอแสดงผลตามขนาด Browser Window

---

## 🚀 วิธีการเรนเดอร์ภาพและแปลงเป็นวิดีโอ

### ขั้นตอนที่ 1: ติดตั้ง Dependencies
เปิด Terminal ในโฟลเดอร์ `showcase/`:
```bash
npm install
```

### ขั้นตอนที่ 2: รันคำสั่งจับภาพเฟรม (Puppeteer)
```bash
# เรนเดอร์แบบเต็ม 720 เฟรม (12 วินาที @ 60 FPS)
npm run render

# หรือทดสอบเรนเดอร์ 30 เฟรมแรกเพื่อเช็กความถูกต้อง
npm run render:test
```
ไฟล์ภาพ `.png` ทั้งหมดจะถูกบันทึกไว้ในโฟลเดอร์ `showcase/frames/` (เช่น `frame_0001.png` ถึง `frame_0720.png`)

---

## 🎞️ คำสั่ง FFmpeg สำหรับรวมเฟรมเป็นวิดีโอ (ตามที่ต้องการ)

รันคำสั่งบรรทัดเดียวนี้ในโฟลเดอร์ `showcase/`:

```bash
ffmpeg -r 60 -i frames/frame_%04d.png -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p dalines_showcase.mp4
```

### หรือใช้ npm script:
```bash
npm run video
```

### พารามิเตอร์ของ FFmpeg:
- `-r 60`: บังคับ Frame Rate เป็น 60 FPS
- `-i frames/frame_%04d.png`: อ่านไฟล์เฟรมตามลำดับ `frame_0001.png` ถึง `frame_0720.png`
- `-c:v libx264`: ใช้วิดีโอโคเดก H.264 มาตรฐานสากล รองรับทุกแพลตฟอร์ม (YouTube, Twitch, TikTok, Web)
- `-preset slow`: บีบอัดคุณภาพสูงเพื่อความคมชัดสูงสุด
- `-crf 18`: ค่าความคมชัดระดับเกือบเทียบเท่า Lossless (คุณภาพสูงมากสำหรับ Motion Graphics)
- `-pix_fmt yuv420p`: Color space ที่เข้ากันได้กับ Player ทุกชนิด
- `dalines_showcase.mp4`: ชื่อไฟล์วิดีโอผลลัพธ์

---

## 💡 สำหรับ Windows: รันผ่านไฟล์คลิกเดียว (1-Click Run)
สามารถดับเบิลคลิกไฟล์:
```text
showcase/export-video.bat
```
ระบบจะตรวจสอบ Dependencies, สั่งรันเรนเดอร์ภาพ และแปลงเป็นไฟล์ `dalines_showcase.mp4` ให้อัตโนมัติทันที
