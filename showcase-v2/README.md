# 🎬 DaLines Showcase V2 // 15-Second Brutalist Motion Graphics Video

โปรเจกต์ Video Motion Graphics ความยาว **15.0 วินาที** (Resolution: **1920x1080**, **60 FPS**, รวมทั้งหมด **900 เฟรม**) สไตล์ **Brutalist / Minimal Tech Swiss Motion Graphic** ผสานระบบเสียงดนตรีอิเล็กทรอนิกส์ที่สังเคราะห์ขึ้นจากโค้ดล้วน 100% (**Pure Node.js Audio Synthesizer**) ตามอัตลักษณ์แบรนด์สตรีมเมอร์ **DaLines** ([https://dalines-site.dalines.workers.dev/](https://dalines-site.dalines.workers.dev/))

---

## 🎨 ธีมและคู่สี (Aesthetics & Color Palette)

- **Deep Obsidian Black (`#0b0c10`):** พื้นหลังดำสนิทสไตล์ Cyber Monolith
- **Electric Cyan (`#66fcf1`):** แสงนีออนไซเบอร์ เส้นขอบ Reticle และข้อความไฮไลท์
- **Vibrant Lime Green (`#45f32b`):** จุดตัดสีคอนทราสต์สูงสำหรับ Technical Telemetry & Badges
- **Stark White (`#ffffff`):** Kinetic Typography ขนาดใหญ่ คมชัดทุกมุมมอง
- **Halftone Dot Matrix & CRT Scanlines:** ลวดลายตารางจุดและเส้นสแกนความถี่สูง

---

## 🎬 โครงสร้าง 4 ลำดับฉาก (15.0 วินาที)

| ฉาก (Scene) | ช่วงเวลา (วินาที) | หัวข้อ / เนื้อหา | Visual & 3D WebGL Graphic |
|---|---|---|---|
| **Scene 1: Hero** | `00:00 - 03:00` | • Kinetic Typography `"DALINES"` ขนาด 170px<br>• Subtext: `"GAMER • CONTENT CREATOR • TECH"`<br>• ข้อมูลประจำตัว Callsign / Region / Specialty | โครงสร้าง 3D Wireframe Icosahedron & Dodecahedron Core สี Electric Cyan และ Lime Green หมุนลอยตัวเหนือ Perspective Horizon Wave Grid |
| **Scene 2: Battlestation Rig** | `03:00 - 07:00` | • จัดแสดงสเปกเครื่องในรูปแบบ Brutalist Data Layout:<br>  - **CPU:** AMD RYZEN 5 5600 (4.4 GHz Boost)<br>  - **GPU:** GEFORCE RTX 5060 Ti (360+ FPS Peak)<br>  - **MOUSE:** ATK GHOST ULTIMATE (8000Hz / 800 DPI)<br>  - **PAD:** LOGA X CARNIVAL (Hybrid Glide) | กล้อง 3D แพนมุมมองเข้าหาชิ้นส่วน Torus Knot & Chassis Wireframe พร้อมเกจวัดอัตราโหลดและประสิทธิภาพ |
| **Scene 3: Tactical Realms** | `07:00 - 11:00` | • แถบ Kinetic Motion แนวนอนขนาดใหญ่สำหรับ 3 เกมหลัก:<br>  - `01 PATH OF EXILE 2` (Hardcore ARPG)<br>  - `02 VALORANT` (Tactical FPS / 0.35 Sens 800 DPI)<br>  - `03 APEX LEGENDS` (High-Speed Battle Royale) | วงแหวน Gyroscope 3D 3 แกนหมุนด้วยความเร็วสูง พร้อม Reticle สแกนเป้าหมายและสโตรกแสงกระพริบตามจังหวะบีท |
| **Scene 4: Outro & Link** | `11:00 - 15:00` | • หัวเรื่อง `"BROADCAST EVERYWHERE"`<br>• ตราแบรนด์ `"DALINES"` เรืองแสง 130px<br>• การ์ดช่องทาง: **TWITCH**, **TIKTOK**, **KICK**<br>• กล่อง URL นีออนหลัก: `dalines-site.dalines.workers.dev` | 3D Monolithic Horizon Portal เปิดกว้างส่องแสงนีออนนำทางสู่อนาคต เชื่อมต่อลูปได้อย่างสมบูรณ์แบบ |

---

## 🎵 ดนตรีประกอบสังเคราะห์จากโค้ด 100% (`synth_audio.js`)

เสียงเพลงประกอบความยาว 15.00 วินาที ถูกสังเคราะห์ขึ้นด้วย **Pure Node.js** ผ่านสมการคณิตศาสตร์เสียง (Sine, Sawtooth, Square, Noise, ADSR Envelopes, Resonant Sweeps, Analog Saturation และ Dynamic Limiter) ไม่มีการใช้โมเดล Gen-AI หรือไฟล์เสียงสำเร็จรูปใดๆ:
- **0.0s - 3.0s:** Sub-bass Boom (Sine drop 220Hz -> 32Hz) + 16th-note Cyber Arpeggio + Ticking Hi-hats + Pitch Riser
- **3.0s - 7.0s:** Heavy Industrial Drop, 4-on-the-Floor Kick, Sawtooth Rolling Bassline และ Snare Punch
- **7.0s - 11.0s:** Breakbeat Groove + Laser Zap Stabs ประจำแต่ละเกม + Tension Snare Roll
- **11.0s - 15.0s:** Melodic Synth Chords (Dm -> Bb -> C -> Dm) พร้อม Reverb Tail Fadeout นุ่มนวล

---

## 🚀 วิธีการเรนเดอร์และสร้างวิดีโอ MP4

### 1. ทดสอบแบบด่วน (Quick Test - 60 เฟรมแรก):
```bash
node render.js --test
```

### 2. เรนเดอร์ตัวเต็ม 900 เฟรม (15.0s @ 60 FPS + เสียง + MP4):
```bash
node render.js
```

หรือดับเบิลคลิกไฟล์:
```text
showcase-v2/export-video.bat
```

ระบบจะสร้างไฟล์วิดีโอสมบูรณ์ที่:
```text
showcase-v2/dalines_showcase_15s.mp4
```
