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
    scrubHint: "Drag mouse or swipe to scrub dance • Press Space to auto-dance",
    autoPlayActive: "Auto-Dance Active (Space to pause)",
    autoPlayPaused: "Interactive Scrubbing (Drag or Space to play)",
    liveNow: "LIVE ON TWITCH",
    offline: "OFFLINE",
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
    scrubHint: "ขยับเมาส์ หรือปาดหน้าจอเพื่อสครับท่าเต้น • กด Spacebar เพื่อเต้นอัตโนมัติ",
    autoPlayActive: "กำลังเต้นอัตโนมัติ (กด Space เพื่อหยุด)",
    autoPlayPaused: "โหมดสครับอิสระ (ขยับเมาส์ หรือกด Space เพื่อเต้น)",
    liveNow: "กำลังสตรีมสดบน TWITCH",
    offline: "ออฟไลน์",
  }
};
