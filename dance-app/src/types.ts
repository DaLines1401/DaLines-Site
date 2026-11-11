export type Language = 'th' | 'en';

export interface Translations {
  introLine1: string;
  introLine2: string;
  typewriterText: string;
  pillTwitch: string;
  pillYoutube: string;
  pillSetup: string;
  pillCommunity: string;
  pillStory: string;
  pillEmailPrefix: string;
  pillCopied: string;
  navHub: string;
  navTwitch: string;
  navYoutube: string;
  navTiktok: string;
  navSetup: string;
  navDiscord: string;
  navStory: string;
  ctaWatchLive: string;
  soundOn: string;
  soundOff: string;
  scrubHint: string;
  autoPlayActive: string;
  autoPlayPaused: string;
  liveNow: string;
  offline: string;
  bentoRankBadge: string;
  bentoRankPeak: string;
  bentoAgentsLabel: string;
  bentoSpecsBadge: string;
  bentoSpecsBtn: string;
  bentoCrosshairBadge: string;
  bentoCrosshairBtn: string;
  stage1Scroll: string;
  stage3Title: string;
  stage3Desc: string;
}

export const DICTIONARY: Record<Language, Translations> = {
  en: {
    introLine1: "Hey there, welcome to the stream,",
    introLine2: "DaLines • Tactical & Action RPG Broadcast Hub",
    typewriterText: "Glad you stopped by. Good vibes and sharp aim always find a way. What game are we diving into today?",
    pillTwitch: "🎮 Twitch Stream",
    pillYoutube: "🎬 YouTube VODs",
    pillSetup: "⚡ Gaming Setup & Specs",
    pillCommunity: "💬 Join Community",
    pillStory: "🌌 3D Battlestation Story",
    pillEmailPrefix: "Business: taung@windowslive.com",
    pillCopied: "Copied to clipboard! ✓",
    navHub: "Hub",
    navTwitch: "Twitch",
    navYoutube: "YouTube",
    navTiktok: "TikTok",
    navSetup: "Setup & Gear",
    navDiscord: "Discord",
    navStory: "Story",
    ctaWatchLive: "🔴 Watch Live",
    soundOn: "Sound On",
    soundOff: "Sound Off",
    scrubHint: "Scroll or swipe to control dance • Press Space to auto-dance",
    autoPlayActive: "Auto-Dance Active (Space to pause)",
    autoPlayPaused: "Interactive Scrubbing (Drag or Space to play)",
    liveNow: "LIVE ON TWITCH",
    offline: "OFFLINE",
    bentoRankBadge: "VALORANT ESPORTS",
    bentoRankPeak: "Peak: Immortal 1 (34 RR)",
    bentoAgentsLabel: "Signature Agents (Hours)",
    bentoSpecsBadge: "BATTLESTATION",
    bentoSpecsBtn: "Explore 3D Story →",
    bentoCrosshairBadge: "VALORANT CROSSHAIR",
    bentoCrosshairBtn: "Copy Crosshair 🎯",
    stage1Scroll: "Scroll down to explore DaLines universe ↓",
    stage3Title: "Join Community & Business Inquiry",
    stage3Desc: "Watch live streams or reach out for esports / sponsorship inquiries",
  },
  th: {
    introLine1: "ยินดีต้อนรับสู่สตรีม DaLines,",
    introLine2: "DaLines • ศูนย์รวมเกม Tactical FPS & Action RPG",
    typewriterText: "ดีใจที่แวะเข้ามา บรรยากาศดีๆ และความคมชัดมักจะนำพาเรามาเจอกัน วันนี้เราจะลุยเกมไหนกันดี?",
    pillTwitch: "🎮 สตรีมสดบน Twitch",
    pillYoutube: "🎬 ไฮไลท์และคลิป YouTube",
    pillSetup: "⚡ สเปกคอมและเกียร์เกมมิ่ง",
    pillCommunity: "💬 เข้าร่วม Discord ชุมชน",
    pillStory: "🌌 เรื่องราว 3D Battlestation",
    pillEmailPrefix: "ติดต่องาน: taung@windowslive.com",
    pillCopied: "คัดลอกอีเมลแล้ว! ✓",
    navHub: "หน้าหลัก",
    navTwitch: "Twitch",
    navYoutube: "YouTube",
    navTiktok: "TikTok",
    navSetup: "สเปกคอม",
    navDiscord: "Discord",
    navStory: "สตอรี่",
    ctaWatchLive: "🔴 ดูสตรีมสด",
    soundOn: "เปิดเสียง",
    soundOff: "ปิดเสียง",
    scrubHint: "เลื่อนจอ หรือปาดหน้าจอเพื่อสครับท่าเต้น • กด Space เพื่อเต้นอัตโนมัติ",
    autoPlayActive: "กำลังเต้นอัตโนมัติ (กด Space เพื่อหยุด)",
    autoPlayPaused: "โหมดสครับอิสระ (เลื่อนจอ หรือกด Space เพื่อเต้น)",
    liveNow: "กำลังสตรีมสดบน TWITCH",
    offline: "ออฟไลน์",
    bentoRankBadge: "VALORANT ESPORTS",
    bentoRankPeak: "แต้มสูงสุด: Immortal 1 (34 RR)",
    bentoAgentsLabel: "3 เอเจนท์ตัวเมน (ชั่วโมงเล่น)",
    bentoSpecsBadge: "BATTLESTATION",
    bentoSpecsBtn: "เจาะลึก 3D Scrollytelling →",
    bentoCrosshairBadge: "VALORANT CROSSHAIR",
    bentoCrosshairBtn: "คัดลอกโค้ดเป้า 🎯",
    stage1Scroll: "หมุนล้อเมาส์ หรือเลื่อนลงเพื่อสำรวจจักรวาล DaLines ↓",
    stage3Title: "เข้าร่วมคอมมูนิตี้ & ติดต่องาน",
    stage3Desc: "คลิกติดตามช่องทางสตรีมสด หรือคัดลอกอีเมลเพื่อติดต่อธุรกิจได้ทันที",
  }
};
