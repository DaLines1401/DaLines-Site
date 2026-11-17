# Microsoft Store (MSIX) & SmartScreen Guide — DaLines Sens Lab

## ทำไมเพื่อนจึงเจอ "Windows protected your PC"
ไฟล์ `.exe` ที่ไม่ได้เซ็นดิจิทัล (`NotSigned`) และยังไม่มียอดดาวน์โหลดสะสมบน Microsoft SmartScreen จะขึ้นเตือน "Unknown publisher" บนเครื่องผู้อื่น
การเปลี่ยนไอคอน ชื่อไฟล์ หรือแพ็ก ZIP ใหม่ **ไม่สามารถ** ปิดการเตือนนี้ได้

## 2 แนวทางที่ถูกต้อง
1. **Microsoft Store (MSIX)** — แนะนำสำหรับแจกสาธารณะในวงกว้าง: Microsoft Store จะเซ็นแพ็กเกจให้ตอนผ่านการตรวจ (Certification) ทำให้ติดตั้งบน Windows 10/11 ได้โดยไม่ติดเตือน Unknown publisher
2. **Code Signing Certificate** — ใช้สำหรับแจกไฟล์ ZIP/Installer นอก Store (มีค่าใช้จ่ายรายปีตามผู้ให้บริการ CA)

## สิ่งที่โปรแกรมรองรับแล้วสำหรับรุ่น Store (v0.2.2+)
- `desktop/storage.cjs` ตรวจจับ `process.windowsStore` และโฟลเดอร์ที่เขียนไม่ได้ (`WindowsApps`, `Program Files`) อัตโนมัติ
- ในโหมด Store โปรแกรมจะเก็บข้อมูลที่ `%APPDATA%\DaLines Sens Lab\data` แทนการเขียนข้าง `.exe`
- **รุ่น Portable ยังคงทำงานเหมือนเดิม 100%** (เก็บ `data/` ข้าง `.exe` เมื่อโฟลเดอร์เขียนได้)
- มีปุ่ม **นำเข้าข้อมูล Portable ↗** ในแท็บ *ประวัติการฝึก* เพื่อย้ายประวัติ/เซสชันจาก `data/` ของรุ่น Portable เข้ามาในรุ่น Store อย่างปลอดภัยโดยไม่ลบไฟล์ต้นฉบับ

## ขั้นตอนเตรียมแพ็กเกจ MSIX
1. สมัครบัญชีนักพัฒนาที่ [Microsoft Partner Center](https://partner.microsoft.com/dashboard) และจองชื่อแอป `DaLines Sens Lab`
2. นำค่า `Package/Identity/Name`, `Publisher`, `PublisherDisplayName` จาก Partner Center มาแทนที่ placeholder ใน `AppxManifest.template.xml`
3. เตรียมรูปไอคอนตามขนาด Store ในโฟลเดอร์ `Assets/`:
   - `StoreLogo.png` (50×50)
   - `Square44x44Logo.png` (44×44)
   - `Square150x150Logo.png` (150×150)
   - `Wide310x150Logo.png` (310×150)
4. รัน `npm.cmd run package -- release/DaLines-Sens-Lab-Store` จาก `sens-lab/` แล้วนำ `AppxManifest.xml` + `Assets/` วางในโฟลเดอร์นั้น จากนั้นสร้างไฟล์ `.msix` ด้วย `makeappx.exe pack` (Windows SDK) เพื่ออัปโหลดเข้า Store Certification
