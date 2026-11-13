// User preferences remain usable when storage is unavailable (private browsing, quota, or policy).
const preferenceMemory = new Map();
const safeStorage = {
  getItem(key) {
    if (preferenceMemory.has(key)) return preferenceMemory.get(key);
    try { return window.localStorage.getItem(key); }
    catch { return preferenceMemory.get(key) ?? null; }
  },
  removeItem(key) {
    preferenceMemory.set(key, null);
    try { window.localStorage.removeItem(key); } catch { /* Cleared for this session. */ }
  },
  setItem(key, value) {
    preferenceMemory.set(key, String(value));
    try { window.localStorage.setItem(key, String(value)); } catch { /* Keep this session's preference. */ }
  }
};
function getLikedClips() {
  try {
    const value = JSON.parse(safeStorage.getItem('dalines_liked_clips') || '{}');
    return value && typeof value === 'object' && !Array.isArray(value)
      ? Object.assign(Object.create(null), value) : Object.create(null);
  } catch { return Object.create(null); }
}
function prefersQuietEffects() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || Boolean(navigator.connection?.saveData);
}
async function copyTextToClipboard(text, successMessage) {
  let copied = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text));
      copied = true;
    }
  } catch { /* Try the browser's legacy copy support below. */ }
  if (!copied) {
    const previousFocus = document.activeElement;
    const input = document.createElement('textarea');
    input.value = String(text);
    input.setAttribute('readonly', '');
    input.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(input);
    input.select();
    try { copied = Boolean(document.execCommand('copy')); } catch { /* Report failure. */ }
    input.remove();
    previousFocus?.focus({ preventScroll: true });
  }
  showToast(copied ? successMessage : (currentLang === 'en' ? 'Copy failed. Please try again.' : 'คัดลอกไม่สำเร็จ กรุณาลองอีกครั้ง'));
  return copied;
}

    // -----------------------------------------------------------------
    // TWITCH VIDEO & STREAM PLAYER CONTROLLER (LAZY-LOADED & TRAILER DEFAULT)
    // -----------------------------------------------------------------
    let currentPlayerMode = 'trailer'; // Default to trailer (channel offline by default)
    let isChatOpen = false;
    let isTwitchPlayerLoaded = false;
    let twitchFacadeTimer = 0;

    function getTwitchParentsQuery() {
      const host = window.location.hostname;
      const parents = new Set(['localhost', '127.0.0.1', 'dalines-site.dalines.workers.dev', 'pages.dalines.workers.dev', 'dalines.tv']);
      if (host) parents.add(host);
      return Array.from(parents).filter(Boolean).map(p => `parent=${encodeURIComponent(p)}`).join('&');
    }

    function loadTwitchPlayer(mode) {
      if (mode) currentPlayerMode = mode;
      isTwitchPlayerLoaded = true;

      const facade = document.getElementById('twitch-player-facade');
      clearTimeout(twitchFacadeTimer);
      if (facade) {
        facade.style.transition = 'opacity 0.3s ease';
        facade.style.opacity = '0';
        facade.style.pointerEvents = 'none';
        twitchFacadeTimer = setTimeout(() => {
          if (facade) facade.style.display = 'none';
        }, 300);
      }

      updateTwitchPlayer(currentPlayerMode);
    }

    function updateTwitchPlayer(mode) {
      const iframe = document.getElementById('twitch-main-player');
      const badge = document.getElementById('player-status-badge');
      const title = document.getElementById('player-title-text');
      const btnLive = document.getElementById('btn-mode-live');
      const btnTrailer = document.getElementById('btn-mode-trailer');
      const parentQuery = getTwitchParentsQuery();

      if (!iframe || !document.getElementById('tab-stream')?.classList.contains('active')) return;

      if (mode === 'live') {
        currentPlayerMode = 'live';
        if (isTwitchPlayerLoaded) {
          const targetSrc = `https://player.twitch.tv/?channel=dalines&${parentQuery}&autoplay=true&muted=false`;
          if (iframe.src !== targetSrc) iframe.src = targetSrc;
        }

        if (badge) {
          badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-gaming font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1';
          badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>STREAMING';
        }
        if (title) title.innerText = 'Twitch: dalines (Live Stream)';

        if (btnLive) btnLive.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-red-600 text-white shadow-lg cursor-pointer';
        if (btnTrailer) btnTrailer.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5 hover:bg-slate-800 cursor-pointer';
      } else {
        currentPlayerMode = 'trailer';
        if (isTwitchPlayerLoaded) {
          const targetSrc = `https://player.twitch.tv/?video=1475544386&${parentQuery}&autoplay=true`;
          if (iframe.src !== targetSrc) iframe.src = targetSrc;
        }

        if (badge) {
          badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-gaming font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1';
          badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>TRAILER VOD';
        }
        if (title) title.innerText = 'Twitch VOD: 1475544386 (Trailer)';

        if (btnTrailer) btnTrailer.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-emerald-600 text-white shadow-lg cursor-pointer';
        if (btnLive) btnLive.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5 hover:bg-slate-800 cursor-pointer';
      }
    }

    function setFrameSource(frame, url) {
      if (frame && frame.getAttribute('src') !== url) frame.src = url;
    }

    function stopStreamEmbeds() {
      setFrameSource(document.getElementById('twitch-main-player'), 'about:blank');
      setFrameSource(document.getElementById('twitch-chat-frame'), 'about:blank');
      isTwitchPlayerLoaded = false;
      clearTimeout(twitchFacadeTimer);
      twitchFacadeTimer = 0;
      const facade = document.getElementById('twitch-player-facade');
      if (facade) { facade.style.display = ''; facade.style.opacity = ''; facade.style.pointerEvents = ''; }
      if (isChatOpen) {
        isChatOpen = false;
        document.getElementById('twitch-chat-container')?.classList.add('hidden');
        const label = document.getElementById('chat-toggle-text');
        if (label) label.textContent = currentLang === 'en' ? 'Open chat' : 'เปิดแชท';
      }
    }

    function setPlayerMode(mode) {
      playSound('tab');
      loadTwitchPlayer(mode);
    }

    function toggleTwitchChat() {
      playSound('pop');
      const chatContainer = document.getElementById('twitch-chat-container');
      const chatFrame = document.getElementById('twitch-chat-frame');
      const chatText = document.getElementById('chat-toggle-text');
      const parentQuery = getTwitchParentsQuery();
      if (!chatContainer || !chatFrame || !document.getElementById('tab-stream')?.classList.contains('active')) return;

      isChatOpen = !isChatOpen;
      if (isChatOpen) {
        chatContainer.classList.remove('hidden');
        chatFrame.src = `https://www.twitch.tv/embed/dalines/chat?${parentQuery}&darkpopout`;
        chatText.innerText = 'ปิดแชท';
      } else {
        chatContainer.classList.add('hidden');
        chatFrame.src = 'about:blank';
        chatText.innerText = 'เปิดแชท';
      }
    }

    function switchToStreamTab(mode) {
      switchTab('stream', true, true);
      setPlayerMode(mode);
    }

    // -----------------------------------------------------------------
    // MULTI-LANGUAGE SYSTEM (i18n: TH & EN) & DYNAMIC AGE
    // -----------------------------------------------------------------
    function calculateAge(birthDateString) {
      const birthDate = new Date(birthDateString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }

    const translations = {
      th: {
        banner_desc: "• สตรีมหลักบน Twitch แวะมาเมาท์กันได้!",
        banner_btn: "ชมไลฟ์สด",
        theme_label: '<i class="fa-solid fa-palette text-xs mr-1"></i>ธีม',
        share_btn: "แชร์",
        bio_text: "🎮 สตรีมเมอร์สายยิง เน้นโยน จริงจังมาเยอะแล้วครับ! • Just an FPS & Battle Royale lover from Thailand 🇹🇭",
        name_tag: "ตวง (Tuang) • 30 ปี",
        stream_tag: "Streaming Since May 2017",
        tab_links: "ช่องทาง",
        tab_stream: "สตรีมสด",
        tab_pc: "สเปก PC",
        tab_gear: "อุปกรณ์",
        tab_rules: "แชท & บอท & มีม",
        btn_mode_live: "🔴 ไลฟ์สด (Twitch Live)",
        btn_mode_trailer: "🎬 เทรลเลอร์ช่อง (Trailer)",
        open_twitch: "ดูบน Twitch",
        twitch_sub: "twitch.tv/dalines • สตรีมหลัก เล่นเกม & ปาร์ตี้คุยสดที่นี่",
        discord_sub: "ดิสคอร์ดคอมมูนิตี้ พูดคุย หาตี้เล่นเกม และแจ้งเตือนไลฟ์",
        kick_sub: "kick.com/dalinesth • อีกหนึ่งช่องทางสตรีมสำรอง",
        youtube_sub: "youtube.com/@DaLinesTTV • ไฮไลท์สตรีม คลิปยิงคมๆ และ VOD ย้อนหลัง",
        tiktok_sub: "@dalinestuang • คลิปไฮไลท์ & ช็อตฟันนี่โมเมนต์",
        facebook_sub: "DaLines Tuang • อัปเดตตารางเวลาสตรีมและข่าวสาร",
        instagram_sub: "@tuangdanai • ไลฟ์สไตล์และรูปภาพเบื้องหลัง",
        hw_conf: "Hardware Configuration",
        sched_banner_title: "ตารางเวลาสตรีม &amp; เกมที่เล่นช่วงนี้",
        sched_banner_sub: "แวะมาดูเวลาไลฟ์สดและเกมที่ตวงเล่นประจำช่วงนี้ได้เลย!",
        discord_notify_btn: "แจ้งเตือนใน Discord",
        sched_time_title: "ตารางไลฟ์ (Stream Schedule)",
        sched_weekday_desc: "ช่วงค่ำ <strong>20:00 น. เป็นต้นไป</strong> (ยาวถึงเที่ยงคืน)",
        sched_weekend_desc: "ตามใจสตรีมเมอร์ (ติดตามแจ้งเตือนสดใน Discord)",
        now_playing_title: "เกมที่เล่นประจำช่วงนี้ (Now Playing)",
        creator_tools_title: "🛠️ Creator Tools &amp; Dev Projects (สำหรับสตรีมเมอร์)",
        party_title: "Join the Party & Add In-Game",
        party_desc: "ชื่อในเกม / IGN: <strong class=\"text-emerald-300 font-mono text-sm\">DaLines#TTV</strong> (รบกวนกด Follow ในสตรีมก่อนแอดมาเล่นด้วยกันน้า!)",
        copy_ign: "คัดลอกชื่อในเกม: DaLines#TTV",
        chat_rules_title: "กฎกติกาการพูดคุย (Chat Rules)",
        rule_1: "พิมพ์คุยเล่นได้ตลอด ถามได้ไม่กัดครับ เป็นกันเองได้เลย",
        rule_2: "ให้เกียรติเพื่อนๆ ในแชท ไม่สปอยล์ และงดใช้คำพูดเสียดสีรุนแรง",
        rule_3: "คำสั่งบอท: พิมพ์ !commands ในแชท Twitch เพื่อเล่นกับบอทและดูคำสั่งทั้งหมด",
        footer_thanks: "Just an FPS & Battle Royale lover from Thailand 🇹🇭",
        donate_title: "สนับสนุน DaLines (Donate)",
        donate_sub: "ezdn.app/dalines • สแกน QR หรือกดลิงก์ โดเนทขึ้นจอสด",
        donate_btn_short: "โดเนท / ซัพพอร์ต",
        donate_qr_hint: "สแกน QR ผ่านแอปธนาคารหรือ TrueMoney โดเนทขึ้นจอสดได้เลยครับ!",
        open_ezdn_btn: "เปิดหน้า EZDN",
        save_qr_btn: "บันทึกรูป QR",
        pro_settings_title: "Pro Settings / Mouse &amp; Sensitivity (Valorant)",
        pro_settings_desc: "ตารางสเปกค่าความไวเมาส์และหน้าจอที่ DaLines ใช้เล่น Valorant ประจำช่อง",
        copy_pro_settings_btn: "คัดลอกค่า Setting ทั้งหมด (Copy All Settings)",
        toast_copy_pro_settings: "คัดลอกค่า Setting Valorant ครบทุกตัวเลขเรียบร้อย! 🖱️",
        crosshair_title: "Valorant Crosshair &amp; Reflex Aim Simulator",
        crosshair_desc: "จำลองเป้าเล็งจริงของ DaLines พร้อมสนามทดสอบความคม &amp; ชาเลนจ์ 10 วินาที",
        crosshair_copy_btn: "คัดลอกโค้ดเป้า (Valorant Code)",
        crosshair_click_hint: "🎯 คลิกซ้ายในสนามเพื่อทดสอบสะบัดยิง (มีเสียงเอฟเฟกต์กระสุนสมจริง)",
        obs_toggle_btn: "⚙️ สำหรับสตรีมเมอร์ (OBS Sync)",
        sens_title: "FPS E-DPI Calculator & Sensitivity Converter",
        sens_desc: "คำนวณ E-DPI และแปลงค่าความไวเมาส์ข้ามเกมแบบแม่นยำ 100% ตามระยะทางจริง (cm/360°)",
        sens_dpi_label: "Mouse DPI:",
        sens_base_game_label: "เกมต้นทาง & ค่าความไว (Base Sens):",
        sens_matrix_title: "ผลลัพธ์แปลงค่า Sens ที่เท่าเทียมกันทุกเกม (Identical 360° Turn)",
        soundboard_title: "🎮 DaLines Soundboard & Meme FX",
        soundboard_desc: "กดปุ่มเพื่อเล่นเสียงประจำช่อง & มีมสตรีมเมอร์สายยิงเน้นโยน!",
        copy_val_btn: "คัดลอกเป้า Valorant",
        toast_copy_crosshair: "คัดลอกโค้ดเป้า Valorant เรียบร้อย! 🎯",
        toast_copy_link: "คัดลอกลิงก์โปรไฟล์ DaLines แล้วครับ! 🔗",
        toast_copy_ign: "คัดลอก IGN: DaLines#TTV เรียบร้อย! 🎮",
        bank_name: "ธนาคารกสิกรไทย",
        bank_account_label: "เลขที่บัญชี:",
        copy_bank_btn: "คัดลอกเลขบัญชี",
        toast_copy_bank: "คัดลอกเลขบัญชี 6322170767 เรียบร้อย! 🏦",
        master_volume_title: "ระดับเสียงหลัก",
        toast_sound_on: "เปิดเสียงเอฟเฟกต์แล้ว 🔊",
        toast_sound_off: "ปิดเสียงเอฟเฟกต์แล้ว 🔇",
        clips_desc: "คลังคลิปไฮไลท์ยอดนิยมตลอดกาลจาก twitch.tv/dalines เรียงตามยอดเข้าชมสูงสุด",
        tracker_title: "Valorant Career &amp; Live Match Tracker",
        tracker_desc: "สถิติแรงก์สด ผลการแข่ง และเอเจนท์ตัวเมนของ DaLines#TTV",
        tracker_sync_live: "ซิงค์สด",
        tracker_synced_status: "สถานะ: ซิงค์ล่าสุด",
        tracker_rank_label: "แรงก์ปัจจุบัน (Competitive Rank)",
        tracker_peak_label: "แรงก์สูงสุด (Career Peak)",
        tracker_streak_label: "🔥 3 Win Streak",
        tracker_agents_title: "เอเจนท์ที่เล่นบ่อยที่สุด (Most Played Agents)",
        tracker_matches_title: "ผลการแข่ง 5 แมตช์ล่าสุด (Recent Competitive Matches)",
        tracker_search_title: "ค้นหาแรงก์ผู้เล่นสด (Live Player Lookup)",
        tracker_search_desc: "ค้นหาได้ทุกไอดี (เช่น ตัวคุณเอง หรือเพื่อนในตี้)",
        tracker_search_btn: "ค้นหา",
        toast_tracker_synced: "ซิงค์สถิติ Valorant สำเร็จแล้ว! 🎯",
        hero_intro_1: "ยินดีต้อนรับสู่สตรีม DaLines,",
        hero_stage1_scroll: "หมุนล้อเมาส์ หรือเลื่อนลงเพื่อสำรวจจักรวาล DaLines ↓",
        hero_bento_rank_badge: "VALORANT ESPORTS",
        hero_bento_rank_peak: "แต้มสูงสุด: Immortal 1 (34 RR)",
        hero_bento_agents_label: "3 เอเจนท์ตัวเมน (ชั่วโมงเล่น)",
        hero_bento_specs_badge: "BATTLESTATION",
        hero_bento_specs_btn: "เจาะลึก 3D Scrollytelling",
        hero_bento_crosshair_badge: "VALORANT CROSSHAIR",
        hero_bento_crosshair_btn: "คัดลอกโค้ดเป้า 🎯",
        hero_stage3_title: "เข้าร่วมคอมมูนิตี้ & ติดต่องาน",
        hero_stage3_desc: "คลิกติดตามช่องทางสตรีมสด หรือคัดลอกอีเมลเพื่อติดต่อธุรกิจได้ทันที",
        hero_intro_2: "DaLines • ศูนย์รวมเกม Tactical FPS & Action RPG",
        hero_typewriter: "ดีใจที่แวะเข้ามา บรรยากาศดีๆ และความคมชัดมักจะนำพาเรามาเจอกัน วันนี้เราจะลุยเกมไหนกันดี?",
        hero_pill_twitch: "🎮 สตรีมสดบน Twitch",
        hero_pill_youtube: "🎬 ไฮไลท์และคลิป YouTube",
        hero_pill_setup: "⚡ สเปกคอมและเกียร์เกมมิ่ง",
        hero_pill_community: "💬 เข้าร่วม Discord ชุมชน",
        hero_nav_hub: "หน้าหลัก",
        hero_nav_setup: "สเปกคอม",
        hero_nav_story: "สตอรี่",
        hero_cta: "🔴 ดูสตรีมสด",
        cmd_palette_btn: "ค้นหาด่วน",
        hero_sound_on: "เปิดเสียง",
        hero_sound_off: "ปิดเสียง",
        hero_scrub_hint: "ขยับเมาส์ หรือปาดหน้าจอเพื่อสครับท่าเต้น • กด Spacebar เพื่อเต้นอัตโนมัติ",
        hero_scroll_btn: "⚡ เลื่อนลงสู่ DaLines Command Center ⚡",
        hero_offline: "ออฟไลน์",
        hero_live: "กำลังสตรีมสดบน TWITCH",
        toast_copy_riot_id: "คัดลอก Riot ID: DaLines#TTV เรียบร้อย! 🎮"
      },
      en: {
        banner_desc: "• Catch me live on Twitch! Come say hi!",
        banner_btn: "Watch Live",
        theme_label: '<i class="fa-solid fa-palette text-xs mr-1"></i>Theme',
        share_btn: "Share",
        bio_text: "🎮 FPS & Battle Royale lover from Thailand 🇹🇭 • Streaming Since 2017",
        name_tag: "Tuang • 30 yrs",
        stream_tag: "Twitch Affiliate Since Jul 2019",
        tab_links: "Channels",
        tab_stream: "Live Stream",
        tab_pc: "PC Specs",
        tab_gear: "Gear Setup",
        tab_rules: "Chat, Bot & FX",
        btn_mode_live: "🔴 Live Stream",
        btn_mode_trailer: "🎬 Channel Trailer",
        open_twitch: "Watch on Twitch",
        twitch_sub: "twitch.tv/dalines • Main stream, live chat & gameplay",
        discord_sub: "Discord Community Hub, party search & stream alerts",
        kick_sub: "kick.com/dalinesth • Secondary streaming platform",
        youtube_sub: "youtube.com/@DaLinesTTV • Stream highlights, best gameplay moments & VODs",
        tiktok_sub: "@dalinestuang • Highlights & funny gaming moments",
        facebook_sub: "DaLines Tuang • Schedule announcements & updates",
        instagram_sub: "@tuangdanai • Personal vibes & photos",
        hw_conf: "Hardware Configuration",
        sched_banner_title: "Stream Schedule &amp; Current Rotation",
        sched_banner_sub: "Check out stream broadcast hours and games DaLines is actively playing!",
        discord_notify_btn: "Discord Alerts",
        sched_time_title: "Stream Schedule",
        sched_weekday_desc: "Mon - Fri: <strong>8:00 PM+ (BKK)</strong> until midnight",
        sched_weekend_desc: "Sat - Sun: Weekend Pop-up Streams (Follow Discord Alerts)",
        now_playing_title: "Current Rotation (Now Playing)",
        creator_tools_title: "🛠️ Creator Tools &amp; Dev Projects (For Streamers)",
        party_title: "Join the Party & In-Game ID",
        party_desc: "In-Game Name: <strong class=\"text-emerald-300 font-mono text-sm\">DaLines#TTV</strong> (Please follow the stream before sending a friend request!)",
        copy_ign: "Copy IGN: DaLines#TTV",
        chat_rules_title: "Community Guidelines & Chat Rules",
        rule_1: "Friendly chat, feel free to ask questions and hang out.",
        rule_2: "Respect each other in chat, no spoilers or toxic behavior.",
        rule_3: "Bot commands: Type !commands in Twitch chat to interact.",
        footer_thanks: "Just an FPS & Battle Royale lover from Thailand 🇹🇭",
        donate_title: "Support DaLines (Donate)",
        donate_sub: "ezdn.app/dalines • Scan QR or click link for live stream alerts",
        donate_btn_short: "Donate / Support",
        donate_qr_hint: "Scan QR with Mobile Banking or TrueMoney for live on-screen stream alerts!",
        open_ezdn_btn: "Open EZDN",
        save_qr_btn: "Save QR Image",
        pro_settings_title: "Pro Settings / Mouse &amp; Sensitivity (Valorant)",
        pro_settings_desc: "Official mouse sensitivity and display hardware settings used by DaLines in Valorant",
        copy_pro_settings_btn: "Copy All Settings",
        toast_copy_pro_settings: "Valorant Pro Settings copied to clipboard! 🖱️",
        crosshair_title: "Valorant Crosshair &amp; Reflex Aim Simulator",
        crosshair_desc: "Authentic DaLines crosshair reticle with interactive 10-second aim reflex challenge",
        crosshair_copy_btn: "Copy Valorant Code",
        crosshair_click_hint: "🎯 Click inside stage to test crosshair flick &amp; recoil sound effects",
        obs_toggle_btn: "⚙️ Streamer Tools (OBS Sync)",
        sens_title: "FPS E-DPI Calculator & Sensitivity Converter",
        sens_desc: "Calculate eDPI and convert mouse sensitivity across games accurately by cm/360°",
        sens_dpi_label: "Mouse DPI:",
        sens_base_game_label: "Base Game & Sensitivity:",
        sens_matrix_title: "Equivalent Sensitivity Across All Games (Identical 360° Turn)",
        soundboard_title: "🎮 DaLines Soundboard & Meme FX",
        soundboard_desc: "Tap buttons to play signature streamer memes & sound effects!",
        copy_val_btn: "Copy Valorant Crosshair",
        toast_copy_crosshair: "Valorant Crosshair code copied! 🎯",
        toast_copy_link: "DaLines Profile link copied! 🔗",
        toast_copy_ign: "IGN: DaLines#TTV copied to clipboard! 🎮",
        bank_name: "Kasikornbank (KBank)",
        bank_account_label: "Account No:",
        copy_bank_btn: "Copy Account No.",
        toast_copy_bank: "Account number 6322170767 copied! 🏦",
        master_volume_title: "Master Volume",
        toast_sound_on: "Sound FX Enabled 🔊",
        toast_sound_off: "Sound FX Muted 🔇",
        clips_desc: "All-time top clips and highlights from twitch.tv/dalines sorted by view count!",
        tracker_title: "Valorant Career &amp; Live Match Tracker",
        tracker_desc: "Live rank stats, match history & signature agents for DaLines#TTV",
        tracker_sync_live: "Sync Live",
        tracker_synced_status: "Status: Synced",
        tracker_rank_label: "Current Rank (Competitive)",
        tracker_peak_label: "Career Peak:",
        tracker_streak_label: "🔥 3 Win Streak",
        tracker_agents_title: "Most Played Agents (Signature Roster)",
        tracker_matches_title: "Recent Competitive Matches (Last 5)",
        tracker_search_title: "Live Player Rank Lookup",
        tracker_search_desc: "Look up any Riot ID & region in real-time",
        tracker_search_btn: "Lookup",
        toast_tracker_synced: "Valorant stats synced successfully! 🎯",
        hero_intro_1: "Hey there, welcome to the stream,",
        hero_stage1_scroll: "Scroll down to explore DaLines universe ↓",
        hero_bento_rank_badge: "VALORANT ESPORTS",
        hero_bento_rank_peak: "Peak: Immortal 1 (34 RR)",
        hero_bento_agents_label: "Signature Agents (Hours)",
        hero_bento_specs_badge: "BATTLESTATION",
        hero_bento_specs_btn: "Explore 3D Story",
        hero_bento_crosshair_badge: "VALORANT CROSSHAIR",
        hero_bento_crosshair_btn: "Copy Crosshair 🎯",
        hero_stage3_title: "Join Community & Business Inquiry",
        hero_stage3_desc: "Watch live streams or reach out for esports / sponsorship inquiries",
        hero_intro_2: "DaLines • Tactical & Action RPG Broadcast Hub",
        hero_typewriter: "Glad you stopped by. Good vibes and sharp aim always find a way. What game are we diving into today?",
        hero_pill_twitch: "🎮 Twitch Stream",
        hero_pill_youtube: "🎬 YouTube VODs",
        hero_pill_setup: "⚡ Gaming Setup & Specs",
        hero_pill_community: "💬 Join Community",
        hero_nav_hub: "Hub",
        hero_nav_setup: "Setup & Gear",
        hero_nav_story: "Story",
        hero_cta: "🔴 Watch Live",
        cmd_palette_btn: "Quick Command",
        hero_sound_on: "Sound On",
        hero_sound_off: "Sound Off",
        hero_scrub_hint: "Drag mouse or swipe to scrub dance • Press Space to auto-dance",
        hero_scroll_btn: "⚡ Scroll down to Battle Station & Hub ⚡",
        hero_offline: "OFFLINE",
        hero_live: "LIVE ON TWITCH",
        toast_copy_riot_id: "Riot ID: DaLines#TTV copied to clipboard! 🎮"
      }
    };

    let currentLang = safeStorage.getItem('dalines_lang') === 'en' ? 'en' : 'th';

    function setLanguage(lang) {
      if (!['th', 'en'].includes(lang)) return;
      currentLang = lang;
      safeStorage.setItem('dalines_lang', lang);
      document.documentElement.lang = lang;

      // Dynamic Age Injection from birthdate 1996-01-14
      const dynamicAge = calculateAge('1996-01-14');
      translations.th.name_tag = `ตวง (Tuang) • ${dynamicAge} ปี`;
      translations.en.name_tag = `Tuang • ${dynamicAge} yrs`;

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
          el.innerHTML = translations[lang][key];
        }
      });

      if (typeof lastTwitchStatus !== 'undefined' && lastTwitchStatus) document.dispatchEvent(new CustomEvent('dalines:live-status', { detail: lastTwitchStatus }));
      const indicator = document.getElementById('lang-indicator');
      if (indicator) {
        indicator.innerText = (lang === 'th') ? 'EN' : 'TH';
      }
    }

    function toggleLanguage() {
      const nextLang = (currentLang === 'th') ? 'en' : 'th';
      setLanguage(nextLang);
      playSound('theme');
    }

    // -----------------------------------------------------------------
    // SOUND EFFECTS ENGINE (Web Audio API & Master Volume Control)
    // -----------------------------------------------------------------
    let audioCtx = null;
    let masterGainNode = null;
    let isSoundEnabled = safeStorage.getItem('dalines_sound') !== 'false';
    let savedMasterVol = safeStorage.getItem('dalines_master_volume');
    let masterVolume = savedMasterVol !== null ? parseFloat(savedMasterVol) : 0.8;
    if (isNaN(masterVolume) || masterVolume < 0 || masterVolume > 1) {
      masterVolume = 0.8;
    }

    function triggerHaptic(duration = 15) {
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
          navigator.vibrate(duration);
        }
      } catch (err) {
        // Fallback gracefully if vibration is blocked or unsupported
      }
    }

    function initAudio() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (!masterGainNode) {
        masterGainNode = audioCtx.createGain();
        const effectiveVol = (isSoundEnabled && masterVolume > 0) ? masterVolume : 0;
        masterGainNode.gain.setValueAtTime(effectiveVol, audioCtx.currentTime);
        masterGainNode.connect(audioCtx.destination);
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    function getAudioDestination() {
      initAudio();
      return masterGainNode || audioCtx.destination;
    }

    function applyMasterVolume() {
      if (audioCtx && masterGainNode) {
        const effectiveVol = (isSoundEnabled && masterVolume > 0) ? masterVolume : 0;
        masterGainNode.gain.setValueAtTime(effectiveVol, audioCtx.currentTime);
      }
    }

    function toggleVolumeDropdown(e) {
      if (e) e.stopPropagation();
      const panel = document.getElementById('volume-dropdown-panel');
      const chevron = document.getElementById('volume-dropdown-chevron');
      if (!panel) return;
      const isClosed = panel.classList.contains('hidden');
      if (isClosed) {
        panel.classList.remove('hidden');
        if (chevron) chevron.style.transform = 'rotate(180deg)';
        updateVolumeUI();
      } else {
        closeVolumeDropdown();
      }
    }

    function closeVolumeDropdown() {
      const panel = document.getElementById('volume-dropdown-panel');
      const chevron = document.getElementById('volume-dropdown-chevron');
      if (panel) panel.classList.add('hidden');
      if (chevron) chevron.style.transform = 'rotate(0deg)';
    }

    function onVolumeSliderInput(val) {
      const pct = parseInt(val, 10);
      const vol = Math.min(Math.max(pct / 100, 0), 1);
      masterVolume = vol;
      safeStorage.setItem('dalines_master_volume', vol);

      if (pct === 0) {
        isSoundEnabled = false;
        safeStorage.setItem('dalines_sound', false);
      } else if (!isSoundEnabled) {
        isSoundEnabled = true;
        safeStorage.setItem('dalines_sound', true);
      }

      applyMasterVolume();
      updateSoundIcon();
      updateVolumeUI();
    }

    function setQuickVolume(pct) {
      const vol = Math.min(Math.max(pct / 100, 0), 1);
      masterVolume = vol;
      safeStorage.setItem('dalines_master_volume', vol);

      if (pct === 0) {
        isSoundEnabled = false;
        safeStorage.setItem('dalines_sound', false);
      } else {
        isSoundEnabled = true;
        safeStorage.setItem('dalines_sound', true);
      }

      applyMasterVolume();
      updateSoundIcon();
      updateVolumeUI();
      if (pct > 0) {
        playSound('pop');
      }
      triggerHaptic(15);
    }

    function updateSoundIcon() {
      const icon = document.getElementById('sound-icon');
      if (icon) {
        if (!isSoundEnabled || masterVolume === 0) {
          icon.className = 'fa-solid fa-volume-xmark text-xs text-slate-500';
          icon.style.color = '';
        } else if (masterVolume < 0.5) {
          icon.className = 'fa-solid fa-volume-low text-xs';
          icon.style.color = 'var(--primary-color)';
        } else {
          icon.className = 'fa-solid fa-volume-high text-xs';
          icon.style.color = 'var(--primary-color)';
        }
      }
      updateVolumeUI();
    }

    function updateVolumeUI() {
      const badge = document.getElementById('volume-badge-text');
      const slider = document.getElementById('master-volume-slider');
      const sliderLabel = document.getElementById('volume-slider-label');
      const pct = Math.round(masterVolume * 100);

      if (badge) {
        badge.innerText = (!isSoundEnabled || masterVolume === 0) ? '0%' : `${pct}%`;
      }
      if (slider) {
        slider.value = (!isSoundEnabled) ? 0 : pct;
      }
      if (sliderLabel) {
        sliderLabel.innerText = (!isSoundEnabled || masterVolume === 0) ? 'Muted (0%)' : `${pct}%`;
      }
    }

    function playSound(type) {
      if (!isSoundEnabled || masterVolume === 0) return;
      try {
        initAudio();
        const now = audioCtx.currentTime;

        if (type === 'tab') {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(480, now);
          osc.frequency.exponentialRampToValueAtTime(720, now + 0.06);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.connect(gain);
          gain.connect(getAudioDestination());
          osc.start(now);
          osc.stop(now + 0.06);
        } else if (type === 'theme') {
          [440, 554.37, 659.25].forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            gain.gain.setValueAtTime(0.05, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.15);
            osc.connect(gain);
            gain.connect(getAudioDestination());
            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.15);
          });
        } else if (type === 'sparkle') {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
          osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
          gain.gain.setValueAtTime(0.03, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          gain.connect(getAudioDestination());
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (type === 'pop') {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          gain.connect(getAudioDestination());
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (type === 'gunshot') {
          playGunshotSynth(audioCtx, now);
        } else if (type === 'headshot') {
          playHeadshotSynth(audioCtx, now);
        } else if (type === 'yorn') {
          playYornSynth(audioCtx, now);
        } else if (type === 'taek1') {
          playTaek1Synth(audioCtx, now);
        } else if (type === 'victory') {
          playVictorySynth(audioCtx, now);
        } else if (type === 'thanks') {
          playThanksSynth(audioCtx, now);
        } else if (type === 'alarm') {
          playAlarmSynth(audioCtx, now);
        } else if (type === 'spray') {
          playSpraySynth(audioCtx, now);
        } else if (type === 'spike') {
          playSpikeSynth(audioCtx, now);
        } else if (type === 'countdown_beep') {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
          osc.connect(gain);
          gain.connect(getAudioDestination());
          osc.start(now);
          osc.stop(now + 0.09);
        } else if (type === 'countdown_go') {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1760, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(gain);
          gain.connect(getAudioDestination());
          osc.start(now);
          osc.stop(now + 0.22);
        }
      } catch (e) { }
    }

    function playGunshotSynth(audioCtx, now) {
      const bufferSize = Math.floor(audioCtx.sampleRate * 0.12);
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.1);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(getAudioDestination());
      noise.start(now);

      const subOsc = audioCtx.createOscillator();
      const subGain = audioCtx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(150, now);
      subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      subGain.gain.setValueAtTime(0.25, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      subOsc.connect(subGain);
      subGain.connect(getAudioDestination());
      subOsc.start(now);
      subOsc.stop(now + 0.1);
    }

    function playHeadshotSynth(audioCtx, now) {
      [2200, 3300].forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.22);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(getAudioDestination());
        osc.start(now);
        osc.stop(now + 0.22);
      });
      playGunshotSynth(audioCtx, now);
    }

    function playYornSynth(audioCtx, now) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.45);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(getAudioDestination());
      osc.start(now);
      osc.stop(now + 0.45);

      const boing = audioCtx.createOscillator();
      const boingGain = audioCtx.createGain();
      boing.type = 'sine';
      boing.frequency.setValueAtTime(220, now + 0.45);
      boing.frequency.exponentialRampToValueAtTime(440, now + 0.55);
      boing.frequency.exponentialRampToValueAtTime(200, now + 0.7);
      boingGain.gain.setValueAtTime(0.12, now + 0.45);
      boingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      boing.connect(boingGain);
      boingGain.connect(getAudioDestination());
      boing.start(now + 0.45);
      boing.stop(now + 0.7);
    }

    function playTaek1Synth(audioCtx, now) {
      const click1 = audioCtx.createOscillator();
      const clickGain1 = audioCtx.createGain();
      click1.type = 'square';
      click1.frequency.setValueAtTime(1800, now);
      clickGain1.gain.setValueAtTime(0.15, now);
      clickGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      click1.connect(clickGain1);
      clickGain1.connect(getAudioDestination());
      click1.start(now);
      click1.stop(now + 0.05);

      const click2 = audioCtx.createOscillator();
      const clickGain2 = audioCtx.createGain();
      click2.type = 'square';
      click2.frequency.setValueAtTime(2200, now + 0.08);
      clickGain2.gain.setValueAtTime(0.18, now + 0.08);
      clickGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      click2.connect(clickGain2);
      clickGain2.connect(getAudioDestination());
      click2.start(now + 0.08);
      click2.stop(now + 0.13);

      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + 0.15 + i * 0.03);
        gain.gain.setValueAtTime(0.08, now + 0.15 + i * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(getAudioDestination());
        osc.start(now + 0.15 + i * 0.03);
        osc.stop(now + 0.45);
      });
    }

    function playVictorySynth(audioCtx, now) {
      const notes = [
        { f: 523.25, t: 0.0, d: 0.1 },
        { f: 659.25, t: 0.1, d: 0.1 },
        { f: 783.99, t: 0.2, d: 0.1 },
        { f: 1046.50, t: 0.3, d: 0.35 }
      ];
      notes.forEach(n => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        gain.gain.setValueAtTime(0.12, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
        osc.connect(gain);
        gain.connect(getAudioDestination());
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
      });
    }

    function playThanksSynth(audioCtx, now) {
      const chords = [659.25, 783.99, 987.77, 1318.51];
      chords.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.1, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);
        osc.connect(gain);
        gain.connect(getAudioDestination());
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.3);
      });
    }

    function playAlarmSynth(audioCtx, now) {
      for (let i = 0; i < 3; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        const t = now + i * 0.16;
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.linearRampToValueAtTime(587, t + 0.14);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1600;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(getAudioDestination());
        osc.start(t);
        osc.stop(t + 0.15);
      }
    }

    function playSpraySynth(audioCtx, now) {
      for (let i = 0; i < 5; i++) {
        playGunshotSynth(audioCtx, now + i * 0.09);
      }
    }

    function playSpikeSynth(audioCtx, now) {
      [0, 0.18].forEach(tOffset => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1760, now + tOffset);
        gain.gain.setValueAtTime(0.15, now + tOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + tOffset + 0.09);
        osc.connect(gain);
        gain.connect(getAudioDestination());
        osc.start(now + tOffset);
        osc.stop(now + tOffset + 0.09);
      });
    }

    function toggleSoundFx() {
      isSoundEnabled = !isSoundEnabled;
      safeStorage.setItem('dalines_sound', isSoundEnabled);
      if (isSoundEnabled && masterVolume === 0) {
        masterVolume = 0.8;
        safeStorage.setItem('dalines_master_volume', 0.8);
      }
      applyMasterVolume();
      updateSoundIcon();
      if (isSoundEnabled) {
        playSound('pop');
        showToast(translations[currentLang].toast_sound_on);
      } else {
        showToast(translations[currentLang].toast_sound_off);
      }
    }

    // -----------------------------------------------------------------
    // THEME CONTROLLER & EASTER EGG (CYBERPUNK GOLD)
    // -----------------------------------------------------------------
    let currentTheme = safeStorage.getItem('dalines_theme') || 'emerald';

    function setTheme(color, silent = false) {
      if (!['emerald', 'cyan', 'purple', 'gold'].includes(color)) color = 'emerald';
      currentTheme = color;
      if (color === 'emerald') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', color);
      }
      safeStorage.setItem('dalines_theme', color);

      document.querySelectorAll('.theme-color-dot').forEach(dot => {
        if (dot.getAttribute('data-color') === color) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
      if (!silent) playSound('theme');
    }

    function initGoldTheme() {
      const isGoldUnlocked = safeStorage.getItem('dalines_unlocked_gold') === 'true';
      const goldDot = document.getElementById('theme-dot-gold');
      if (goldDot && isGoldUnlocked) {
        goldDot.classList.remove('hidden');
      }
    }

    let profileClickCount = 0;
    let profileClickResetTimer = null;

    function handleProfileEasterEgg(e) {
      if (e) {
        e.stopPropagation();
      }

      profileClickCount++;
      triggerHaptic(15);
      playSound('pop');

      // Visual tap bounce on avatar
      const avatar = document.getElementById('profile-img') || document.getElementById('profile-container');
      if (avatar) {
        avatar.style.transition = 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        avatar.style.transform = `scale(1.15) rotate(${profileClickCount % 2 === 0 ? 8 : -8}deg)`;
        setTimeout(() => {
          if (avatar) avatar.style.transform = '';
        }, 150);
      }

      clearTimeout(profileClickResetTimer);

      if (profileClickCount >= 5) {
        profileClickCount = 0;
        triggerGoldEasterEgg();
      } else {
        profileClickResetTimer = setTimeout(() => {
          profileClickCount = 0;
        }, 2000);
      }
    }

    function triggerGoldEasterEgg() {
      triggerHaptic(40);
      playFanfareSound();
      triggerConfettiExplosion();

      safeStorage.setItem('dalines_unlocked_gold', 'true');
      const goldDot = document.getElementById('theme-dot-gold');
      if (goldDot) {
        goldDot.classList.remove('hidden');
        goldDot.classList.add('animate-bounce');
        setTimeout(() => goldDot.classList.remove('animate-bounce'), 1200);
      }

      setTheme('gold');
      showToast("🎉 ยินดีด้วย! คุณปลดล็อกธีมลับ DaLines Gold Edition สำเร็จ!");
    }

    function playFanfareSound() {
      if (!isSoundEnabled || masterVolume === 0) return;
      try {
        initAudio();
        const now = audioCtx.currentTime;
        const dest = getAudioDestination();

        const notes = [
          { f: 523.25, t: 0.00, d: 0.15 }, // C5
          { f: 659.25, t: 0.14, d: 0.15 }, // E5
          { f: 783.99, t: 0.28, d: 0.18 }, // G5
          { f: 1046.50, t: 0.46, d: 0.65 }, // C6
          { f: 1318.51, t: 0.50, d: 0.65 }, // E6
          { f: 1567.98, t: 0.54, d: 0.80 }  // G6
        ];

        notes.forEach(n => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          const startTime = now + n.t;
          osc.frequency.setValueAtTime(n.f, startTime);
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + n.d);
          osc.connect(gain);
          gain.connect(dest);
          osc.start(startTime);
          osc.stop(startTime + n.d);
        });

        for (let i = 0; i < 8; i++) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          const t = now + 0.45 + i * 0.06;
          osc.frequency.setValueAtTime(1760 + i * 180 + Math.random() * 100, t);
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          osc.connect(gain);
          gain.connect(dest);
          osc.start(t);
          osc.stop(t + 0.2);
        }
      } catch (e) {
        console.error('Fanfare audio error:', e);
      }
    }

    function triggerConfettiExplosion() {
      let canvas = document.getElementById('easter-egg-confetti-canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'easter-egg-confetti-canvas';
        canvas.style.position = 'fixed';
        canvas.style.inset = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '99999';
        document.body.appendChild(canvas);
      }

      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const colors = ['#facc15', '#eab308', '#fbbf24', '#fef08a', '#10b981', '#06b6d4', '#a855f7', '#f43f5e', '#ffffff'];
      const particles = [];
      const count = 140;

      const originX = canvas.width / 2;
      const originY = Math.min(canvas.height * 0.35, 280);

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 15 + 6;
        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 5,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 14,
          gravity: 0.25,
          opacity: 1,
          decay: Math.random() * 0.008 + 0.008,
          isCircle: Math.random() > 0.5
        });
      }

      let animId;
      const startTime = performance.now();

      function animate(now) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = 0;

        for (let p of particles) {
          if (p.opacity <= 0) continue;
          alive++;

          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.rotation += p.rotationSpeed;
          p.opacity -= p.decay;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;

          if (p.isCircle) {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          }

          ctx.restore();
        }

        if (alive > 0 && now - startTime < 4500) {
          animId = requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          cancelAnimationFrame(animId);
          if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
          }
        }
      }

      animId = requestAnimationFrame(animate);
    }

    const savedTheme = safeStorage.getItem('dalines_theme') || 'emerald';
    setTheme(savedTheme, true);
    initGoldTheme();

    function updateBannerHeight() {
      const banner = document.getElementById('sticky-live-banner');
      const h = (banner && banner.isConnected && banner.offsetHeight > 0 && window.getComputedStyle(banner).display !== 'none')
        ? `${banner.offsetHeight}px`
        : '0px';
      document.documentElement.style.setProperty('--banner-height', h);
    }

    function dismissLiveBanner() {
      const banner = document.getElementById('sticky-live-banner');
      if (banner) {
        banner.style.transform = 'translateY(-100%)';
        banner.style.opacity = '0';
        document.documentElement.style.setProperty('--banner-height', '0px');
        setTimeout(() => {
          banner.remove();
          updateBannerHeight();
        }, 300);
      }
      playSound('pop');
    }

    function scrollToTop() {
      playSound('pop');
      window.scrollTo({ top: 0, behavior: prefersQuietEffects() ? 'auto' : 'smooth' });
    }

    let backToTopVisible = false;
    let backToTopFrame = 0;
    window.addEventListener('scroll', () => {
      if (backToTopFrame) return;
      backToTopFrame = requestAnimationFrame(() => {
        backToTopFrame = 0;
        const visible = window.scrollY > 300;
        if (visible === backToTopVisible) return;
        backToTopVisible = visible;
        const button = document.getElementById('btn-back-to-top');
        if (!button) return;
        button.classList.toggle('opacity-0', !visible);
        button.classList.toggle('pointer-events-none', !visible);
        button.classList.toggle('opacity-100', visible);
      });
    }, { passive: true });

    const VALID_TABS = ['links', 'stream', 'pc', 'gear', 'rules'];

    function animateCounters(container) {
      if (!container) return;
      const counters = container.querySelectorAll('.counter-number');
      counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        const duration = 600;
        const start = 0;
        const startTime = performance.now();

        function updateCount(currentTime) {
          const progress = Math.min((currentTime - startTime) / duration, 1);
          const currentVal = Math.floor(progress * (target - start) + start);
          counter.innerText = currentVal;
          if (progress < 1) {
            requestAnimationFrame(updateCount);
          } else {
            counter.innerText = target;
          }
        }
        requestAnimationFrame(updateCount);
      });
    }

    const initializedTabs = new Set();
    function initializeTab(tab) {
      if (initializedTabs.has(tab)) return;
      initializedTabs.add(tab);
      if (tab === 'stream') { initClipsVault(); initEmoteShowcase(); initStreamCountdown(); }
      else if (tab === 'gear') { initSensCalculator(); initRouletteWheel(); initValorantTracker(); initAimChallenge(); }
      else if (tab === 'rules') { initObsTts(); initBotCommands(); }
    }

    function switchTab(tabId, updateUrl = true, playSoundEffect = true) {
      const targetTab = VALID_TABS.includes(tabId) ? tabId : 'links';
      initializeTab(targetTab);
      if (targetTab !== 'stream') stopStreamEmbeds();
      if (targetTab !== 'gear' && (isChallengeRunning || challengeCountdownTimer)) endAimChallenge(true);

      if (playSoundEffect) {
        playSound('tab');
      }

      const tabContents = document.querySelectorAll('.tab-content');
      tabContents.forEach(content => {
        if (content.id === `tab-${targetTab}`) {
          content.classList.add('active');
          content.hidden = false;
          if (targetTab === 'pc') {
            animateCounters(content);
          }
          if (targetTab === 'stream') {
            if (playSoundEffect || isTwitchPlayerLoaded) {
              loadTwitchPlayer(currentPlayerMode);
            }
          }
        } else {
          content.classList.remove('active');
          content.hidden = true;
        }
      });

      const tabButtons = document.querySelectorAll('.tab-btn');
      tabButtons.forEach(btn => {
        const selected = btn.getAttribute('data-tab') === targetTab;
        btn.setAttribute('aria-selected', String(selected));
        btn.tabIndex = selected ? 0 : -1;
        if (selected) {
          btn.className = 'tab-btn theme-active-btn py-2 sm:py-2.5 px-0.5 text-[11px] sm:text-xs rounded-xl transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5';
        } else {
          btn.className = 'tab-btn py-2 sm:py-2.5 px-0.5 text-[11px] sm:text-xs font-medium rounded-xl transition-all duration-200 text-slate-400 hover:text-white cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5';
        }
      });

      if (updateUrl) {
        const newHash = `#${targetTab}`;
        if (window.location.hash !== newHash) {
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', newHash);
          } else {
            window.location.hash = newHash;
          }
        }
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      setLanguage(currentLang);
      updateSoundIcon();
      updateVolumeUI();
      initGoldTheme();
      const profileImg = document.getElementById('profile-img');
      if (profileImg) {
        profileImg.addEventListener('click', handleProfileEasterEgg);
      }
      initCyberCanvas();
      setupModals();
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && (isChallengeRunning || challengeCountdownTimer)) endAimChallenge(true);
      });

      // Click outside to close volume dropdown
      document.addEventListener('click', (e) => {
        const wrapper = document.getElementById('volume-control-wrapper');
        const panel = document.getElementById('volume-dropdown-panel');
        if (panel && !panel.classList.contains('hidden')) {
          if (wrapper && !wrapper.contains(e.target)) {
            closeVolumeDropdown();
          }
        }
      });

      // Decorative work is bounded to one frame and respects motion/data preferences.
      const cursorGlow = document.getElementById('cursor-glow');
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (cursorGlow && finePointer && !prefersQuietEffects()) {
        let pointerFrame = 0;
        let pointerX = 0, pointerY = 0;
        window.addEventListener('pointermove', e => {
          pointerX = e.clientX; pointerY = e.clientY;
          if (!pointerFrame) pointerFrame = requestAnimationFrame(() => {
            pointerFrame = 0;
            cursorGlow.style.left = pointerX + 'px';
            cursorGlow.style.top = pointerY + 'px';
          });
        }, { passive: true });
      }
      if (finePointer && !prefersQuietEffects()) {
        document.querySelectorAll('.tilt-card').forEach(card => {
          let frame = 0;
          card.addEventListener('pointermove', e => {
            if (frame) cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
              frame = 0;
              const rect = card.getBoundingClientRect();
              if (!rect.width || !rect.height) return;
              const x = e.clientX - rect.left, y = e.clientY - rect.top;
              card.style.transform = 'perspective(800px) rotateX(' + ((y / rect.height - .5) * -10) + 'deg) rotateY(' + ((x / rect.width - .5) * 10) + 'deg) translateY(-2px)';
              card.style.setProperty('--mouse-x', (x / rect.width * 100) + '%');
              card.style.setProperty('--mouse-y', (y / rect.height * 100) + '%');
            });
          }, { passive: true });
          card.addEventListener('pointerleave', () => {
            cancelAnimationFrame(frame); frame = 0; card.style.transform = '';
          });
        });
      }
      // Sparkles Effect (Only on Interactive Elements: button, a, .tilt-card, .sound-card)
      // Listen to 'click' (instead of pointerdown) so scrolling/swiping on mobile never triggers unwanted sparkles
      document.addEventListener('click', (e) => {
        if (prefersQuietEffects()) return;
        const interactiveTarget = e.target && e.target.closest('button, a, .tilt-card, .sound-card, [role="button"]');
        if (!interactiveTarget) return;

        playSound('sparkle');

        const themeCol = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#10b981';
        const colors = [themeCol, '#ffffff', '#a855f7', '#38bdf8', '#fbbf24'];

        const rect = interactiveTarget.getBoundingClientRect();
        const x = (typeof e.clientX === 'number' && e.clientX > 0)
          ? e.clientX
          : (rect.left + rect.width / 2);
        const y = (typeof e.clientY === 'number' && e.clientY > 0)
          ? e.clientY
          : (rect.top + rect.height / 2);

        for (let i = 0; i < 4; i++) {
          const sparkle = document.createElement('div');
          sparkle.className = 'sparkle-particle';
          const size = Math.random() * 6 + 4;
          sparkle.style.width = `${size}px`;
          sparkle.style.height = `${size}px`;
          sparkle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          sparkle.style.boxShadow = `0 0 8px ${sparkle.style.backgroundColor}`;
          sparkle.style.left = `${x}px`;
          sparkle.style.top = `${y}px`;

          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 45 + 18;
          sparkle.style.setProperty('--tx', `${Math.cos(angle) * distance - 50}%`);
          sparkle.style.setProperty('--ty', `${Math.sin(angle) * distance - 50}%`);

          document.body.appendChild(sparkle);
          setTimeout(() => sparkle.remove(), 650);
        }
      }, true);

      // Accessible tabs retain the latest URL-hash and history behavior.
      const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
      tabButtons[0]?.parentElement?.setAttribute('role', 'tablist');
      tabButtons[0]?.parentElement?.setAttribute('aria-label', 'DaLines');
      tabButtons.forEach((button, index) => {
        const tab = button.dataset.tab;
        button.id ||= 'tab-button-' + tab;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', 'tab-' + tab);
        const panel = document.getElementById('tab-' + tab);
        if (panel) {
          panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', button.id);
          panel.tabIndex = 0; panel.hidden = !panel.classList.contains('active');
        }
        const selected = Boolean(panel?.classList.contains('active'));
        button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
        button.addEventListener('click', event => { event.preventDefault(); switchTab(tab, true, true); });
        button.addEventListener('keydown', event => {
          let next;
          if (event.key === 'ArrowRight') next = (index + 1) % tabButtons.length;
          else if (event.key === 'ArrowLeft') next = (index - 1 + tabButtons.length) % tabButtons.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = tabButtons.length - 1;
          else return;
          event.preventDefault(); switchTab(tabButtons[next].dataset.tab, true, true); tabButtons[next].focus();
        });
      });

      // Restore Tab from URL Hash on Initial Load & Refresh
      const initialTabHash = window.location.hash.replace('#', '').toLowerCase();
      switchTab(VALID_TABS.includes(initialTabHash) ? initialTabHash : 'links', false, false);

      // Sync Tab when Browser Back/Forward or Hash Changes
      window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '').toLowerCase();
        if (VALID_TABS.includes(hash)) {
          switchTab(hash, false, true);
        }
      });

      // Sticky Nav Banner Height Sync
      updateBannerHeight();
      window.addEventListener('resize', updateBannerHeight);

      // Share Button
      const shareBtn = document.getElementById('btn-share');
      if (shareBtn) {
        shareBtn.addEventListener('click', () => {
          playSound('pop');
          if (navigator.share) {
            navigator.share({
              title: 'DaLines | Profile Hub & Battle Station',
              url: window.location.href
            }).catch(() => { });
          } else {
            copyTextToClipboard(window.location.href, translations[currentLang].toast_copy_link);
          }
        });
      }

      // Real-time Twitch Status Check
      startLiveStatusPolling();
    });

    let currentLiveState = false;
    let twitchStatusKnown = false;
    let lastTwitchStatus = null;
    let liveStatusTimer = 0;
    let liveStatusRequest = null;
    let lastLiveStatusCheck = 0;
    function startLiveStatusPolling() {
      function refresh() {
        clearTimeout(liveStatusTimer);
        if (document.hidden || navigator.onLine === false) return;
        const remaining = 60000 - (Date.now() - lastLiveStatusCheck);
        if (remaining <= 0) checkTwitchLiveStatus();
        liveStatusTimer = setTimeout(refresh, Math.max(1000, remaining > 0 ? remaining : 60000));
      }
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { clearTimeout(liveStatusTimer); liveStatusRequest?.abort(); }
        else refresh();
      });
      window.addEventListener('offline', () => { clearTimeout(liveStatusTimer); liveStatusRequest?.abort(); });
      window.addEventListener('online', () => { lastLiveStatusCheck = 0; refresh(); });
      refresh();
    }

    function handleLiveBannerClick() {
      playSound('tab');
      if (currentLiveState) {
        switchToStreamTab('live');
      } else {
        switchToStreamTab('trailer');
      }
    }

    async function checkTwitchLiveStatus() {
      if (document.hidden || navigator.onLine === false || liveStatusRequest) return;
      const controller = new AbortController(); liveStatusRequest = controller;
      lastLiveStatusCheck = Date.now();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const [uptimeRes, gameRes] = await Promise.all([
          fetch('https://decapi.me/twitch/uptime/dalines', { signal: controller.signal }),
          fetch('https://decapi.me/twitch/game/dalines', { signal: controller.signal })
        ]);
        if (!uptimeRes.ok) throw new Error('Live status unavailable');
        const uptime = (await uptimeRes.text()).trim();
        const game = gameRes.ok ? (await gameRes.text()).trim() : '';

        if (!uptime || /error|not found|rate limit|too many|unknown/i.test(uptime)) throw new Error('Unconfirmed status');
        const hasDuration = /\d+\s*(?:days?|hours?|minutes?|seconds?)/i.test(uptime);
        if (!hasDuration && !/offline/i.test(uptime)) throw new Error('Unconfirmed status');
        const isLive = hasDuration && !/offline/i.test(uptime);
        currentLiveState = isLive;
        twitchStatusKnown = true;
        lastTwitchStatus = { isLive, uptime, game };
        document.dispatchEvent(new CustomEvent('dalines:live-status', { detail: lastTwitchStatus }));

        const liveDot = document.getElementById('live-dot');
        const textBadge = document.getElementById('live-text-badge');
        const bannerDesc = document.getElementById('live-banner-desc');
        const btnText = document.getElementById('live-banner-btn-text');
        const streamBadge = document.getElementById('player-status-badge');

        if (isLive) {
          currentPlayerMode = 'live';
          if (liveDot) liveDot.className = 'w-2.5 h-2.5 rounded-full bg-red-500 live-ping-dot';
          if (textBadge) {
            textBadge.className = 'font-gaming font-bold text-red-400 tracking-wider text-[11px] sm:text-xs';
            textBadge.innerText = '🔴 LIVE NOW';
          }
          if (bannerDesc) {
            const gameTxt = game ? ` • กำลังเล่น ${game}` : '';
            bannerDesc.innerText = `${gameTxt} (${uptime}) แวะมาเมาท์กันได้!`;
          }
          if (btnText) btnText.innerText = (currentLang === 'th') ? 'ชมไลฟ์สด' : 'Watch Live';
          if (streamBadge) {
            streamBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-gaming font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1';
            streamBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>STREAMING';
          }
          const streamTab = document.getElementById('tab-stream');
          if (streamTab && streamTab.classList.contains('active')) {
            if (isTwitchPlayerLoaded) {
              updateTwitchPlayer('live');
            }
          }
        } else {
          currentPlayerMode = 'trailer';
          if (liveDot) liveDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-500';
          if (textBadge) {
            textBadge.className = 'font-gaming font-bold text-slate-400 tracking-wider text-[11px] sm:text-xs';
            textBadge.innerText = 'OFFLINE';
          }
          if (bannerDesc) {
            bannerDesc.innerText = (currentLang === 'th')
              ? '• สตรีมเมอร์ออฟไลน์อยู่ • แวะดูคลิปย้อนหลังหรือคุยในดิสคอร์ดได้!'
              : '• Channel is currently offline • Check out highlights or join Discord!';
          }
          if (btnText) btnText.innerText = (currentLang === 'th') ? 'คลิปไฮไลท์' : 'Watch VOD';
          if (streamBadge) {
            streamBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-gaming font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1';
            streamBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>TRAILER VOD';
          }
        }
        updateBannerHeight();
      } catch (err) {
        document.dispatchEvent(new CustomEvent('dalines:live-status', { detail: { isLive: null } }));
      } finally {
        clearTimeout(timeout);
        if (liveStatusRequest === controller) liveStatusRequest = null;
      }
    }

    const VALORANT_CROSSHAIR = '0;p;0;c;1;s;1;P;c;7;t;6;o;1;d;1;z;6;a;0;f;0;m;1;0l;3;0o;7;0a;0;0f;0;1t;10;1l;3;1o;6;1a;0;1m;0;1e;0.338;A;c;7;t;6;o;1;d;1;z;6;a;0;m;1;0t;3;0l;3;0o;5;0a;0;0f;0;1t;10;1l;3;1o;3;1a;0;1m;0;1e;3;S;c;6;s;4;o;1';

    function copyValorantCrosshair() {
      playSound('pop');
      triggerHaptic(20);
      return copyTextToClipboard(VALORANT_CROSSHAIR, translations[currentLang].toast_copy_crosshair || 'คัดลอกโค้ดเป้า Valorant เรียบร้อย! 🎯');
    }

    let toastTimer = 0;
    function showToast(msg) {
      triggerHaptic(15);
      const toast = document.getElementById('toast');
      if (!toast) return;
      clearTimeout(toastTimer);
      toast.innerText = msg;
      toast.classList.remove('opacity-0', 'pointer-events-none');
      toastTimer = setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none');
      }, 2200);
    }

    function copyIGN() {
      playSound('pop');
      triggerHaptic(20);
      return copyTextToClipboard('DaLines#TTV', translations[currentLang].toast_copy_ign);
    }

    async function copyBankAccount() {
      playSound('pop');
      triggerHaptic(20);
      const accNumber = '6322170767';
      if (!await copyTextToClipboard(accNumber, translations[currentLang]?.toast_copy_bank || 'คัดลอกเลขบัญชี 6322170767 เรียบร้อย! 🏦')) return;

      const btn = document.getElementById('btn-copy-bank');
      if (btn) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check text-emerald-300"></i><span>คัดลอกแล้ว!</span>';
        btn.classList.add('bg-emerald-600', 'text-white');
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.classList.remove('bg-emerald-600', 'text-white');
        }, 1800);
      }


    }

    function fallbackCopyText(text) {
      return copyTextToClipboard(text, currentLang === 'en' ? 'Copied!' : 'คัดลอกแล้ว!');
    }

    function copyProSettingsSummary() {
      playSound('pop');
      triggerHaptic(20);
      const text = `DaLines Pro Settings (Valorant):
Mouse: ATK Ghost Ultimate
DPI: 800
In-Game Sens: 0.45
Scoped Sens: 1.00
eDPI: 360
Polling Rate: 1000Hz
Windows Sens: 6/11
Resolution: 2560x1440 (16:9) 165Hz
Crosshair: 0;p;0;c;1;s;1;P;c;7;t;6;o;1;d;1;z;6;a;0;f;0;m;1;0l;3;0o;7;0a;0;0f;0;1t;10;1l;3;1o;6;1a;0;1m;0;1e;0.338;A;c;7;t;6;o;1;d;1;z;6;a;0;m;1;0t;3;0l;3;0o;5;0a;0;0f;0;1t;10;1l;3;1o;3;1a;0;1m;0;1e;3;S;c;6;s;4;o;1`;
      return copyTextToClipboard(text, translations[currentLang].toast_copy_pro_settings || 'คัดลอกค่า Setting Valorant ครบทุกตัวเลขเรียบร้อย! 🖱️');
    }

    function toggleObsStreamerPanel() {
      playSound('pop');
      const panel = document.getElementById('obs-panel-wrapper');
      const btn = document.getElementById('btn-toggle-obs-panel');
      if (!panel) return;
      const isHidden = panel.classList.contains('hidden');
      if (isHidden) {
        panel.classList.remove('hidden');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-up"></i><span>' + (currentLang === 'th' ? 'ซ่อนแผง OBS' : 'Hide OBS Panel') + '</span>';
      } else {
        panel.classList.add('hidden');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-sliders"></i><span>' + (currentLang === 'th' ? '⚙️ สำหรับสตรีมเมอร์ (OBS Sync)' : '⚙️ Streamer Tools (OBS Sync)') + '</span>';
      }
    }

    // -----------------------------------------------------------------
    // VALORANT CROSSHAIR SIMULATOR & 10s REFLEX AIM CHALLENGE
    // -----------------------------------------------------------------
    let aimMode = 'free'; // 'free' หรือ 'challenge'
    let isChallengeRunning = false;
    let challengeTimer = 10.0;
    let challengeInterval = null;
    let challengeCountdownTimer = 0;
    let challengeScore = 0;
    let challengeTotalShots = 0;
    let challengeTargetSpawnTime = 0;
    let challengeReactionTimes = [];
    let challengeHighScore = Math.max(0, parseInt(safeStorage.getItem('dalines_aim_highscore') || '0', 10) || 0);
    let crosshairHits = 0;
    let crosshairHeadshots = 0;

    function initAimChallenge() {
      const hsEl = document.getElementById('val-aim-highscore');
      if (hsEl) hsEl.innerText = challengeHighScore;
    }

    function setAimMode(mode) {
      aimMode = mode;
      playSound('tab');

      const btnFree = document.getElementById('btn-aim-mode-free');
      const btnChallenge = document.getElementById('btn-aim-mode-challenge');
      const freeBg = document.getElementById('free-mode-bg');
      const freeHudTop = document.getElementById('free-hud-top');
      const freeHudBottom = document.getElementById('free-hud-bottom');
      const challengeHud = document.getElementById('challenge-hud');
      const challengeStartCard = document.getElementById('challenge-start-card');
      const challengeTarget = document.getElementById('challenge-target');
      const challengeProgressBar = document.getElementById('challenge-progress-bar-wrap');

      if (mode === 'free') {
        if (isChallengeRunning || challengeCountdownTimer) endAimChallenge(true); // silent abort
        if (btnFree) btnFree.className = 'px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-cyan-600 text-white shadow cursor-pointer';
        if (btnChallenge) btnChallenge.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1.5 cursor-pointer';

        if (freeBg) freeBg.classList.remove('hidden');
        if (freeHudTop) freeHudTop.classList.remove('hidden');
        if (freeHudBottom) freeHudBottom.classList.remove('hidden');
        if (challengeHud) challengeHud.classList.add('hidden');
        if (challengeStartCard) challengeStartCard.classList.add('hidden');
        if (challengeTarget) challengeTarget.classList.add('hidden');
        if (challengeProgressBar) challengeProgressBar.classList.add('hidden');
      } else {
        if (btnChallenge) btnChallenge.className = 'px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-amber-500 text-black shadow cursor-pointer';
        if (btnFree) btnFree.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1.5 cursor-pointer';

        if (freeBg) freeBg.classList.add('hidden');
        if (freeHudTop) freeHudTop.classList.add('hidden');
        if (freeHudBottom) freeHudBottom.classList.add('hidden');

        if (!isChallengeRunning) {
          if (challengeStartCard) challengeStartCard.classList.remove('hidden');
          if (challengeHud) challengeHud.classList.add('hidden');
          if (challengeTarget) challengeTarget.classList.add('hidden');
          if (challengeProgressBar) challengeProgressBar.classList.add('hidden');
        }
      }
    }

    function startAimChallenge() {
      if (isChallengeRunning || challengeCountdownTimer) return;
      closeAimResultModal();
      if (!isSoundEnabled) {
        isSoundEnabled = true;
        safeStorage.setItem('dalines_sound', true);
        updateSoundIcon();
      }

      const startCard = document.getElementById('challenge-start-card');
      const countdownOverlay = document.getElementById('challenge-countdown-overlay');
      const countdownNum = document.getElementById('challenge-countdown-number');
      if (startCard) startCard.classList.add('hidden');
      if (countdownOverlay) countdownOverlay.classList.remove('hidden');

      let count = 3;
      if (countdownNum) countdownNum.innerText = count;
      playSound('countdown_beep');

      challengeCountdownTimer = setInterval(() => {
        count--;
        if (count > 0) {
          if (countdownNum) {
            countdownNum.innerText = count;
            countdownNum.style.transform = 'scale(1.3)';
            setTimeout(() => { if (countdownNum) countdownNum.style.transform = 'scale(1)'; }, 150);
          }
          playSound('countdown_beep');
        } else if (count === 0) {
          if (countdownNum) {
            countdownNum.innerText = 'GO!';
            countdownNum.style.transform = 'scale(1.5)';
            countdownNum.style.color = '#10b981';
          }
          playSound('countdown_go');
        } else {
          clearInterval(challengeCountdownTimer);
          challengeCountdownTimer = 0;
          if (countdownOverlay) countdownOverlay.classList.add('hidden');
          if (countdownNum) {
            countdownNum.style.color = '#fbbf24';
            countdownNum.style.transform = 'scale(1)';
          }
          runAimChallengeGame();
        }
      }, 700);
    }

    function runAimChallengeGame() {
      isChallengeRunning = true;
      challengeScore = 0;
      challengeTotalShots = 0;
      challengeReactionTimes = [];
      challengeTimer = 10.0;

      const challengeHud = document.getElementById('challenge-hud');
      const progressBarWrap = document.getElementById('challenge-progress-bar-wrap');
      const progressBar = document.getElementById('challenge-progress-bar');
      const timerText = document.getElementById('challenge-timer-text');
      const scoreText = document.getElementById('challenge-score-text');
      const accText = document.getElementById('challenge-acc-text');
      const reactionText = document.getElementById('challenge-reaction-text');

      if (challengeHud) challengeHud.classList.remove('hidden');
      if (progressBarWrap) progressBarWrap.classList.remove('hidden');
      if (progressBar) progressBar.style.width = '100%';
      if (scoreText) scoreText.innerText = '0';
      if (accText) accText.innerText = '100%';
      if (reactionText) reactionText.innerText = '--';
      if (timerText) timerText.innerText = '10.0s';

      spawnChallengeTarget();

      const startTime = Date.now();
      const totalDuration = 10000;

      clearInterval(challengeInterval);
      challengeInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remain = Math.max(0, (totalDuration - elapsed) / 1000);
        challengeTimer = remain;

        if (timerText) timerText.innerText = `${remain.toFixed(1)}s`;
        if (progressBar) {
          const pct = Math.max(0, (remain / 10) * 100);
          progressBar.style.width = `${pct}%`;
        }

        if (remain <= 0) {
          clearInterval(challengeInterval);
          endAimChallenge(false);
        }
      }, 50);
    }

    function spawnChallengeTarget() {
      const stage = document.getElementById('crosshair-stage');
      const target = document.getElementById('challenge-target');
      if (!stage || !target) return;

      const stageRect = stage.getBoundingClientRect();
      const targetSize = 44;
      const margin = 26;

      const maxX = stageRect.width - targetSize - margin;
      const maxY = stageRect.height - targetSize - margin;

      const randX = Math.floor(margin + Math.random() * Math.max(20, maxX - margin));
      const randY = Math.floor(margin + Math.random() * Math.max(20, maxY - margin));

      target.style.left = `${randX}px`;
      target.style.top = `${randY}px`;
      target.classList.remove('hidden');

      target.style.transform = 'scale(0.3)';
      requestAnimationFrame(() => {
        target.style.transform = 'scale(1)';
      });

      challengeTargetSpawnTime = Date.now();
    }

    function hitChallengeTarget(e) {
      e.stopPropagation();
      if (!isChallengeRunning) return;

      triggerHaptic(30);

      challengeScore++;
      challengeTotalShots++;

      const rt = Math.max(50, Date.now() - challengeTargetSpawnTime);
      challengeReactionTimes.push(rt);

      playSound('headshot');

      // Update reticle recoil
      const reticle = document.getElementById('crosshair-reticle');
      if (reticle) {
        reticle.style.transform = 'scale(1.35)';
        setTimeout(() => { if (reticle) reticle.style.transform = 'scale(1)'; }, 80);
      }

      // Spark effect
      const stage = document.getElementById('crosshair-stage');
      const rect = stage.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      createBulletImpact(stage, clickX, clickY);

      // Floating hit text
      createFloatingHitText(stage, clickX, clickY, `+100 HEADSHOT (${rt}ms)`, '#fbbf24');

      // Update HUD
      updateChallengeHUD();

      // Spawn next target immediately
      spawnChallengeTarget();
    }

    function handleStageClick(e) {
      if (aimMode === 'free') {
        fireCrosshair(e);
      } else if (aimMode === 'challenge' && isChallengeRunning) {
        // Registered as a miss shot
        challengeTotalShots++;
        playSound('gunshot');

        const stage = document.getElementById('crosshair-stage');
        const reticle = document.getElementById('crosshair-reticle');
        if (reticle) {
          reticle.style.transform = 'scale(1.25)';
          setTimeout(() => { if (reticle) reticle.style.transform = 'scale(1)'; }, 80);
        }

        const rect = stage.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        createBulletImpact(stage, clickX, clickY);
        createFloatingHitText(stage, clickX, clickY, 'MISS 💨', '#94a3b8');

        updateChallengeHUD();
      }
    }

    function updateChallengeHUD() {
      const scoreText = document.getElementById('challenge-score-text');
      const accText = document.getElementById('challenge-acc-text');
      const reactionText = document.getElementById('challenge-reaction-text');

      if (scoreText) scoreText.innerText = challengeScore;
      if (accText) {
        const acc = Math.round((challengeScore / Math.max(1, challengeTotalShots)) * 100);
        accText.innerText = `${acc}%`;
      }
      if (reactionText && challengeReactionTimes.length > 0) {
        const avg = Math.round(challengeReactionTimes.reduce((a, b) => a + b, 0) / challengeReactionTimes.length);
        reactionText.innerText = `${avg}`;
      }
    }

    function createFloatingHitText(stage, x, y, text, color) {
      const floater = document.createElement('div');
      floater.className = 'absolute font-bold text-xs pointer-events-none transition-all duration-500 ease-out z-20 font-mono';
      floater.style.left = `${x - 30}px`;
      floater.style.top = `${y - 10}px`;
      floater.style.color = color;
      floater.style.textShadow = '0 0 6px rgba(0,0,0,0.9), 0 0 2px #000';
      floater.innerText = text;
      stage.appendChild(floater);

      requestAnimationFrame(() => {
        floater.style.transform = 'translateY(-26px) scale(1.15)';
        floater.style.opacity = '0';
      });
      setTimeout(() => floater.remove(), 550);
    }

    function endAimChallenge(silent = false) {
      isChallengeRunning = false;
      clearInterval(challengeInterval);
      clearInterval(challengeCountdownTimer);
      challengeCountdownTimer = 0;
      document.getElementById('challenge-countdown-overlay')?.classList.add('hidden');

      const target = document.getElementById('challenge-target');
      if (target) target.classList.add('hidden');

      const progressBarWrap = document.getElementById('challenge-progress-bar-wrap');
      if (progressBarWrap) progressBarWrap.classList.add('hidden');

      if (silent) {
        document.getElementById('challenge-hud')?.classList.add('hidden');
        if (aimMode === 'challenge') document.getElementById('challenge-start-card')?.classList.remove('hidden');
        return;
      }

      playSound('victory');

      const acc = Math.round((challengeScore / Math.max(1, challengeTotalShots)) * 100);
      const avgRt = challengeReactionTimes.length > 0
        ? Math.round(challengeReactionTimes.reduce((a, b) => a + b, 0) / challengeReactionTimes.length)
        : 0;

      // Tier & Quotes Calculation
      let tier = '';
      let quote = '';
      let icon = '🏆';
      if (challengeScore <= 5) {
        tier = '🤡 โยนสมชื่อ DaLines';
        quote = '"เป้าไม่ตรง โทษโต๊ะ โทษเน็ต โทษแผ่นรองเมาส์เอียง"';
        icon = '🤡';
      } else if (challengeScore <= 13) {
        tier = '🔫 คนยิงไม่โดน โทษเมาส์ (Silver/Gold)';
        quote = '"วอร์มมือก่อนลงแรงก์จริง ยิงโดนนกกระจอกตายไป 3 ตัว"';
        icon = '🔫';
      } else if (challengeScore <= 21) {
        tier = '⚡ คมจัดปลัดบอก (Ascendant)';
        quote = '"สะบัดหัวคมกริบ! เริ่มจะคมกว่าสตรีมเมอร์ตัวจริงแล้วนะเนี่ย"';
        icon = '⚡';
      } else {
        tier = '👑 Radiant ในตำนาน';
        quote = '"คมระดับพระกาฬ Aimbot ยังกราบ! แคปส่งเข้า Discord ด่วน สตรีมเมอร์ขอยอม!"';
        icon = '👑';
      }

      // Check New High Score
      const isNewRecord = challengeScore > challengeHighScore;
      if (isNewRecord) {
        challengeHighScore = challengeScore;
        safeStorage.setItem('dalines_aim_highscore', challengeHighScore);
        const hsEl = document.getElementById('val-aim-highscore');
        if (hsEl) hsEl.innerText = challengeHighScore;
      }

      // Send excitement to OBS if connected
      if (isObsConnected && obsConn && obsConn.open) {
        sendObsAction('hype', { amount: 20 });
      }

      // Populate Result Modal
      const modal = document.getElementById('modal-aim-result');
      const iconEl = document.getElementById('aim-result-icon');
      const newRecordBadge = document.getElementById('aim-new-record-badge');
      const titleEl = document.getElementById('aim-result-tier-title');
      const quoteEl = document.getElementById('aim-result-tier-quote');
      const scoreEl = document.getElementById('aim-result-score');
      const accEl = document.getElementById('aim-result-acc');
      const reactionEl = document.getElementById('aim-result-reaction');

      if (iconEl) iconEl.innerText = icon;
      if (newRecordBadge) {
        if (isNewRecord && challengeScore > 0) newRecordBadge.classList.remove('hidden');
        else newRecordBadge.classList.add('hidden');
      }
      if (titleEl) titleEl.innerText = tier;
      if (quoteEl) quoteEl.innerText = quote;
      if (scoreEl) scoreEl.innerText = `${challengeScore}`;
      if (accEl) accEl.innerText = `${acc}%`;
      if (reactionEl) reactionEl.innerText = `${avgRt}ms`;

      setModalOpen(modal, true);
    }

    function closeAimResultModal() {
      playSound('pop');
      const modal = document.getElementById('modal-aim-result');
      setModalOpen(modal, false);

      const startCard = document.getElementById('challenge-start-card');
      if (startCard && aimMode === 'challenge') {
        startCard.classList.remove('hidden');
      }
    }

    function copyAimResult() {
      playSound('pop');
      const acc = Math.round((challengeScore / Math.max(1, challengeTotalShots)) * 100);
      const avgRt = challengeReactionTimes.length > 0
        ? Math.round(challengeReactionTimes.reduce((a, b) => a + b, 0) / challengeReactionTimes.length)
        : 0;

      let tier = (challengeScore <= 5) ? '🤡 โยนสมชื่อ DaLines' : (challengeScore <= 13) ? '🔫 คนยิงไม่โดน โทษเมาส์' : (challengeScore <= 21) ? '⚡ คมจัดปลัดบอก (Ascendant)' : '👑 Radiant ในตำนาน';

      const shareText = `🎯 DaLines Aim Challenge: ฉันยิงได้ ${challengeScore} แต้ม! (ความแม่นยำ ${acc}%, เฉลี่ย ${avgRt}ms)\n🏆 อันดับ: ${tier}\n🎮 มาประลองความคมกันได้ที่: https://dalines-site.dalines.workers.dev/`;

      return copyTextToClipboard(shareText, 'คัดลอกผลคะแนนไปอวดแล้ว! 🏆');
    }

    function fireCrosshair(e) {
      if (!isSoundEnabled) {
        isSoundEnabled = true;
        safeStorage.setItem('dalines_sound', true);
        updateSoundIcon();
      }

      const stage = document.getElementById('crosshair-stage');
      const reticle = document.getElementById('crosshair-reticle');
      if (!stage) return;

      const rect = stage.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const dist = Math.hypot(clickX - centerX, clickY - centerY);

      // Recoil bloom animation on reticle
      if (reticle) {
        reticle.style.transform = 'scale(1.4)';
        setTimeout(() => {
          if (reticle) reticle.style.transform = 'scale(1)';
        }, 90);
      }

      // Spawn bullet spark & decal
      createBulletImpact(stage, clickX, clickY);

      crosshairHits++;
      const hitsEl = document.getElementById('ch-hits');
      if (hitsEl) hitsEl.innerText = crosshairHits;

      let dmgText = '';
      let dmgColor = '';
      if (dist <= 26) {
        crosshairHeadshots++;
        const hsEl = document.getElementById('ch-headshots');
        if (hsEl) hsEl.innerText = crosshairHeadshots;
        playSound('headshot');
        dmgText = 'HEADSHOT 160 🎯';
        dmgColor = '#fbbf24';
      } else if (dist <= 75) {
        playSound('gunshot');
        dmgText = 'BODY 40 💥';
        dmgColor = '#22d3ee';
      } else {
        playSound('gunshot');
        dmgText = 'MISS 💨';
        dmgColor = '#94a3b8';
      }

      // Floating damage indicator
      createFloatingHitText(stage, clickX, clickY, dmgText, dmgColor);
    }

    function createBulletImpact(stage, x, y) {
      const spark = document.createElement('div');
      spark.className = 'absolute rounded-full pointer-events-none z-10 transition-opacity duration-200';
      spark.style.left = `${x - 4}px`;
      spark.style.top = `${y - 4}px`;
      spark.style.width = '8px';
      spark.style.height = '8px';
      spark.style.backgroundColor = '#fbbf24';
      spark.style.boxShadow = '0 0 12px 4px #fbbf24, 0 0 4px #ffffff';
      stage.appendChild(spark);

      setTimeout(() => {
        spark.style.opacity = '0';
        setTimeout(() => spark.remove(), 150);
      }, 50);

      const hole = document.createElement('div');
      hole.className = 'absolute rounded-full bg-slate-900 border border-black/80 pointer-events-none transition-opacity duration-700 z-0';
      hole.style.left = `${x - 3}px`;
      hole.style.top = `${y - 3}px`;
      hole.style.width = '6px';
      hole.style.height = '6px';
      stage.appendChild(hole);

      setTimeout(() => {
        hole.style.opacity = '0';
        setTimeout(() => hole.remove(), 700);
      }, 2000);
    }

    // -----------------------------------------------------------------
    // OBS TTS LIVE SYNC & REMOTE SOUND ENGINE (WebRTC via PeerJS)
    // -----------------------------------------------------------------
    let obsPeer = null;
    let obsConn = null;
    let isObsConnected = false;
    let obsSounds = [];

    function initObsTts() {
      const savedRoom = safeStorage.getItem('dalines_tts_room') || 'tts_dalines';
      const input = document.getElementById('obs-room-code-input');
      if (input) {
        input.value = savedRoom;
      }
      // Connect only after an explicit user click; ordinary visitors do not need WebRTC.
    }

    function handleConnectObsClick() {
      if (isObsConnected) {
        disconnectObsTts();
        return;
      }
      const input = document.getElementById('obs-room-code-input');
      const code = input ? input.value.trim() : '';
      if (!code) {
        showToast('กรุณาระบุ Room Code จากหน้า TTS ก่อนครับ 📡');
        return;
      }
      connectToObsTts(code);
    }

    let peerScriptPromise = null;
    let obsConnectionAttempt = 0;
    function loadPeerLibrary() {
      if (typeof window.Peer === 'function') return Promise.resolve();
      if (peerScriptPromise) return peerScriptPromise;
      peerScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
        script.async = true;
        const timer = setTimeout(() => { script.remove(); reject(new Error('PeerJS load timed out')); }, 12000);
        script.onload = () => {
          clearTimeout(timer);
          if (typeof window.Peer === 'function') resolve();
          else { script.remove(); reject(new Error('PeerJS unavailable')); }
        };
        script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('PeerJS load failed')); };
        document.head.appendChild(script);
      }).catch(error => { peerScriptPromise = null; throw error; });
      return peerScriptPromise;
    }

    async function connectToObsTts(roomCode, isSilent = false) {
      if (!roomCode) return;
      roomCode = roomCode.trim();
      const attempt = ++obsConnectionAttempt;
      safeStorage.setItem('dalines_tts_room', roomCode);

      updateObsSyncStatus('connecting', 'CONNECTING...');

      if (obsPeer) {
        try { obsPeer.destroy(); } catch(e){}
      }

      try { await loadPeerLibrary(); } catch {
        if (attempt !== obsConnectionAttempt) return;
        updateObsSyncStatus('error', 'PEERJS ERROR');
        if (!isSilent) showToast('ไม่สามารถโหลดระบบเชื่อมต่อได้ กรุณาลองอีกครั้ง');
        return;
      }
      if (attempt !== obsConnectionAttempt) return;
      if (typeof Peer === 'undefined') {
        updateObsSyncStatus('error', 'PEERJS ERROR');
        if (!isSilent) showToast('ไม่สามารถโหลดไลบรารี PeerJS ได้');
        return;
      }

      try {
        const peer = new Peer();
        obsPeer = peer;
        const connectionTimeout = setTimeout(() => {
          if (peer !== obsPeer || attempt !== obsConnectionAttempt || isObsConnected) return;
          peer.destroy();
          updateObsSyncStatus('error', 'TIMEOUT');
          if (!isSilent) showToast('เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบรหัสห้องแล้วลองอีกครั้ง');
        }, 15000);
        peer.on('open', (myId) => {
          if (peer !== obsPeer || attempt !== obsConnectionAttempt) return;
          const conn = peer.connect(roomCode, { reliable: true });
          obsConn = conn;

          conn.on('open', () => {
            clearTimeout(connectionTimeout);
            if (peer !== obsPeer || attempt !== obsConnectionAttempt) return;
            isObsConnected = true;
            updateObsSyncStatus('connected', 'ONLINE');
            if (!isSilent) showToast('🟢 เชื่อมต่อกับ OBS TTS สำเร็จแล้ว!');
            playSound('thanks');

            // Request state to get custom soundboard
            conn.send({ action: 'REQUEST_STATE' });
          });

          conn.on('data', (data) => {
            if (peer !== obsPeer || attempt !== obsConnectionAttempt) return;
            if (data && data.type === 'STATE') {
              handleObsStateUpdate(data);
            }
          });

          conn.on('close', () => {
            if (peer !== obsPeer || attempt !== obsConnectionAttempt) return;
            isObsConnected = false;
            updateObsSyncStatus('disconnected', 'DISCONNECTED');
            showToast('📱 ตัดการเชื่อมต่อจาก OBS');
          });

          conn.on('error', (err) => {
            clearTimeout(connectionTimeout);
            if (peer !== obsPeer || attempt !== obsConnectionAttempt) return;
            isObsConnected = false;
            updateObsSyncStatus('error', 'FAILED');
            if (!isSilent) showToast('❌ ไม่สามารถเชื่อมต่อไปยังห้องนี้ได้ ตรวจสอบรหัสห้องอีกครั้ง');
          });
        });

        peer.on('error', (err) => {
          clearTimeout(connectionTimeout);
          if (peer !== obsPeer || attempt !== obsConnectionAttempt) return;
          isObsConnected = false;
          updateObsSyncStatus('error', 'OFFLINE');
          if (!isSilent) showToast('❌ ไม่พบห้อง OBS TTS รหัสนี้ในระบบ');
        });
      } catch(e) {
        updateObsSyncStatus('error', 'ERROR');
      }
    }

    function disconnectObsTts() {
      obsConnectionAttempt++;
      if (obsConn) {
        try { obsConn.close(); } catch(e){}
      }
      if (obsPeer) {
        try { obsPeer.destroy(); } catch(e){}
      }
      isObsConnected = false;
      updateObsSyncStatus('disconnected', 'OFFLINE');
      showToast('ตัดการเชื่อมต่อจาก OBS แล้ว');
    }

    function updateObsSyncStatus(status, text) {
      const badge = document.getElementById('obs-sync-badge');
      const dot = document.getElementById('obs-sync-dot');
      const statusText = document.getElementById('obs-sync-status-text');
      const btnText = document.getElementById('btn-connect-obs-text');
      const quickControls = document.getElementById('obs-quick-controls');

      if (status === 'connected') {
        if (badge) badge.className = 'px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1';
        if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse';
        if (statusText) statusText.innerText = 'ONLINE';
        if (btnText) btnText.innerText = 'ตัดการเชื่อมต่อ';
        if (quickControls) quickControls.classList.remove('hidden');

        // Auto-reveal streamer panel if it was folded
        const obsWrapper = document.getElementById('obs-panel-wrapper');
        const toggleBtn = document.getElementById('btn-toggle-obs-panel');
        if (obsWrapper && obsWrapper.classList.contains('hidden')) {
          obsWrapper.classList.remove('hidden');
          if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i><span>' + (currentLang === 'th' ? 'ซ่อนแผง OBS' : 'Hide OBS Panel') + '</span>';
        }
      } else if (status === 'connecting') {
        if (badge) badge.className = 'px-2 py-0.5 rounded text-[10px] font-mono bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 flex items-center gap-1';
        if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping';
        if (statusText) statusText.innerText = text || 'CONNECTING...';
        if (btnText) btnText.innerText = 'กำลังเชื่อมต่อ...';
      } else {
        if (badge) badge.className = 'px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1';
        if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-slate-500';
        if (statusText) statusText.innerText = 'OFFLINE';
        if (btnText) btnText.innerText = 'เชื่อมต่อ OBS';
        if (quickControls) quickControls.classList.add('hidden');
        const customWrapper = document.getElementById('obs-custom-sounds-wrapper');
        if (customWrapper) customWrapper.classList.add('hidden');
      }
    }

    function sendObsAction(action, payload = {}) {
      if (!isObsConnected || !obsConn || !obsConn.open) {
        showToast('กรุณาเชื่อมต่อ OBS TTS ก่อนครับ 📡');
        return false;
      }
      try {
        const cmd = { action, ...payload };
        obsConn.send(cmd);
        playSound('pop');
        showToast(`📡 ส่งคำสั่ง "${action}" ไปยัง OBS สำเร็จ!`);
        return true;
      } catch (e) {
        showToast('❌ ไม่สามารถส่งคำสั่งไปยัง OBS ได้');
        return false;
      }
    }

    function handleObsStateUpdate(state) {
      if (state.sounds && Array.isArray(state.sounds)) {
        obsSounds = state.sounds;
        renderObsCustomSounds(obsSounds);
      }
      const muteBtn = document.getElementById('obs-btn-mute');
      if (muteBtn && state.isMuted !== undefined) {
        if (state.isMuted) {
          muteBtn.className = 'px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer';
          muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> Muted (เปิดเสียง)';
        } else {
          muteBtn.className = 'px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-[10px] font-medium transition cursor-pointer flex items-center gap-1';
          muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Mute/Unmute';
        }
      }
    }

    function renderObsCustomSounds(sounds) {
      const wrapper = document.getElementById('obs-custom-sounds-wrapper');
      const grid = document.getElementById('obs-custom-sounds-grid');
      if (!wrapper || !grid) return;
      const validSounds = Array.isArray(sounds) ? sounds.filter(sound => sound && (typeof sound.id === 'string' || typeof sound.id === 'number') && typeof sound.name === 'string').slice(0, 100) : [];
      wrapper.classList.toggle('hidden', !validSounds.length);
      grid.replaceChildren();
      const fragment = document.createDocumentFragment();
      validSounds.forEach(sound => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'p-2 rounded-lg bg-slate-900/90 hover:bg-cyan-950/50 border border-cyan-500/30 hover:border-cyan-400 text-left active:scale-95 transition cursor-pointer flex items-center gap-1.5 shadow-sm overflow-hidden group';
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-volume-high text-cyan-400 text-[10px]';
        icon.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.className = 'text-[10px] font-medium text-slate-300 truncate';
        label.textContent = sound.name.slice(0, 200);
        button.append(icon, label);
        button.addEventListener('click', () => playObsSoundDirect(sound.id, sound.name));
        fragment.appendChild(button);
      });
      grid.appendChild(fragment);
    }

    function playObsSoundDirect(soundId, soundName) {
      playSound('pop');
      if (sendObsAction('play_sound', { soundId, soundName })) {
        showToast(`▶ กำลังเล่น "${soundName}" ใน OBS สดๆ! 🔊`);
      }
    }

    const modalFocus = new WeakMap();
    let previousBodyOverflow = '';
    function setModalOpen(modal, open) {
      if (!modal) return;
      if (open) {
        modalFocus.set(modal, document.activeElement);
        previousBodyOverflow = document.body.style.overflow;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        const first = modal.querySelector('button, a[href], input, select, textarea, [tabindex="0"]');
        first?.focus({ preventScroll: true });
      } else {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = previousBodyOverflow;
        const previous = modalFocus.get(modal);
        if (previous?.isConnected) previous.focus({ preventScroll: true });
        modalFocus.delete(modal);
      }
    }
    function closeModalById(modalId) {
      if (modalId === 'modal-clip-player') closeClipModal();
      else if (modalId === 'modal-aim-result') closeAimResultModal();
      else if (modalId === 'modal-command-palette') closeCommandPalette();
      else closeTtsHelperModal();
    }
    function setupModals() {
      ['modal-tts-helper', 'modal-clip-player', 'modal-aim-result', 'modal-command-palette'].forEach(id => {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', 'true');
        modal.addEventListener('click', event => {
          if (event.target === modal) closeModalById(id);
        });
      });
      document.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          const paletteModal = document.getElementById('modal-command-palette');
          if (paletteModal && !paletteModal.classList.contains('hidden')) closeCommandPalette();
          else openCommandPalette();
          return;
        }
        const modal = ['modal-command-palette', 'modal-clip-player', 'modal-tts-helper', 'modal-aim-result']
          .map(id => document.getElementById(id))
          .find(el => el && !el.classList.contains('hidden'));
        if (!modal) return;
        if (modal.id === 'modal-command-palette') {
          if (event.key === 'ArrowDown') { event.preventDefault(); moveCommandPaletteSelection(1); return; }
          if (event.key === 'ArrowUp') { event.preventDefault(); moveCommandPaletteSelection(-1); return; }
          if (event.key === 'Enter' && document.activeElement?.id === 'cmd-palette-input') {
            event.preventDefault();
            executeActiveCommandPaletteItem();
            return;
          }
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          closeModalById(modal.id);
        } else if (event.key === 'Tab') {
          const controls = Array.from(modal.querySelectorAll('button, a[href], input, select, textarea, iframe, [tabindex="0"]')).filter(el => !el.disabled && !el.closest('.hidden'));
          if (!controls.length) { event.preventDefault(); return; }
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
            event.preventDefault(); last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
            event.preventDefault(); first.focus();
          }
        }
      });
    }
    function openTtsHelperModal() {
      playSound('pop');
      setModalOpen(document.getElementById('modal-tts-helper'), true);
    }
    function closeTtsHelperModal() {
      playSound('pop');
      setModalOpen(document.getElementById('modal-tts-helper'), false);
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escapeAttr(str) {
      if (!str) return '';
      return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // -----------------------------------------------------------------
    // DALINES SOUNDBOARD CONTROLLER & VOICE FX
    // -----------------------------------------------------------------
    function playMemeSound(type, phrase, btnEl) {
      triggerHaptic(20);
      if (!isSoundEnabled) {
        isSoundEnabled = true;
        safeStorage.setItem('dalines_sound', true);
        updateSoundIcon();
      }

      playSound(type);

      if (phrase) {
        speakThai(phrase);
      }

      // Live trigger to OBS TTS if connected
      if (isObsConnected && obsConn && obsConn.open) {
        const match = obsSounds.find(s => {
          const n = (s.name || '').toLowerCase();
          const kw = (s.keywords || '').toLowerCase();
          if (type === 'yorn' && (n.includes('โยน') || kw.includes('throw') || kw.includes('โยน'))) return true;
          if (type === 'headshot' && (n.includes('หัว') || n.includes('dink') || kw.includes('head') || kw.includes('dink'))) return true;
          if (type === 'taek1' && (n.includes('แตก') || kw.includes('แตก') || kw.includes('kill'))) return true;
          if (type === 'victory' && (n.includes('แชมป์') || n.includes('ชนะ') || kw.includes('win') || kw.includes('gg'))) return true;
          if (type === 'thanks' && (n.includes('ขอบคุณ') || kw.includes('thank'))) return true;
          if (type === 'alarm' && (n.includes('เตือน') || n.includes('ไซเรน') || kw.includes('alarm') || kw.includes('siren'))) return true;
          if (type === 'spray' && (n.includes('สเปรย์') || kw.includes('spray') || kw.includes('gun'))) return true;
          if (type === 'spike' && (n.includes('สไปค์') || kw.includes('spike') || kw.includes('bomb'))) return true;
          return false;
        });

        if (match) {
          sendObsAction('play_sound', { soundId: match.id, soundName: match.name });
          showToast(`📡 สั่งเล่น "${match.name}" ใน OBS สดแล้ว! 🔊`);
        } else {
          sendObsAction('hype', { amount: 15 });
          showToast(`📡 ส่งสัญญาณไปยัง OBS TTS สดๆ แล้ว! (Hype +15%)`);
        }
      }

      if (btnEl) {
        btnEl.classList.add('ring-2', 'ring-purple-400', 'scale-95');
        setTimeout(() => {
          btnEl.classList.remove('ring-2', 'ring-purple-400', 'scale-95');
        }, 220);
      }

      const eq = document.getElementById('soundboard-eq');
      if (eq) {
        const bars = eq.querySelectorAll('span');
        bars.forEach(b => {
          b.style.height = `${Math.random() * 12 + 4}px`;
        });
        setTimeout(() => {
          bars.forEach((b, i) => {
            b.style.height = ['6px', '12px', '8px', '14px'][i] || '8px';
          });
        }, 550);
      }

      const statusText = document.getElementById('soundboard-status-text');
      if (statusText) {
        const title = btnEl ? (btnEl.querySelector('.font-bold')?.innerText || type) : type;
        const obsNote = isObsConnected ? ' [OBS LIVE SYNC]' : '';
        statusText.innerText = `▶ กำลังเล่น: ${title}${obsNote} 🔊`;
        setTimeout(() => {
          if (statusText.innerText.includes(title)) {
            statusText.innerText = isObsConnected ? 'เชื่อมต่อ OBS แล้ว (พร้อมสั่งเสียง)' : 'พร้อมเล่นเสียง (Ready to play)';
          }
        }, 2200);
      }
    }

    function speakThai(phrase) {
      if (!('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(phrase);
        u.lang = 'th-TH';
        u.rate = 1.05;
        u.pitch = 1.05;
        u.volume = (isSoundEnabled && masterVolume > 0) ? masterVolume : 0;
        window.speechSynthesis.speak(u);
      } catch (e) { }
    }

    // -----------------------------------------------------------------
    // DALINES HALL OF FAME & HIGHLIGHTS VAULT (TWITCH CLIPS: range=all)
    // Source: https://www.twitch.tv/dalines/clips?range=all
    // -----------------------------------------------------------------
    const DALINES_CLIPS = [
      {
        id: "clip-1",
        title: "นัวอะไรขนาดนั้น (Valorant Clutch Moment)",
        category: "valorant",
        duration: "0:26",
        views: 216,
        initialLikes: 216,
        videoUrl: "https://www.twitch.tv/dalines/clip/ElegantEagerGoldfishAMPEnergyCherry-9uGytF396fyRA5xc",
        clipUrl: "https://www.twitch.tv/dalines/clip/ElegantEagerGoldfishAMPEnergyCherry-9uGytF396fyRA5xc",
        embedUrl: "https://clips.twitch.tv/embed?clip=ElegantEagerGoldfishAMPEnergyCherry-9uGytF396fyRA5xc",
        youtubeUrl: "",
        slug: "ElegantEagerGoldfishAMPEnergyCherry-9uGytF396fyRA5xc",
        curator: "DaLines",
        game: "VALORANT",
        badge: "👑 #1 ALL-TIME TOP",
        badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        thumbnailUrl: "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/a7fd0812-aabe-4df1-9c62-33f743f76411/landscape/thumb/thumb-0000000000-1920x1080.jpg"
      },
      {
        id: "clip-2",
        title: "Dancing : รถซื้อแกง",
        category: "other",
        duration: "0:24",
        views: 192,
        initialLikes: 192,
        videoUrl: "https://www.twitch.tv/dalines/clip/DifficultNiceGarageUncleNox",
        clipUrl: "https://www.twitch.tv/dalines/clip/DifficultNiceGarageUncleNox",
        embedUrl: "https://clips.twitch.tv/embed?clip/DifficultNiceGarageUncleNox",
        youtubeUrl: "",
        slug: "DifficultNiceGarageUncleNox",
        curator: "feixian1412",
        game: "Just Chatting",
        badge: "🥈 #2 TOP VIRAL",
        badgeClass: "bg-slate-400/20 text-slate-200 border-slate-400/40",
        thumbnailUrl: "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/f7f6701f-12bc-4972-8330-054b2c7ce6e8/landscape/thumb/thumb-0000000000-1280x720.jpg"
      },
      {
        id: "clip-3",
        title: "A clear? then go B (จังหวะอ่านเกมขาด)",
        category: "valorant",
        duration: "0:30",
        views: 172,
        initialLikes: 172,
        videoUrl: "https://www.twitch.tv/dalines/clip/RealChillyPancakeKeepo-XUD53z3NRrGzcqkB",
        clipUrl: "https://www.twitch.tv/dalines/clip/RealChillyPancakeKeepo-XUD53z3NRrGzcqkB",
        embedUrl: "https://clips.twitch.tv/embed?clip=RealChillyPancakeKeepo-XUD53z3NRrGzcqkB",
        youtubeUrl: "",
        slug: "RealChillyPancakeKeepo-XUD53z3NRrGzcqkB",
        curator: "DaLines",
        game: "VALORANT",
        badge: "🥉 #3 TOP HIGHLIGHT",
        badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/40",
        thumbnailUrl: "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/42467f1d-f0d1-4e95-9449-b7f6a84f18c7/landscape/thumb/thumb-0000000000-1920x1080.jpg"
      },
      {
        id: "clip-4",
        title: "โนเอลร้องเพลง (GTA V RP Moment)",
        category: "other",
        duration: "0:26",
        views: 145,
        initialLikes: 145,
        videoUrl: "https://www.twitch.tv/dalines/clip/BitterBraveTomatoEleGiggle-LCD4OrW4n4OP0N5Z",
        clipUrl: "https://www.twitch.tv/dalines/clip/BitterBraveTomatoEleGiggle-LCD4OrW4n4OP0N5Z",
        embedUrl: "https://clips.twitch.tv/embed?clip=BitterBraveTomatoEleGiggle-LCD4OrW4n4OP0N5Z",
        youtubeUrl: "",
        slug: "BitterBraveTomatoEleGiggle-LCD4OrW4n4OP0N5Z",
        curator: "DaLines",
        game: "Grand Theft Auto V",
        badge: "🚗 GTA V RP",
        badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        thumbnailUrl: "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/79fa3232-4084-4500-841a-62a6a2908872/landscape/thumb/thumb-0000000000-1920x1080.jpg"
      },
      {
        id: "clip-5",
        title: "Skip Valorant battle pass 50 tiers",
        category: "valorant",
        duration: "0:59",
        views: 119,
        initialLikes: 119,
        videoUrl: "https://www.twitch.tv/dalines/clip/EnchantingLaconicSparrowTheTarFu",
        clipUrl: "https://www.twitch.tv/dalines/clip/EnchantingLaconicSparrowTheTarFu",
        embedUrl: "https://clips.twitch.tv/embed?clip=EnchantingLaconicSparrowTheTarFu",
        youtubeUrl: "",
        slug: "EnchantingLaconicSparrowTheTarFu",
        curator: "Archuron",
        game: "VALORANT",
        badge: "🎯 VALORANT",
        badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        thumbnailUrl: "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/bac763d1-bca8-4134-be26-72ce11275692/landscape/thumb/thumb-0000000000-1920x1080.jpg"
      },
      {
        id: "clip-6",
        title: "360 stinger สะบัดยิงอย่างตึง",
        category: "valorant",
        duration: "0:28",
        views: 111,
        initialLikes: 111,
        videoUrl: "https://www.twitch.tv/dalines/clip/KnottyCuriousCattleHoneyBadger",
        clipUrl: "https://www.twitch.tv/dalines/clip/KnottyCuriousCattleHoneyBadger",
        embedUrl: "https://clips.twitch.tv/embed?clip=KnottyCuriousCattleHoneyBadger",
        youtubeUrl: "",
        slug: "KnottyCuriousCattleHoneyBadger",
        curator: "DaLines",
        game: "VALORANT",
        badge: "🎯 VALORANT",
        badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        thumbnailUrl: "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/ba2fdbe3-d147-49d5-bfa8-6bb6a71dc3c9/landscape/thumb/thumb-0000000000-1920x1080.jpg"
      }
    ];

    let currentClipFilter = 'all';

    function initClipsVault() {
      renderClips();
    }

    function renderClips() {
      const grid = document.getElementById('clips-grid');
      if (!grid) return;

      const likedMap = getLikedClips();
      const filtered = (currentClipFilter === 'all')
        ? DALINES_CLIPS
        : DALINES_CLIPS.filter(c => c.category === currentClipFilter);

      grid.innerHTML = filtered.map(clip => {
        const isLiked = !!likedMap[clip.id];
        const baseLikes = typeof clip.initialLikes === "number" ? clip.initialLikes : (clip.views || 100);
        const likes = baseLikes + (isLiked ? 1 : 0);
        const viewsCount = typeof clip.views === "number" ? clip.views : (clip.initialLikes || 0);
        return `
          <div class="tilt-card rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 transition-all duration-300 flex flex-col justify-between shadow-lg relative group overflow-hidden">
            <!-- Video Thumbnail with 16:9 aspect ratio and hover overlay -->
            <div role="button" tabindex="0" aria-label="${escapeHtml(clip.title)}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openClipModal('${clip.id}')}" class="relative w-full aspect-video bg-black/60 overflow-hidden cursor-pointer" onclick="openClipModal('${clip.id}')">
              <img src="${clip.thumbnailUrl}" alt="${escapeHtml(clip.title)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://static-cdn.jtvnw.net/ttv-static-metadata/twitch_logo3.jpg'">

              <!-- Gradient Overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 pointer-events-none"></div>

              <!-- Top Badges -->
              <div class="absolute top-2 left-2 flex items-center gap-1">
                <span class="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border backdrop-blur-md ${clip.badgeClass}">
                  ${clip.badge}
                </span>
              </div>

              <!-- Views Badge -->
              <div class="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/75 border border-white/10 text-[9px] font-mono text-purple-300 backdrop-blur-md flex items-center gap-1 shadow">
                <i class="fa-solid fa-eye text-[8px]"></i>
                <span>${viewsCount} views</span>
              </div>

              <!-- Center Play Icon -->
              <div class="absolute inset-0 flex items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity">
                <div class="w-10 h-10 rounded-full bg-[#9146FF]/90 group-hover:bg-[#9146FF] text-white flex items-center justify-center text-sm shadow-[0_0_20px_rgba(145,70,255,0.7)] group-hover:scale-110 transition-transform">
                  <i class="fa-solid fa-play ml-0.5 text-xs"></i>
                </div>
              </div>

              <!-- Duration Badge -->
              <div class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[9px] text-white border border-white/10">
                ${clip.duration}
              </div>
            </div>

            <!-- Content Area -->
            <div class="p-3 flex flex-col justify-between flex-grow gap-2">
              <div>
                <h4 class="text-xs font-bold text-white group-hover:text-purple-300 transition line-clamp-2 leading-snug cursor-pointer" onclick="openClipModal('${clip.id}')">
                  ${escapeHtml(clip.title)}
                </h4>
                <div class="text-[10px] text-slate-400 mt-1 flex items-center justify-between gap-1 font-mono">
                  <span class="truncate"><i class="fa-solid fa-user-pen text-[9px] text-purple-400 mr-1"></i>${escapeHtml(clip.curator)}</span>
                  <span class="text-slate-500 shrink-0 font-medium">${clip.game}</span>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5 text-xs">
                <button type="button" onclick="openClipModal('${clip.id}')" class="px-2.5 py-1.5 rounded-lg bg-[#9146FF]/30 hover:bg-[#9146FF] text-purple-200 hover:text-white border border-[#9146FF]/50 text-[10px] font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer shadow">
                  <i class="fa-solid fa-play text-[8px]"></i>
                  <span>ชมคลิป</span>
                </button>

                <div class="flex items-center gap-1">
                  <!-- Like Button -->
                  <button type="button" onclick="toggleClipLike('${clip.id}', event)" class="px-2 py-1 rounded-lg ${isLiked ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'bg-slate-800 text-slate-400 hover:text-pink-400'} text-[10px] font-mono transition flex items-center gap-1 cursor-pointer active:scale-90" title="ถูกใจคลิป">
                    <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart ${isLiked ? 'text-pink-400' : ''}"></i>
                    <span id="like-count-${clip.id}">${likes}</span>
                  </button>

                  <!-- Direct Link on Twitch -->
                  <a href="${clip.videoUrl || clip.clipUrl || '#'}" target="_blank" rel="noopener noreferrer" class="p-1.5 rounded-lg bg-slate-800 hover:bg-[#9146FF]/40 text-slate-400 hover:text-white text-[10px] transition cursor-pointer" title="เปิดดูบน Twitch">
                    <i class="fa-brands fa-twitch"></i>
                  </a>

                  <!-- Share Link Button -->
                  <button type="button" onclick="shareClip('${clip.id}', event)" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] transition cursor-pointer" title="แชร์คลิป">
                    <i class="fa-solid fa-share-nodes"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function filterClips(cat, btn) {
      currentClipFilter = cat;
      playSound('tab');
      document.querySelectorAll('.clip-filter-btn').forEach(b => {
        b.className = 'clip-filter-btn px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white font-medium transition active:scale-95 cursor-pointer shrink-0';
      });
      if (btn) {
        btn.className = 'clip-filter-btn px-2.5 py-1 rounded-lg bg-[#9146FF] text-white font-bold transition active:scale-95 shadow cursor-pointer shrink-0';
      }
      renderClips();
    }

    function toggleClipLike(clipId, e) {
      e.stopPropagation();
      playSound('sparkle');
      const likedMap = getLikedClips();
      likedMap[clipId] = !likedMap[clipId];
      safeStorage.setItem('dalines_liked_clips', JSON.stringify(likedMap));
      renderClips();
      showToast(likedMap[clipId] ? '❤️ ขอบคุณที่กดถูกใจคลิปครับ!' : 'ยกเลิกการถูกใจแล้ว');
    }

    function openClipModal(clipId) {
      playSound('pop');
      const clip = DALINES_CLIPS.find(c => c.id === clipId);
      if (!clip) return;

      const modal = document.getElementById('modal-clip-player');
      const title = document.getElementById('clip-modal-title');
      const badge = document.getElementById('clip-modal-badge');
      const iframe = document.getElementById('clip-modal-iframe');
      const extLink = document.getElementById('clip-modal-ext-link');

      if (title) title.innerText = clip.title;
      if (badge) badge.innerText = `${(clip.game || 'VALORANT').toUpperCase()} • ${clip.duration || '0:30'} • BY ${(clip.curator || 'DaLines').toUpperCase()}`;

      // Resolve embed URL
      let embedSrc = clip.embedUrl || '';
      const parentQuery = getTwitchParentsQuery();

      if (!embedSrc) {
        if (clip.youtubeUrl) {
          const ytMatch = clip.youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
          if (ytMatch) {
            embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
          }
        } else if (clip.slug) {
          embedSrc = `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip.slug)}&${parentQuery}&autoplay=true`;
        } else if (clip.videoUrl) {
          embedSrc = clip.videoUrl;
        }
      } else if (embedSrc.includes('twitch.tv/embed') || embedSrc.includes('clips.twitch.tv')) {
        if (!embedSrc.includes('parent=')) {
          embedSrc += (embedSrc.includes('?') ? '&' : '?') + parentQuery;
        }
        if (!embedSrc.includes('autoplay=')) {
          embedSrc += '&autoplay=true';
        }
      }

      if (iframe) iframe.src = embedSrc || 'about:blank';

      if (extLink) {
        const targetUrl = clip.youtubeUrl || clip.videoUrl || clip.clipUrl || (clip.slug ? `https://www.twitch.tv/dalines/clip/${clip.slug}` : 'https://www.twitch.tv/dalines');
        extLink.href = targetUrl;
        extLink.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i> <span>เปิดดูคลิปต้นฉบับ</span>`;
      }
      setModalOpen(modal, true);
    }

    function closeClipModal() {
      playSound('pop');
      const modal = document.getElementById('modal-clip-player');
      const iframe = document.getElementById('clip-modal-iframe');
      if (iframe) iframe.src = 'about:blank';
      setModalOpen(modal, false);
    }

    function shareClip(clipId, e) {
      if (e) e.stopPropagation();
      playSound('pop');
      const clip = DALINES_CLIPS.find(c => c.id === clipId);
      if (!clip) return;
      const targetUrl = clip.youtubeUrl || clip.videoUrl || clip.clipUrl || (clip.slug ? `https://www.twitch.tv/dalines/clip/${clip.slug}` : window.location.href);
      return copyTextToClipboard(`${clip.title} - ชมคลิป DaLines: ${targetUrl}`, 'คัดลอกลิงก์คลิปเรียบร้อย! 🎬');
    }

    // 🎮 FPS E-DPI CALCULATOR & CROSS-GAME SENSITIVITY CONVERTER
    // High-precision physical distance conversion (cm/360°)
    // -----------------------------------------------------------------
    const SENS_GAMES = {
      valorant: {
        key: 'valorant',
        name: 'VALORANT',
        tag: 'Riot Games',
        yaw: 0.07,
        sliderMax: 2.0,
        sliderStep: 0.01,
        defaultSens: 0.3,
        icon: 'fa-solid fa-crosshairs text-red-400',
        colorBorder: 'hover:border-red-500/50',
        bgBadge: 'bg-red-500/20 text-red-300 border-red-500/40',
        calcEdpi: (dpi, sens) => (dpi * sens).toFixed(1),
        formatSens: (sens) => sens.toFixed(3)
      },
      apex: {
        key: 'apex',
        name: 'Apex Legends',
        tag: 'EA / Respawn',
        yaw: 0.022,
        sliderMax: 6.0,
        sliderStep: 0.05,
        defaultSens: 1.8,
        icon: 'fa-solid fa-shield-halved text-amber-400',
        colorBorder: 'hover:border-amber-500/50',
        bgBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        calcEdpi: (dpi, sens) => Math.round(dpi * sens),
        formatSens: (sens) => sens.toFixed(3)
      },
      cs2: {
        key: 'cs2',
        name: 'Counter-Strike 2',
        tag: 'Valve',
        yaw: 0.022,
        sliderMax: 6.0,
        sliderStep: 0.05,
        defaultSens: 0.955,
        icon: 'fa-solid fa-gun text-yellow-400',
        colorBorder: 'hover:border-yellow-500/50',
        bgBadge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
        calcEdpi: (dpi, sens) => Math.round(dpi * sens),
        formatSens: (sens) => sens.toFixed(3)
      },
      deltaforce: {
        key: 'deltaforce',
        name: 'Delta Force',
        tag: 'TiMi / Tencent',
        yaw: 0.022,
        sliderMax: 6.0,
        sliderStep: 0.05,
        defaultSens: 0.955,
        icon: 'fa-solid fa-person-rifle text-emerald-400',
        colorBorder: 'hover:border-emerald-500/50',
        bgBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        calcEdpi: (dpi, sens) => Math.round(dpi * sens),
        formatSens: (sens) => sens.toFixed(3)
      },
      cod: {
        key: 'cod',
        name: 'CoD / Warzone',
        tag: 'Activision',
        yaw: 0.022,
        sliderMax: 20.0,
        sliderStep: 0.1,
        defaultSens: 0.95,
        icon: 'fa-solid fa-skull-crossbones text-cyan-400',
        colorBorder: 'hover:border-cyan-500/50',
        bgBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        calcEdpi: (dpi, sens) => Math.round(dpi * sens),
        formatSens: (sens) => sens.toFixed(2)
      },
      overwatch: {
        key: 'overwatch',
        name: 'Overwatch 2',
        tag: 'Blizzard',
        yaw: 0.0066,
        sliderMax: 20.0,
        sliderStep: 0.1,
        defaultSens: 3.18,
        icon: 'fa-solid fa-shield-cat text-orange-400',
        colorBorder: 'hover:border-orange-500/50',
        bgBadge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        calcEdpi: (dpi, sens) => Math.round(dpi * sens),
        formatSens: (sens) => sens.toFixed(2)
      },
      fortnite: {
        key: 'fortnite',
        name: 'Fortnite (X/Y)',
        tag: 'Epic Games',
        yaw: 0.005555555555555556,
        sliderMax: 30.0,
        sliderStep: 0.1,
        defaultSens: 3.78,
        icon: 'fa-solid fa-bolt text-indigo-400',
        colorBorder: 'hover:border-indigo-500/50',
        bgBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        calcEdpi: (dpi, sens) => (dpi * (sens / 100)).toFixed(1),
        formatSens: (sens) => sens.toFixed(2) + '%'
      },
      pubg: {
        key: 'pubg',
        name: 'PUBG',
        tag: 'Krafton',
        yaw: 0.002222222222222222,
        sliderMax: 100,
        sliderStep: 1,
        defaultSens: 9.5,
        icon: 'fa-solid fa-parachute-box text-stone-400',
        colorBorder: 'hover:border-stone-500/50',
        bgBadge: 'bg-stone-500/20 text-stone-300 border-stone-500/40',
        calcEdpi: (dpi, sens) => Math.round(dpi * sens),
        formatSens: (sens) => sens.toFixed(1)
      }
    };

    let currentSensDpi = 800;
    let currentBaseGame = 'valorant';
    let currentBaseSens = 0.3;

    function initSensCalculator() {
      updateSensCalculator();
    }

    function calculatePhysicalCm360(dpi, sens, yaw) {
      if (dpi <= 0 || sens <= 0 || yaw <= 0) return 0;
      return (360 * 2.54) / (dpi * sens * yaw);
    }

    function updateSensCalculator() {
      const baseGameConfig = SENS_GAMES[currentBaseGame] || SENS_GAMES.valorant;
      const cm360 = calculatePhysicalCm360(currentSensDpi, currentBaseSens, baseGameConfig.yaw);

      // 1. Update Header Displays
      const dpiDisplay = document.getElementById('dpi-display-val');
      if (dpiDisplay) dpiDisplay.innerText = `${currentSensDpi} DPI`;

      const baseSensDisplay = document.getElementById('base-sens-display');
      if (baseSensDisplay) baseSensDisplay.innerText = baseGameConfig.formatSens(currentBaseSens);

      // 2. Update Metric Banner
      const edpiVal = baseGameConfig.calcEdpi(currentSensDpi, currentBaseSens);
      const metricEdpi = document.getElementById('metric-edpi');
      if (metricEdpi) metricEdpi.innerText = edpiVal;

      const metricEdpiGame = document.getElementById('metric-edpi-game');
      if (metricEdpiGame) metricEdpiGame.innerText = baseGameConfig.name;

      const metricCm360 = document.getElementById('metric-cm360');
      if (metricCm360) metricCm360.innerText = (cm360 > 0) ? cm360.toFixed(1) : '--';

      // 3. Aiming Style Analysis
      const aimBadge = document.getElementById('metric-aim-badge');
      const aimDesc = document.getElementById('metric-aim-desc');
      if (aimBadge && aimDesc) {
        if (cm360 >= 45) {
          aimBadge.className = 'px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans';
          aimBadge.innerText = 'LOW SENS / ARM AIM 🦾';
          aimDesc.innerText = 'เล็งด้วยทั้งแขน สะบัดแม่นยำสูงสไตล์แทคติคอล แนะนำแผ่นรองเมาส์ Size L/XL (~45-50cm+)';
        } else if (cm360 >= 30) {
          aimBadge.className = 'px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-sans';
          aimBadge.innerText = 'MEDIUM / BALANCED ⚖️';
          aimDesc.innerText = 'สมดุลยอดนิยม เล็งผสมแขนและข้อมือ ตอบสนองได้ทุกแนวเกม แนะนำแผ่นรองเมาส์ Size M/L (~35-45cm)';
        } else if (cm360 >= 18) {
          aimBadge.className = 'px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-sans';
          aimBadge.innerText = 'HIGH SENS / WRIST AIM ⚡';
          aimDesc.innerText = 'เล็งด้วยข้อมือ คล่องตัวสูง หันมุมมองไวมาก เหมาะกับเกมไวอย่าง Apex/Overwatch (~25-35cm)';
        } else {
          aimBadge.className = 'px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 font-sans';
          aimBadge.innerText = 'ULTRA HIGH / FINGERTIP 🚀';
          aimDesc.innerText = 'ความไวสูงพิเศษ สะบัดนิดเดียวหมุน 360° ต้องใช้การคุมเมาส์ที่นิ่งมาก';
        }
      }

      // 4. Update Converted Games Grid
      const grid = document.getElementById('sens-results-grid');
      if (grid) {
        grid.innerHTML = Object.values(SENS_GAMES).map(game => {
          // targetSens = (360 * 2.54) / (cm360 * dpi * targetYaw)
          const targetSens = (cm360 > 0 && currentSensDpi > 0)
            ? (360 * 2.54) / (cm360 * currentSensDpi * game.yaw)
            : 0;

          const isCurrent = (game.key === currentBaseGame);
          const formattedSens = game.formatSens(targetSens);
          const rawSensVal = (game.key === 'fortnite') ? targetSens.toFixed(2) : targetSens.toFixed(3);
          const gameEdpi = game.calcEdpi(currentSensDpi, targetSens);

          return `
            <div class="tilt-card p-2.5 rounded-xl bg-slate-900/90 border ${isCurrent ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-slate-800'} ${game.colorBorder} transition-all duration-200 flex flex-col justify-between gap-2 relative group overflow-hidden">
              <!-- Top Game Header -->
              <div class="flex items-center justify-between gap-1">
                <div class="flex items-center gap-1.5 min-w-0">
                  <i class="${game.icon} text-xs"></i>
                  <span class="text-[11px] font-bold text-white truncate">${game.name}</span>
                </div>
                <span class="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold ${game.bgBadge} shrink-0">
                  ${isCurrent ? 'BASE' : 'CONV'}
                </span>
              </div>

              <!-- Center Sens Numbers -->
              <div class="bg-black/60 rounded-lg p-2 border border-slate-800/80 flex flex-col items-center justify-center text-center">
                <div class="text-sm sm:text-base font-extrabold text-white font-mono tracking-tight group-hover:text-cyan-300 transition">
                  ${formattedSens}
                </div>
                <div class="text-[9px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                  <span>eDPI:</span>
                  <strong class="text-slate-200">${gameEdpi}</strong>
                </div>
              </div>

              <!-- Bottom Copy Button -->
              <button type="button" onclick="copySingleGameSens('${game.key}', '${rawSensVal}', event)" class="w-full py-1 px-2 rounded-lg bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white text-[10px] font-mono font-semibold transition flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow">
                <i class="fa-regular fa-copy text-[9px]"></i>
                <span>Copy Sens</span>
              </button>
            </div>
          `;
        }).join('');
      }
    }

    let sensUpdateFrame = 0;
    function scheduleSensUpdate() {
      if (sensUpdateFrame) return;
      sensUpdateFrame = requestAnimationFrame(() => { sensUpdateFrame = 0; updateSensCalculator(); });
    }

    function onDpiInputChange(val) {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        currentSensDpi = Math.min(Math.max(num, 100), 32000);
        updateQuickDpiButtons();
        scheduleSensUpdate();
      }
    }

    function setQuickDpi(dpi) {
      playSound('pop');
      currentSensDpi = dpi;
      const input = document.getElementById('sens-input-dpi');
      if (input) input.value = dpi;
      updateQuickDpiButtons();
      updateSensCalculator();
    }

    function updateQuickDpiButtons() {
      document.querySelectorAll('.quick-dpi-btn').forEach(btn => {
        const val = parseInt(btn.innerText, 10);
        if (val === currentSensDpi) {
          btn.className = 'quick-dpi-btn px-2 py-0.5 rounded bg-indigo-600 text-white font-bold transition cursor-pointer';
        } else {
          btn.className = 'quick-dpi-btn px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer';
        }
      });
    }

    function onBaseGameChange(gameKey) {
      playSound('tab');
      currentBaseGame = gameKey;
      const config = SENS_GAMES[gameKey] || SENS_GAMES.valorant;
      currentBaseSens = config.defaultSens;

      const sensInput = document.getElementById('sens-input-value');
      if (sensInput) sensInput.value = currentBaseSens;

      const slider = document.getElementById('sens-slider');
      if (slider) {
        slider.max = config.sliderMax;
        slider.step = config.sliderStep;
        slider.value = currentBaseSens;
      }

      updateSensCalculator();
    }

    function onSensInputChange(val) {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        currentBaseSens = num;
        const slider = document.getElementById('sens-slider');
        if (slider) slider.value = num;
        scheduleSensUpdate();
      }
    }

    function onSensSliderChange(val) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        currentBaseSens = num;
        const sensInput = document.getElementById('sens-input-value');
        if (sensInput) sensInput.value = num;
        scheduleSensUpdate();
      }
    }

    function loadDaLinesSensPreset(gameKey) {
      playSound('sparkle');
      currentSensDpi = 800;
      const dpiInput = document.getElementById('sens-input-dpi');
      if (dpiInput) dpiInput.value = 800;
      updateQuickDpiButtons();

      currentBaseGame = gameKey;
      const gameSelect = document.getElementById('sens-select-game');
      if (gameSelect) gameSelect.value = gameKey;

      const config = SENS_GAMES[gameKey];
      currentBaseSens = (gameKey === 'valorant') ? 0.45 : 1.8;

      const sensInput = document.getElementById('sens-input-value');
      if (sensInput) sensInput.value = currentBaseSens;

      const slider = document.getElementById('sens-slider');
      if (slider) {
        slider.max = config.sliderMax;
        slider.step = config.sliderStep;
        slider.value = currentBaseSens;
      }

      updateSensCalculator();
      showToast(`⚡ โหลดค่า DaLines ${config.name} (800 DPI • ${currentBaseSens}) เรียบร้อย!`);
    }

    function copySingleGameSens(gameKey, rawSens, e) {
      if (e) e.stopPropagation();
      playSound('pop');
      const game = SENS_GAMES[gameKey];
      if (!game) return;
      return copyTextToClipboard(rawSens, `คัดลอก ${game.name} Sens: ${rawSens} เรียบร้อย! 🎯`);
    }

    function copyAllSensSummary() {
      playSound('pop');
      const baseConfig = SENS_GAMES[currentBaseGame];
      const cm360 = calculatePhysicalCm360(currentSensDpi, currentBaseSens, baseConfig.yaw);

      let text = `🎯 DaLines Sens Calculator Result\n`;
      text += `DPI: ${currentSensDpi} | Distance: ${cm360.toFixed(1)} cm/360°\n`;
      text += `Base: ${baseConfig.name} (${baseConfig.formatSens(currentBaseSens)})\n\n`;

      for (const game of Object.values(SENS_GAMES)) {
        const targetSens = (360 * 2.54) / (cm360 * currentSensDpi * game.yaw);
        text += `• ${game.name}: ${game.formatSens(targetSens)} (eDPI ${game.calcEdpi(currentSensDpi, targetSens)})\n`;
      }
      text += `\nคำนวณสดจาก: ${window.location.origin}`;

      return copyTextToClipboard(text, 'คัดลอกตารางสรุปทุกเกมเรียบร้อย! 📋');
    }

    // -----------------------------------------------------------------
    // 🎯 VALORANT ESPORTS CAREER & LIVE MATCH TRACKER
    // -----------------------------------------------------------------
    const DALINES_VALORANT_BASELINE = {
      riotId: "DaLines#TTV",
      region: "ap",
      currentTier: "Diamond 1",
      tierColor: "#a855f7",
      currentRR: 31,
      peakRank: "Immortal 1 34RR (Ep 7: Act III)",
      streak: "🔥 11W - 9L (55%)",
      stats: {
        kd: "1.08",
        hs: "26.4%",
        winrate: "55.0%",
        acs: "218.5",
        adr: "148.0",
        kpr: "0.78",
        firstBloods: "48",
        clutchRate: "16.5%"
      },
      agents: [
        { name: "Sova", role: "Initiator", pickRate: "769 hrs", kd: "1.03", winRate: "53%", initial: "S", color: "sky" },
        { name: "Jett", role: "Duelist", pickRate: "399 hrs", kd: "1.15", winRate: "52%", initial: "J", color: "cyan" },
        { name: "Killjoy", role: "Sentinel", pickRate: "308 hrs", kd: "1.10", winRate: "54%", initial: "K", color: "amber" }
      ],
      recentMatches: [
        { map: "5h ago", result: "VICTORY", score: "13 - 11", agent: "Sova", role: "Initiator", kda: "KD 1.8", kd: "1.80", acs: 235, rrChange: "+19", mvp: false },
        { map: "6h ago", result: "DEFEAT", score: "10 - 13", agent: "Sova", role: "Initiator", kda: "KD 1.2", kd: "1.20", acs: 215, rrChange: "-14", mvp: false },
        { map: "7h ago", result: "VICTORY", score: "13 - 8", agent: "Sova", role: "Initiator", kda: "KD 0.7", kd: "0.70", acs: 180, rrChange: "+18", mvp: false },
        { map: "7h ago", result: "VICTORY", score: "13 - 3", agent: "Sova", role: "Initiator", kda: "KD 1.7", kd: "1.70", acs: 260, rrChange: "+24", mvp: true },
        { map: "11h ago", result: "DEFEAT", score: "2 - 13", agent: "Chamber", role: "Sentinel", kda: "KD 1.1", kd: "1.10", acs: 195, rrChange: "-16", mvp: false }
      ]
    };

    let valTrackerData = { ...DALINES_VALORANT_BASELINE };

    function initValorantTracker() {
      try {
        const cachedStr = safeStorage.getItem('dalines_val_tracker_cache_v2');
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr);
          if (parsed && parsed.timestamp && (Date.now() - parsed.timestamp < 1000 * 60 * 15)) {
            valTrackerData = { ...DALINES_VALORANT_BASELINE, ...parsed.data };
            updateValorantTrackerDOM(valTrackerData);
            setTrackerSyncStatus(true, 'LIVE SYNC');
            return;
          }
        }
      } catch (e) {
        console.warn('Tracker cache load error:', e);
      }
      updateValorantTrackerDOM(valTrackerData);
      setTrackerSyncStatus(false, 'OFFICIAL CACHE');
    }

    function setTrackerSyncStatus(isLive, labelText) {
      const badge = document.getElementById('tracker-sync-badge');
      const text = document.getElementById('tracker-sync-status-text');
      const time = document.getElementById('tracker-last-sync-time');
      if (badge && text) {
        if (isLive) {
          badge.className = 'px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1';
          text.innerText = labelText || 'LIVE SYNC';
        } else {
          badge.className = 'px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1';
          text.innerText = labelText || 'OFFICIAL CACHE';
        }
      }
      if (time) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} น.`;
        time.innerText = timeStr;
      }
    }

    function updateValorantTrackerDOM(data) {
      if (!data) return;

      if (data.currentTier) {
        applyValorantTierTheme(data.currentTier);
      }

      const rankTitle = document.getElementById('tracker-rank-title');
      if (rankTitle && data.currentTier) rankTitle.innerText = data.currentTier.toUpperCase();

      const rrCur = document.getElementById('tracker-rr-current');
      if (rrCur && data.currentRR !== undefined) rrCur.innerText = data.currentRR;

      const rrPercent = document.getElementById('tracker-rr-percent');
      if (rrPercent && data.currentRR !== undefined) rrPercent.innerText = `${data.currentRR}%`;

      const rrBar = document.getElementById('tracker-rr-bar');
      if (rrBar && data.currentRR !== undefined) rrBar.style.width = `${Math.min(100, Math.max(0, data.currentRR))}%`;

      const peak = document.getElementById('tracker-peak-val');
      if (peak && data.peakRank) peak.innerText = data.peakRank;

      if (data.stats) {
        const kd = document.getElementById('tracker-stat-kd');
        if (kd && data.stats.kd) kd.innerText = data.stats.kd;

        const hs = document.getElementById('tracker-stat-hs');
        if (hs && data.stats.hs) hs.innerText = data.stats.hs;

        const wr = document.getElementById('tracker-stat-winrate');
        if (wr && data.stats.winrate) wr.innerText = data.stats.winrate;

        const acs = document.getElementById('tracker-stat-acs');
        if (acs && data.stats.acs) acs.innerText = data.stats.acs;

        const adr = document.getElementById('tracker-stat-adr');
        if (adr && data.stats.adr) adr.innerText = data.stats.adr;

        const kpr = document.getElementById('tracker-stat-kpr');
        if (kpr && data.stats.kpr) kpr.innerText = data.stats.kpr;

        const fb = document.getElementById('tracker-stat-fb');
        if (fb && data.stats.firstBloods) fb.innerText = data.stats.firstBloods;

        const clutch = document.getElementById('tracker-stat-clutch');
        if (clutch && data.stats.clutchRate) clutch.innerText = data.stats.clutchRate;
      }
    }

    let valorantTrackerRefreshing = false;
    async function refreshValorantTracker(manual = false) {
      if (valorantTrackerRefreshing) return;
      valorantTrackerRefreshing = true;
      try {
      if (manual) {
        playSound('sparkle');
        triggerHaptic(25);
      }

      const icon = document.getElementById('tracker-refresh-icon');
      if (icon) icon.classList.add('animate-spin');

      let liveSuccess = false;
      const apiEndpoints = [
        '/api/valorant',
        'https://dalines-site.dalines.workers.dev/api/valorant'
      ];

      for (const endpoint of apiEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const res = await fetch(endpoint, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const json = await res.json();
            const payload = json && (json.data || json);
            if (payload && (payload.currentTier || payload.stats)) {
              if (payload.currentTier) valTrackerData.currentTier = payload.currentTier;
              if (payload.currentRR !== undefined) valTrackerData.currentRR = payload.currentRR;
              if (payload.peakRank) valTrackerData.peakRank = payload.peakRank;
              if (payload.streak) valTrackerData.streak = payload.streak;
              if (payload.stats) {
                valTrackerData.stats = { ...valTrackerData.stats, ...payload.stats };
              }
              if (payload.agents && Array.isArray(payload.agents)) {
                valTrackerData.agents = payload.agents;
              }
              if (payload.recentMatches && Array.isArray(payload.recentMatches)) {
                valTrackerData.recentMatches = payload.recentMatches;
              }
              liveSuccess = true;
              break;
            }
          }
        } catch (err) {
          // Continue to next endpoint or graceful fallback
        }
      }

      // Update LocalStorage cache
      try {
        safeStorage.setItem('dalines_val_tracker_cache_v2', JSON.stringify({
          timestamp: Date.now(),
          data: valTrackerData
        }));
      } catch (e) { }

      updateValorantTrackerDOM(valTrackerData);
      setTrackerSyncStatus(liveSuccess, liveSuccess ? 'DIRECT API LIVE' : 'OFFICIAL CACHE');

      setTimeout(() => {
        if (icon) icon.classList.remove('animate-spin');
        if (manual) {
          const toastMsg = liveSuccess
            ? (translations[currentLang].toast_tracker_synced || 'ซิงค์สถิติ Valorant สดสำเร็จ! 🎯')
            : 'ซิงค์ข้อมูลสถิติเรียบร้อย (Official Cache) ⚡';
          showToast(toastMsg);
        }
      }, 500);

      } finally { valorantTrackerRefreshing = false; }
    }


    function copyTrackerRiotId() {
      playSound('pop');
      triggerHaptic(20);
      return copyTextToClipboard('DaLines#TTV', translations[currentLang].toast_copy_riot_id || 'คัดลอก Riot ID: DaLines#TTV เรียบร้อย! 🎮');
    }

    // -----------------------------------------------------------------
    // 🔍 VALORANT LIVE PLAYER SEARCH & RANK THEME ENGINE
    // -----------------------------------------------------------------
    function applyValorantTierTheme(tierName) {
      const t = (tierName || '').toLowerCase();
      let theme = {
        titleClass: 'text-purple-300',
        boxBorder: 'border-purple-400/50',
        boxShadow: '0 0 20px rgba(168,85,247,0.35)',
        grad0: '#c084fc', grad50: '#7c3aed', grad100: '#4c1d95',
        strokeOuter: '#c084fc', strokeMid: '#a855f7', fillMid: '#2e1065',
        inner0: '#a855f7', inner100: '#581c87', core: '#f5d0fe',
        barGrad: 'from-purple-500 via-indigo-500 to-cyan-400',
        rankValue: 6
      };

      if (t.includes('radiant')) {
        theme = {
          titleClass: 'text-amber-300',
          boxBorder: 'border-amber-400/70',
          boxShadow: '0 0 25px rgba(251,191,36,0.6)',
          grad0: '#fef08a', grad50: '#f59e0b', grad100: '#b45309',
          strokeOuter: '#fbbf24', strokeMid: '#f59e0b', fillMid: '#451a03',
          inner0: '#fbbf24', inner100: '#78350f', core: '#ffffff',
          barGrad: 'from-amber-400 via-yellow-400 to-orange-500',
          rankValue: 9
        };
      } else if (t.includes('immortal')) {
        theme = {
          titleClass: 'text-rose-400',
          boxBorder: 'border-rose-400/60',
          boxShadow: '0 0 25px rgba(244,63,94,0.5)',
          grad0: '#fda4af', grad50: '#e11d48', grad100: '#881337',
          strokeOuter: '#f43f5e', strokeMid: '#e11d48', fillMid: '#4c0519',
          inner0: '#f43f5e', inner100: '#881337', core: '#ffe4e6',
          barGrad: 'from-rose-500 via-red-500 to-amber-400',
          rankValue: 8
        };
      } else if (t.includes('ascendant')) {
        theme = {
          titleClass: 'text-emerald-300',
          boxBorder: 'border-emerald-400/50',
          boxShadow: '0 0 20px rgba(16,185,129,0.4)',
          grad0: '#6ee7b7', grad50: '#059669', grad100: '#064e3b',
          strokeOuter: '#10b981', strokeMid: '#059669', fillMid: '#022c22',
          inner0: '#10b981', inner100: '#064e3b', core: '#a7f3d0',
          barGrad: 'from-emerald-500 via-teal-500 to-cyan-400',
          rankValue: 7
        };
      } else if (t.includes('diamond')) {
        theme = {
          titleClass: 'text-purple-300',
          boxBorder: 'border-purple-400/50',
          boxShadow: '0 0 20px rgba(168,85,247,0.4)',
          grad0: '#c084fc', grad50: '#7c3aed', grad100: '#4c1d95',
          strokeOuter: '#c084fc', strokeMid: '#a855f7', fillMid: '#2e1065',
          inner0: '#a855f7', inner100: '#581c87', core: '#f5d0fe',
          barGrad: 'from-purple-500 via-indigo-500 to-cyan-400',
          rankValue: 6
        };
      } else if (t.includes('platinum')) {
        theme = {
          titleClass: 'text-cyan-300',
          boxBorder: 'border-cyan-400/50',
          boxShadow: '0 0 20px rgba(6,182,212,0.4)',
          grad0: '#67e8f9', grad50: '#0891b2', grad100: '#164e63',
          strokeOuter: '#06b6d4', strokeMid: '#0891b2', fillMid: '#083344',
          inner0: '#06b6d4', inner100: '#164e63', core: '#cffafe',
          barGrad: 'from-cyan-500 via-sky-500 to-teal-400',
          rankValue: 5
        };
      } else if (t.includes('gold')) {
        theme = {
          titleClass: 'text-yellow-300',
          boxBorder: 'border-yellow-400/50',
          boxShadow: '0 0 20px rgba(234,179,8,0.4)',
          grad0: '#fde047', grad50: '#ca8a04', grad100: '#713f12',
          strokeOuter: '#eab308', strokeMid: '#ca8a04', fillMid: '#422006',
          inner0: '#eab308', inner100: '#713f12', core: '#fef08a',
          barGrad: 'from-yellow-500 via-amber-500 to-orange-400',
          rankValue: 4
        };
      } else if (t.includes('silver')) {
        theme = {
          titleClass: 'text-slate-200',
          boxBorder: 'border-slate-400/50',
          boxShadow: '0 0 18px rgba(203,213,225,0.3)',
          grad0: '#f1f5f9', grad50: '#94a3b8', grad100: '#475569',
          strokeOuter: '#cbd5e1', strokeMid: '#94a3b8', fillMid: '#1e293b',
          inner0: '#cbd5e1', inner100: '#475569', core: '#f8fafc',
          barGrad: 'from-slate-400 via-gray-400 to-zinc-300',
          rankValue: 3
        };
      } else if (t.includes('bronze')) {
        theme = {
          titleClass: 'text-amber-500',
          boxBorder: 'border-amber-600/50',
          boxShadow: '0 0 18px rgba(180,83,9,0.3)',
          grad0: '#f59e0b', grad50: '#b45309', grad100: '#78350f',
          strokeOuter: '#d97706', strokeMid: '#b45309', fillMid: '#451a03',
          inner0: '#d97706', inner100: '#78350f', core: '#fed7aa',
          barGrad: 'from-amber-600 via-orange-600 to-amber-700',
          rankValue: 2
        };
      } else if (t.includes('iron')) {
        theme = {
          titleClass: 'text-slate-400',
          boxBorder: 'border-slate-600/50',
          boxShadow: '0 0 15px rgba(148,163,184,0.25)',
          grad0: '#cbd5e1', grad50: '#64748b', grad100: '#334155',
          strokeOuter: '#94a3b8', strokeMid: '#64748b', fillMid: '#0f172a',
          inner0: '#94a3b8', inner100: '#334155', core: '#e2e8f0',
          barGrad: 'from-slate-600 via-gray-600 to-zinc-500',
          rankValue: 1
        };
      }

      // Update SVG Stops
      const s0 = document.getElementById('rankGradStop0');
      if (s0) s0.setAttribute('stop-color', theme.grad0);
      const s50 = document.getElementById('rankGradStop50');
      if (s50) s50.setAttribute('stop-color', theme.grad50);
      const s100 = document.getElementById('rankGradStop100');
      if (s100) s100.setAttribute('stop-color', theme.grad100);

      const is0 = document.getElementById('rankInnerStop0');
      if (is0) is0.setAttribute('stop-color', theme.inner0);
      const is100 = document.getElementById('rankInnerStop100');
      if (is100) is100.setAttribute('stop-color', theme.inner100);

      const polyOuter = document.getElementById('tracker-poly-outer');
      if (polyOuter) polyOuter.setAttribute('stroke', theme.strokeOuter);
      const polyMid = document.getElementById('tracker-poly-mid');
      if (polyMid) {
        polyMid.setAttribute('stroke', theme.strokeMid);
        polyMid.setAttribute('fill', theme.fillMid);
      }
      const polyCore = document.getElementById('tracker-poly-core');
      if (polyCore) polyCore.setAttribute('fill', theme.core);

      const box = document.getElementById('tracker-rank-badge-box');
      if (box) box.style.boxShadow = theme.boxShadow;

      const titleEl = document.getElementById('tracker-rank-title');
      if (titleEl) {
        titleEl.className = `text-base sm:text-lg font-black font-gaming tracking-wider ${theme.titleClass}`;
      }

      const bar = document.getElementById('tracker-rr-bar');
      if (bar) {
        bar.className = `h-full rounded-full bg-gradient-to-r ${theme.barGrad} transition-all duration-700 shadow-md`;
      }

      return theme;
    }

    async function searchValorantPlayer(e) {
      if (e && e.preventDefault) e.preventDefault();

      const input = document.getElementById('val-search-input');
      const regionSelect = document.getElementById('val-search-region');
      const btn = document.getElementById('btn-val-search');
      const icon = document.getElementById('val-search-icon');
      const btnText = document.getElementById('val-search-btn-text');

      if (!input) return;
      const rawQuery = input.value.trim();
      if (!rawQuery) {
        showToast('กรุณากรอก Riot ID เช่น YourName#TAG 🎯');
        input.focus();
        return;
      }

      const parts = rawQuery.split('#');
      if (parts.length < 2 || !parts[0].trim() || !parts[1].trim()) {
        showToast('กรุณาระบุ Tag ด้วยครับ เช่น ' + rawQuery + '#1234 ⚠️');
        input.focus();
        return;
      }

      const playerName = parts[0].trim();
      const playerTag = parts.slice(1).join('#').trim();
      const region = regionSelect ? regionSelect.value : 'ap';

      playSound('pop');
      triggerHaptic(20);
      if (btn) btn.disabled = true;
      if (icon) icon.className = 'fa-solid fa-spinner animate-spin text-xs';
      if (btnText) btnText.innerText = 'กำลังค้นหา...';

      try {
        let result = null;
        const searchEndpoints = [
          `/api/valorant?name=${encodeURIComponent(playerName)}&tag=${encodeURIComponent(playerTag)}&region=${region}`,
          `https://dalines-site.dalines.workers.dev/api/valorant?name=${encodeURIComponent(playerName)}&tag=${encodeURIComponent(playerTag)}&region=${region}`,
          `https://api.kyroskoh.xyz/valorant/v1/mmr/${region}/${encodeURIComponent(playerName)}/${encodeURIComponent(playerTag)}?show=all&display=0`
        ];

        for (const ep of searchEndpoints) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6500);
            const res = await fetch(ep, { signal: controller.signal });
            clearTimeout(timeout);

            if (res.ok) {
              const contentType = res.headers.get('content-type') || '';
              if (contentType.includes('application/json')) {
                const json = await res.json();
                if (json && json.status === 'success' && json.data) {
                  result = json.data;
                  break;
                }
              } else {
                const text = (await res.text()).trim();
                const match = text.match(/^([A-Za-z0-9 ]+?)\s*-\s*(\d+)\s*RR(?:\s+MMR Elo:\s*(\d+))?/i);
                if (match) {
                  result = {
                    riotId: `${playerName}#${playerTag}`,
                    region: region,
                    currentTier: match[1].trim(),
                    currentRR: parseInt(match[2], 10),
                    elo: match[3] ? parseInt(match[3], 10) : null
                  };
                  break;
                }
              }
            }
          } catch (err) {
            // Try next endpoint
          }
        }

        if (result && result.currentTier) {
          playSound('sparkle');
          triggerHaptic(35);
          renderViewerRank(result);
          showToast(`🎯 พบข้อมูล ${result.riotId}: ${result.currentTier} (${result.currentRR} RR)!`);
        } else {
          playSound('pop');
          showToast(`⚠️ ไม่พบข้อมูลแรงก์ของ ${playerName}#${playerTag} หรือยังไม่ได้เล่นโหมด Competitive ใน Act ปัจจุบัน`);
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
      } finally {
        if (btn) btn.disabled = false;
        if (icon) icon.className = 'fa-solid fa-magnifying-glass text-xs';
        if (btnText) btnText.innerText = translations[currentLang].tracker_search_btn || 'ค้นหา';
      }
    }

    function renderViewerRank(playerData) {
      const banner = document.getElementById('val-viewer-banner');
      const viewerName = document.getElementById('val-viewer-name');
      const regionBadge = document.getElementById('val-viewer-region-badge');
      const compareBadge = document.getElementById('val-viewer-compare-badge');
      const resetBtn = document.getElementById('btn-val-reset-streamer');
      const clearBtn = document.getElementById('btn-val-clear-search');

      if (banner) banner.classList.remove('hidden');
      if (resetBtn) resetBtn.classList.remove('hidden');
      if (clearBtn) clearBtn.classList.remove('hidden');
      if (viewerName) viewerName.innerText = playerData.riotId;
      if (regionBadge) regionBadge.innerText = (playerData.region || 'AP').toUpperCase();

      const viewerTheme = applyValorantTierTheme(playerData.currentTier);
      const dalinesTierRank = 6; // Diamond 1
      if (compareBadge) {
        if (viewerTheme.rankValue > dalinesTierRank) {
          compareBadge.className = 'ml-1.5 px-2 py-0.5 rounded text-[9px] font-sans font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40';
          compareBadge.innerText = '👑 สูงกว่า DaLines! คมจัดดด 🔥';
        } else if (viewerTheme.rankValue === dalinesTierRank) {
          compareBadge.className = 'ml-1.5 px-2 py-0.5 rounded text-[9px] font-sans font-bold bg-purple-500/20 text-purple-200 border border-purple-500/40';
          compareBadge.innerText = '🎯 แรงก์ระดับเดียวกับ DaLines! ตี้กันได้ ⚡';
        } else {
          compareBadge.className = 'ml-1.5 px-2 py-0.5 rounded text-[9px] font-sans font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40';
          compareBadge.innerText = '💪 กำลังไต่ตาม DaLines มาติดๆ สู้ๆ! 🚀';
        }
      }

      const rankTitle = document.getElementById('tracker-rank-title');
      if (rankTitle) rankTitle.innerText = playerData.currentTier.toUpperCase();

      const rrCur = document.getElementById('tracker-rr-current');
      if (rrCur) rrCur.innerText = playerData.currentRR;

      const rrPercent = document.getElementById('tracker-rr-percent');
      if (rrPercent) rrPercent.innerText = `${playerData.currentRR}%`;

      const rrBar = document.getElementById('tracker-rr-bar');
      if (rrBar) rrBar.style.width = `${Math.min(100, Math.max(0, playerData.currentRR))}%`;

      const rankLabel = document.getElementById('tracker-rank-label-sub');
      if (rankLabel) rankLabel.innerText = `RATING: ${playerData.riotId}`;

      const trackerSection = document.getElementById('valorant-tracker-section');
      if (trackerSection) {
        trackerSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function resetToStreamerProfile() {
      playSound('sparkle');
      triggerHaptic(20);

      const banner = document.getElementById('val-viewer-banner');
      const resetBtn = document.getElementById('btn-val-reset-streamer');
      const clearBtn = document.getElementById('btn-val-clear-search');
      const input = document.getElementById('val-search-input');
      const rankLabel = document.getElementById('tracker-rank-label-sub');

      if (banner) banner.classList.add('hidden');
      if (resetBtn) resetBtn.classList.add('hidden');
      if (clearBtn) clearBtn.classList.add('hidden');
      if (input) input.value = '';
      if (rankLabel) rankLabel.innerText = translations[currentLang].tracker_rank_label || 'COMPETITIVE RANK';

      updateValorantTrackerDOM(valTrackerData);
      showToast('🔄 กลับสู่ข้อมูลสตรีมเมอร์ DaLines#TTV เรียบร้อย 🎯');
    }

    function clearValSearchInput() {
      const input = document.getElementById('val-search-input');
      const clearBtn = document.getElementById('btn-val-clear-search');
      if (input) {
        input.value = '';
        input.focus();
      }
      if (clearBtn) clearBtn.classList.add('hidden');
    }

    // -----------------------------------------------------------------
    // NIGHTBOT STREAM COMMANDS HUB
    // -----------------------------------------------------------------
    const NIGHTBOT_COMMANDS = [
      // 🎯 แรงก์ & สถิติแข่ง (Rank & Tracker)
      {
        name: "!rank",
        cat: "aim",
        desc: "แรงก์ Valorant ปัจจุบัน & สถิติ",
        response: "แรงก์ปัจจุบัน: Diamond 1 31RR (Peak: Immortal 1 34RR Ep 7: Act III) • K/D 1.08 | 148 ADR | Sova Main 769 hrs | ดูสถิติสดและประวัติแมตช์ได้ที่หน้าเว็บ DaLines Hub ครับ! 🎯",
        tags: ["rank", "valorant", "แรงก์", "stats", "tracker"]
      },
      {
        name: "!ranklive",
        cat: "aim",
        desc: "คำสั่ง Nightbot ดึงแรงก์สด Valorant อัตโนมัติ (Custom API)",
        response: "$(urlfetch https://api.kyroskoh.xyz/valorant/v1/mmr/ap/DaLines/TTV?show=combo&display=1)",
        tags: ["rank", "live", "api", "valorant", "nightbot"]
      },
      // 🎯 เป้า & ความไวเมาส์ (Aim & Sens)
      {
        name: "!sens",
        cat: "aim",
        desc: "ความไวเมาส์ในเกม (In-game Sensitivity)",
        response: "Valorant : in game sens : 0.45 (DPI 800) // Scoped : 1.00 | Apex : in game sens : 1.43 // ADS : 1.0",
        tags: ["sens", "ความไว", "เมาส์", "valorant", "apex"]
      },
      {
        name: "!dpi",
        cat: "aim",
        desc: "ค่า DPI ของเมาส์ & Polling Rate",
        response: "DPI 800 ~ Polling rate 1000hz",
        tags: ["dpi", "mouse", "เมาส์", "hz"]
      },
      {
        name: "!edpi",
        cat: "aim",
        desc: "เครื่องคำนวณ E-DPI & แปลงค่าความไวเมาส์ 8 เกม",
        response: "คำนวณ E-DPI และแปลงค่า Sens สดได้ในหน้าเว็บ DaLines Hub ส่วน E-DPI Calculator ครับ! 🎯",
        isLink: false,
        tags: ["edpi", "คำนวณ", "sens"]
      },
      {
        name: "!crosshair",
        cat: "aim",
        desc: "การตั้งค่าเป้าเล็ง Valorant ยอดฮิต",
        response: "Asuna 1-2-1-3 SicK 1-3-2-5 //// Pro Player 1 6 1 1 | 1 3 3 4 //// Cross = on 1 6 off 1 2 | 0 20 1 3 off on",
        tags: ["crosshair", "เป้า", "วาโล", "asuna", "sick"]
      },
      {
        name: "!เป้าไอจี",
        cat: "aim",
        desc: "โค้ดเป้าเล็งโพสต์ Instagram DaLines",
        response: "Outline : Off Center Dot : on 1 1 Inner line : 1 1 4 2 outer line : 1 1 10 5",
        tags: ["เป้า", "ig", "crosshair"]
      },
      {
        name: "!res",
        cat: "aim",
        desc: "ความละเอียดหน้าจอเล่นเกม (Resolution)",
        response: "2560x1440 (2K Resolution 165Hz)",
        tags: ["res", "resolution", "จอ", "2k", "1440p"]
      },
      {
        name: "!senscon",
        cat: "aim",
        desc: "แปลงค่าความไวเมาส์ข้ามเกม (Apex, Valorant, Fortnite, Delta Force)",
        response: "ใช้งานระบบ Sens Converter ข้ามเกมแม่นยำ 100% (cm/360°) ได้ในหน้าเว็บ DaLines Hub เลยครับ!",
        isLink: false,
        tags: ["converter", "sens", "แปลง"]
      },

      // 🎮 ไอดีเกม & ช่องทางเล่นด้วยกัน (IGN)
      {
        name: "!ign",
        cat: "ign",
        desc: "ชื่อไอดีในเกม Valorant (หลัก & รอง)",
        response: "Riot ID / Valorant : DaLines#TTV (กด Follow สตรีมก่อนแอดมาเล่นด้วยกันนะ!)",
        tags: ["ign", "ชื่อ", "ไอดี", "id", "valorant"]
      },
      {
        name: "!ignapex",
        cat: "ign",
        desc: "ชื่อไอดีในเกม Apex Legends",
        response: "SKB_DaLines",
        tags: ["apex", "ign", "เอเปก"]
      },
      {
        name: "!igncod",
        cat: "ign",
        desc: "ชื่อไอดีใน Call of Duty (Activision ID)",
        response: "DaLines#9293978",
        tags: ["cod", "warzone", "call of duty", "ign"]
      },
      {
        name: "!ignfortnite",
        cat: "ign",
        desc: "ชื่อไอดีในเกม Fortnite",
        response: "FAQ.DaLines",
        tags: ["fortnite", "ฟอร์ตไนท์", "ign"]
      },
      {
        name: "!steam",
        cat: "ign",
        desc: "โปรไฟล์ Steam คอมมูนิตี้ของตวง",
        response: "https://steamcommunity.com/id/taungrw/",
        isLink: true,
        tags: ["steam", "สตรีม", "โปรไฟล์"]
      },

      // 💻 สเปกคอม & เกมมิ่งเกียร์ (Gear)
      {
        name: "!specs",
        cat: "gear",
        desc: "สเปกคอมพิวเตอร์สตรีมเมอร์ PC",
        response: "CPU: Ryzen 5 5600 | GPU: RTX 5060 Ti | RAM: 16GB | Monitor: Xiaomi Mi 2K 27\" (165Hz) + Dell 144Hz",
        tags: ["spec", "specs", "สเปก", "คอม", "cpu", "gpu", "จอ"]
      },
      {
        name: "!mouse",
        cat: "gear",
        desc: "เมาส์เกมมิ่งประจำกาย",
        response: "ATK Ghost Ultimate",
        tags: ["mouse", "เมาส์", "atk", "ghost"]
      },
      {
        name: "!headset",
        cat: "gear",
        desc: "หูฟัง IEM & DAC ฟังเสียงฝีเท้า",
        response: "BGVP Light (IEM In-Ear Monitor + BGVP M01 DAC)",
        tags: ["headset", "headphone", "หูฟัง", "dac", "bgvp"]
      },
      {
        name: "!จอ",
        cat: "gear",
        desc: "จอมอนิเตอร์เล่นเกม 2 หน้าจอ",
        response: "Xiaomi Mi 2K Gaming Monitor 27\" (165Hz) & Dell Gaming S2419HGF (144Hz)",
        tags: ["จอ", "monitor", "165hz", "144hz", "xiaomi"]
      },
      {
        name: "!mousepad",
        cat: "gear",
        desc: "แผ่นรองเมาส์เกมมิ่งเกียร์",
        response: "https://www.facebook.com/102699194460007/posts/310820390314552/?d=n",
        isLink: true,
        tags: ["mousepad", "แผ่นรองเมาส์"]
      },

      // 🌐 โซเชียล & ติดตาม (Social)
      {
        name: "!discord",
        cat: "social",
        desc: "ดิสคอร์ดคอมมูนิตี้ DaLines",
        response: "https://discord.gg/3m9x688YCG",
        isLink: true,
        tags: ["discord", "ดิส", "dc"]
      },
      {
        name: "!donate",
        cat: "social",
        desc: "ช่องทางโดเนทขึ้นจอสดสตรีม",
        response: "ezdn.app/dalines หรือ ธ.กสิกร 632-2-17076-7 (ดนัย วงศ์วิเชียร)",
        tags: ["donate", "โดเนท", "สนับสนุน", "ezdn", "ทรู"]
      },
      {
        name: "!ig",
        cat: "social",
        desc: "Instagram ส่วนตัวของ DaLines",
        response: "https://www.instagram.com/tuangdanai",
        isLink: true,
        tags: ["ig", "instagram", "ไอจี"]
      },
      {
        name: "!เพลง",
        cat: "social",
        desc: "เพลงเปิดคลอในสตรีม",
        response: "https://www.youtube.com/watch?v=pqAeeaf50F8",
        isLink: true,
        tags: ["เพลง", "song", "youtube"]
      },

      // 🤣 มีม & คำสั่งกวนๆ (Fun)
      {
        name: "!badday",
        cat: "fun",
        desc: "เช็กดวงชะตาประจำวันในเกม",
        response: "มีโอกาสที่คุณจะเจอวันแย่ ๆ 99% เปลี่ยนเกมเล่นเถอะ!",
        tags: ["badday", "ดวง", "มีม"]
      },
      {
        name: "!cmd2",
        cat: "fun",
        desc: "สูตรลับโกงเกม +aim +fps",
        response: "+1000%aim +1000fps +norecoil +nocooldown +maxhealth +maxarmor",
        tags: ["cmd2", "สูตร", "โกง", "aim"]
      },
      {
        name: "!delete",
        cat: "fun",
        desc: "อารมณ์ตอนลั่นหัวคมๆ จนอยากลบเกม",
        response: "░░░ UNINSTALLING VALORANT ░░░ COMPLETE",
        tags: ["delete", "ลบ", "valorant", "uninstall"]
      },
      {
        name: "!age",
        cat: "fun",
        desc: "อายุของสตรีมเมอร์ DaLines",
        response: "30 y/o (สตรีมมาตั้งแต่ 2017)",
        tags: ["age", "อายุ", "ตวง"]
      }
    ];

    let currentBotCat = 'all';

    function initBotCommands() {
      renderBotCommands(NIGHTBOT_COMMANDS);
    }

    function renderBotCommands(list) {
      const grid = document.getElementById('bot-commands-grid');
      const emptyEl = document.getElementById('bot-commands-empty');
      const badge = document.getElementById('cmd-count-badge');
      if (!grid) return;

      if (!list || list.length === 0) {
        grid.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (badge) badge.innerText = 'ไม่พบคำสั่ง';
        return;
      }

      if (emptyEl) emptyEl.classList.add('hidden');
      if (badge) badge.innerText = `แสดง ${list.length} คำสั่ง`;

      grid.innerHTML = list.map(cmd => {
        const isUrl = cmd.isLink || (cmd.response && (cmd.response.startsWith('http://') || cmd.response.startsWith('https://')));
        const safeResp = escapeHtml(cmd.response);
        const safeName = escapeHtml(cmd.name);
        const safeDesc = escapeHtml(cmd.desc || '');

        let linkBtn = '';
        if (isUrl) {
          linkBtn = `
            <a href="${cmd.response}" target="_blank" rel="noopener noreferrer" class="px-2 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-medium transition flex items-center gap-1 active:scale-95 cursor-pointer">
              <span>เปิดลิงก์</span>
              <i class="fa-solid fa-arrow-up-right-from-square text-[8px]"></i>
            </a>
          `;
        }

        return `
          <div class="p-2.5 sm:p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 group flex flex-col justify-between shadow-sm">
            <div>
              <div class="flex items-center justify-between gap-1.5 mb-1.5">
                <button type="button" onclick="copyBotCommand('${safeName}', this)" class="cmd-badge-btn px-2 py-0.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/40 text-indigo-300 font-mono font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer" title="คลิกเพื่อคัดลอกคำสั่ง">
                  <span>${safeName}</span>
                  <i class="fa-regular fa-copy text-[10px] opacity-70 group-hover:opacity-100"></i>
                </button>
                <span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">${cmd.cat}</span>
              </div>
              <div class="text-[11px] font-medium text-slate-300 mb-1 leading-snug">${safeDesc}</div>
              <div class="text-[10px] text-slate-400 bg-black/40 border border-slate-800/80 rounded-lg p-1.5 font-mono break-all line-clamp-2 select-all">${safeResp}</div>
            </div>
            <div class="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between gap-1">
              <button type="button" onclick="copyBotCommand('${safeName}', this)" class="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition cursor-pointer">
                <i class="fa-solid fa-terminal text-[9px]"></i>
                <span>ก๊อปปี้คำสั่ง</span>
              </button>
              <div class="flex items-center gap-1">
                ${linkBtn}
                <button type="button" onclick="copyBotResponse('${safeResp.replace(/'/g, "\\'")}', this)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium transition active:scale-95 cursor-pointer" title="คัดลอกคำตอบ">
                  <i class="fa-regular fa-clipboard text-[9px]"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function filterBotCommands() {
      const input = document.getElementById('bot-cmd-search');
      const clearBtn = document.getElementById('btn-clear-cmd-search');
      const q = (input ? input.value : '').trim().toLowerCase();

      if (clearBtn) {
        if (q.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
      }

      const filtered = NIGHTBOT_COMMANDS.filter(c => {
        const matchCat = (currentBotCat === 'all' || c.cat === currentBotCat);
        if (!matchCat) return false;

        if (!q) return true;

        const nameMatch = c.name.toLowerCase().includes(q);
        const descMatch = (c.desc || '').toLowerCase().includes(q);
        const respMatch = (c.response || '').toLowerCase().includes(q);
        const tagMatch = c.tags && c.tags.some(t => t.toLowerCase().includes(q));

        return nameMatch || descMatch || respMatch || tagMatch;
      });

      renderBotCommands(filtered);
    }

    function setBotCmdCategory(cat, btn) {
      playSound('pop');
      currentBotCat = cat;

      document.querySelectorAll('.cmd-cat-btn').forEach(b => {
        b.className = 'cmd-cat-btn px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-medium transition whitespace-nowrap active:scale-95 cursor-pointer';
      });

      if (btn) {
        btn.className = 'cmd-cat-btn px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold transition whitespace-nowrap active:scale-95 cursor-pointer';
      }

      filterBotCommands();
    }

    function clearBotCommandSearch() {
      playSound('pop');
      const input = document.getElementById('bot-cmd-search');
      if (input) input.value = '';
      filterBotCommands();
    }

    async function copyBotCommand(cmd, btn) {
      playSound('pop');
      if (!await copyTextToClipboard(cmd, `คัดลอกคำสั่ง ${cmd} แล้ว! วางในแชทได้เลย 🤖`)) return;

      if (btn) {
        const origHtml = btn.innerHTML;
        btn.innerHTML = `<span class="text-emerald-400">คัดลอกแล้ว!</span> <i aria-hidden="true" class="fa-solid fa-check text-emerald-400 text-[10px]"></i>`;
        setTimeout(() => {
          btn.innerHTML = origHtml;
        }, 1200);
      }
    }

    async function copyBotResponse(text, btn) {
      playSound('pop');
      if (!await copyTextToClipboard(text, 'คัดลอกข้อความเรียบร้อย! 📋')) return;

      if (btn) {
        const origHtml = btn.innerHTML;
        btn.innerHTML = `<i aria-hidden="true" class="fa-solid fa-check text-emerald-400 text-[9px]"></i>`;
        setTimeout(() => {
          btn.innerHTML = origHtml;
        }, 1200);
      }
    }

    // -----------------------------------------------------------------
    // TWITCH EMOTE SHOWCASE
    // -----------------------------------------------------------------
    const TWITCH_EMOTES = [
      // ANIMATED EMOTES (Tier 1)
      {
        id: "emotesv2_1afd53431c18486b9b6040eb30c98378",
        code: "dalineOmendance",
        tier: "Tier 1",
        animated: true,
        desc: "Omen เต้นดุ๊กดิ๊ก",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_1afd53431c18486b9b6040eb30c98378/default/dark/3.0"
      },
      {
        id: "emotesv2_e0a464898ddf45ac95cb2bfeeba7180f",
        code: "dalineSagecry",
        tier: "Tier 1",
        animated: true,
        desc: "Sage ร้องไห้น้ำตานอง",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_e0a464898ddf45ac95cb2bfeeba7180f/default/dark/3.0"
      },
      {
        id: "emotesv2_49a39cda53424dfab56f808f967dea27",
        code: "dalineHearts",
        tier: "Tier 1",
        animated: true,
        desc: "หัวใจเต้นส่งความรัก",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_49a39cda53424dfab56f808f967dea27/default/dark/3.0"
      },
      {
        id: "emotesv2_a863a479d2fd48cb94796a60d4066882",
        code: "dalineGGWP",
        tier: "Tier 1",
        animated: true,
        desc: "GGWP สวยพี่สวย",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_a863a479d2fd48cb94796a60d4066882/default/dark/3.0"
      },
      {
        id: "emotesv2_92480d23fdd84470aac075b9c0127686",
        code: "dalineParrot",
        tier: "Tier 1",
        animated: true,
        desc: "นกแก้วปาร์ตี้ Parrot",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_92480d23fdd84470aac075b9c0127686/default/dark/3.0"
      },
      {
        id: "emotesv2_48df1cb6e47e409f86b0f360f8a62c36",
        code: "dalineHugg",
        tier: "Tier 1",
        animated: true,
        desc: "กอดๆ อบอุ่น",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_48df1cb6e47e409f86b0f360f8a62c36/default/dark/3.0"
      },
      {
        id: "emotesv2_8510cc22ccac4a2f9d01299be656ed24",
        code: "dalineAhh",
        tier: "Tier 1",
        animated: true,
        desc: "ตกใจ อ้าปากค้าง",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_8510cc22ccac4a2f9d01299be656ed24/default/dark/3.0"
      },
      {
        id: "emotesv2_bcc7b6b38b224fab8d0b67ebea2b396b",
        code: "dalineShy",
        tier: "Tier 1",
        animated: true,
        desc: "เขินอาย แก้มแดง",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_bcc7b6b38b224fab8d0b67ebea2b396b/default/dark/3.0"
      },
      {
        id: "emotesv2_aa69b9f0dd664a7a8a595ea4d529a992",
        code: "dalineSwing",
        tier: "Tier 1",
        animated: true,
        desc: "โยกหัวตามจังหวะ",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_aa69b9f0dd664a7a8a595ea4d529a992/default/dark/3.0"
      },
      {
        id: "emotesv2_a1fd9853153c4e649af96baf8fb990b0",
        code: "daline100bits",
        tier: "Tier 1",
        animated: true,
        desc: "100 Bits ซัพพอร์ต",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_a1fd9853153c4e649af96baf8fb990b0/default/dark/3.0"
      },
      {
        id: "emotesv2_723d758fbc8d450d82f5cb4bfd684bc1",
        code: "daline10k",
        tier: "Tier 1",
        animated: true,
        desc: "10K ผู้ติดตามฉลอง",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_723d758fbc8d450d82f5cb4bfd684bc1/default/dark/3.0"
      },

      // STATIC EMOTES (Tier 1)
      {
        id: "emotesv2_2115cc966dd642b288e34f77fb7388d8",
        code: "dalineAaaa",
        tier: "Tier 1",
        animated: false,
        desc: "กรีดร้อง Aaaa",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_2115cc966dd642b288e34f77fb7388d8/default/dark/3.0"
      },
      {
        id: "emotesv2_a5899107cb544d60b99e4b65be23492e",
        code: "dalineGorrrr",
        tier: "Tier 1",
        animated: false,
        desc: "ตัวอักษร ก ประจำช่อง",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_a5899107cb544d60b99e4b65be23492e/default/dark/3.0"
      },
      {
        id: "emotesv2_345ea24a1c534c0fbec41eb4cb10797c",
        code: "dalineMorrr",
        tier: "Tier 1",
        animated: false,
        desc: "ตัวอักษร ม",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_345ea24a1c534c0fbec41eb4cb10797c/default/dark/3.0"
      },
      {
        id: "emotesv2_5227e25e986c4b1f992d5c6c8b7fff77",
        code: "dalineKorrr",
        tier: "Tier 1",
        animated: false,
        desc: "ตัวอักษร ค",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_5227e25e986c4b1f992d5c6c8b7fff77/default/dark/3.0"
      },
      {
        id: "emotesv2_f7150818f4d3455f87a34c4a0f8b063d",
        code: "dalineWorrr",
        tier: "Tier 1",
        animated: false,
        desc: "ตัวอักษร ว",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_f7150818f4d3455f87a34c4a0f8b063d/default/dark/3.0"
      },
      {
        id: "emotesv2_9b86476ece4d4060a552354b2a72e265",
        code: "dalineYorrr",
        tier: "Tier 1",
        animated: false,
        desc: "ตัวอักษร ย",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_9b86476ece4d4060a552354b2a72e265/default/dark/3.0"
      },
      {
        id: "emotesv2_b82c5378c2374133b5a225d8c949bba3",
        code: "dalineAorrr",
        tier: "Tier 1",
        animated: false,
        desc: "ตัวอักษร อ",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_b82c5378c2374133b5a225d8c949bba3/default/dark/3.0"
      },
      {
        id: "emotesv2_275a5d9918cb4a229b1a498b3e391152",
        code: "dalineSorrr",
        tier: "Tier 1",
        animated: false,
        desc: "ตัวอักษร ส",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_275a5d9918cb4a229b1a498b3e391152/default/dark/3.0"
      },
      {
        id: "emotesv2_bf68fe689230426298faae161ce4bd66",
        code: "dalineHorrr",
        tier: "Tier 1",
        animated: false,
        desc: "ตัวอักษร ห",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_bf68fe689230426298faae161ce4bd66/default/dark/3.0"
      },
      {
        id: "emotesv2_d58179e40cca423d946e7345233580a6",
        code: "dalineAr",
        tier: "Tier 1",
        animated: false,
        desc: "สระ อา",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_d58179e40cca423d946e7345233580a6/default/dark/3.0"
      },
      {
        id: "emotesv2_55654702788445fcb5590e619819e067",
        code: "dalineHeartt",
        tier: "Tier 1",
        animated: false,
        desc: "หัวใจดวงโตสีแดง",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_55654702788445fcb5590e619819e067/default/dark/3.0"
      },
      {
        id: "emotesv2_b9bc764aef1b46ea8916cdea01b2a0ef",
        code: "dalineDorrr",
        tier: "Tier 1",
        animated: false,
        desc: "ตัวอักษร ด",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_b9bc764aef1b46ea8916cdea01b2a0ef/default/dark/3.0"
      },

      // TIER 2 & TIER 3
      {
        id: "emotesv2_fc05bbb3e0384253a3fcbb3acfb34a4e",
        code: "dalineShock",
        tier: "Tier 2",
        animated: false,
        desc: "ตกใจช็อกตาค้าง (Tier 2)",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_fc05bbb3e0384253a3fcbb3acfb34a4e/default/dark/3.0"
      },
      {
        id: "307549470",
        code: "dalineFighting",
        tier: "Tier 3",
        animated: false,
        desc: "สู้ตาย ไฟลุก (Tier 3)",
        url: "https://static-cdn.jtvnw.net/emoticons/v2/307549470/default/dark/3.0"
      }
    ];

    let currentEmoteCat = 'all';

    function initEmoteShowcase() {
      renderTwitchEmotes(TWITCH_EMOTES);
    }

    function renderTwitchEmotes(list) {
      const grid = document.getElementById('twitch-emotes-grid');
      if (!grid) return;

      grid.innerHTML = list.map(e => {
        const tierBadgeColor = e.tier === 'Tier 1'
          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
          : (e.tier === 'Tier 2' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30');

        return `
          <div role="button" tabindex="0" aria-label="${e.code}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();handleEmoteClick('${e.code}', '${e.url}', event, this)}" onclick="handleEmoteClick('${e.code}', '${e.url}', event, this)" class="emote-card group relative p-2.5 rounded-xl bg-slate-900/80 hover:bg-[#9146FF]/15 border border-slate-800 hover:border-[#9146FF]/50 transition-all duration-200 flex flex-col items-center justify-between text-center cursor-pointer active:scale-95 shadow-md">
            <!-- Emote Image -->
            <div class="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center my-1 relative">
              <img src="${e.url}" alt="${e.code}" loading="lazy" decoding="async" width="84" height="84" class="max-w-full max-h-full object-contain filter group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition duration-200" />
            </div>

            <!-- Code & Badges -->
            <div class="w-full mt-1">
              <div class="text-[10px] sm:text-[11px] font-mono font-bold text-slate-200 group-hover:text-purple-300 truncate transition">
                ${e.code}
              </div>
              <div class="flex items-center justify-center gap-1 mt-1">
                <span class="text-[8px] font-mono px-1 py-0.2 rounded border ${tierBadgeColor}">
                  ${e.tier === 'Tier 1' ? 'T1' : (e.tier === 'Tier 2' ? 'T2' : 'T3')}
                </span>
                ${e.animated ? '<span class="text-[8px] font-mono px-1 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">GIF</span>' : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function setEmoteCategory(cat, btn) {
      playSound('pop');
      currentEmoteCat = cat;

      document.querySelectorAll('.emote-cat-btn').forEach(b => {
        b.className = 'emote-cat-btn px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-medium transition whitespace-nowrap active:scale-95 cursor-pointer';
      });

      if (btn) {
        btn.className = 'emote-cat-btn px-2.5 py-1 rounded-lg bg-[#9146FF] text-white font-bold transition whitespace-nowrap active:scale-95 cursor-pointer';
      }

      const filtered = TWITCH_EMOTES.filter(e => {
        if (cat === 'all') return true;
        if (cat === 'animated') return e.animated;
        if (cat === 'tier1') return e.tier === 'Tier 1';
        if (cat === 'tier23') return e.tier === 'Tier 2' || e.tier === 'Tier 3';
        return true;
      });

      renderTwitchEmotes(filtered);
    }

    async function handleEmoteClick(code, imgUrl, event, card) {
      playSound('pop');
      if (!await copyTextToClipboard(code, `คัดลอกอีโมต ${code} แล้ว! ✨`)) return;
      if (prefersQuietEffects()) return;

      // Spawn floating emote confetti at click coordinates
      const clickX = event.clientX || (event.touches && event.touches[0].clientX) || (window.innerWidth / 2);
      const clickY = event.clientY || (event.touches && event.touches[0].clientY) || (window.innerHeight / 2);
      spawnFloatingEmote(clickX, clickY, imgUrl);

      // Card bounce feedback
      if (card) {
        card.style.transform = 'scale(1.12)';
        card.style.borderColor = '#c084fc';
        setTimeout(() => {
          card.style.transform = '';
          card.style.borderColor = '';
        }, 200);
      }
    }

    function spawnFloatingEmote(x, y, imgUrl) {
      const el = document.createElement('img');
      el.src = imgUrl;
      el.className = 'fixed pointer-events-none z-50 select-none';
      el.style.left = `${x - 24}px`;
      el.style.top = `${y - 24}px`;
      el.style.width = '48px';
      el.style.height = '48px';
      el.style.objectFit = 'contain';
      el.style.opacity = '1';
      el.style.transition = 'transform 1s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.9s ease-out';
      el.style.filter = 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.8))';
      document.body.appendChild(el);

      const randomX = (Math.random() - 0.5) * 90;
      const randomRot = (Math.random() - 0.5) * 50;

      requestAnimationFrame(() => {
        el.style.transform = `translate(${randomX}px, -130px) scale(1.35) rotate(${randomRot}deg)`;
        el.style.opacity = '0';
      });

      setTimeout(() => {
        el.remove();
      }, 1000);
    }

    // =========================================================================
    // 🛸 CYBERPUNK FUTURISTIC ENHANCEMENTS ENGINE (CANVAS, RADAR, SOUNDBOARD, RANDOMIZER)
    // =========================================================================


    // =========================================================================
    // ⌘ STUDIO COMMAND PALETTE (Ctrl+K / Cmd+K)
    // =========================================================================
    let cmdPaletteActiveIndex = 0;
    let cmdPaletteFiltered = [];

    function getCommandPaletteItems() {
      const isEn = currentLang === 'en';
      const items = [
        {
          id: 'tab:links',
          category: isEn ? 'Navigation' : 'นำทางแท็บ',
          title: isEn ? 'Links & Support Hub' : 'แท็บ: ลิงก์ติดตาม & สนับสนุน QR',
          subtitle: isEn ? 'Social links, QR Donate & KBank transfer' : 'ช่องทางโซเชียล, QR Code โดเนท และบัญชีธนาคาร',
          icon: 'fa-solid fa-link',
          keywords: 'links social donate qr bank kbank ติดตาม โดเนท'
        },
        {
          id: 'tab:stream',
          category: isEn ? 'Navigation' : 'นำทางแท็บ',
          title: isEn ? 'Live Stream, Clips & Emotes' : 'แท็บ: ไลฟ์สด, คลิปเด็ด & อีโมตช่อง',
          subtitle: isEn ? 'Twitch player, stream countdown & emote vault' : 'หน้าจอสตรีม Twitch, นับถอยหลังไลฟ์ และคลังอีโมต',
          icon: 'fa-brands fa-twitch',
          keywords: 'stream live twitch clips emotes schedule สตรีม คลิป อีโมต'
        },
        {
          id: 'tab:pc',
          category: isEn ? 'Navigation' : 'นำทางแท็บ',
          title: isEn ? 'PC Hardware Specs' : 'แท็บ: สเปกคอม Battle Station',
          subtitle: isEn ? 'CPU, GPU, RAM, Monitor & streaming rig' : 'สเปก CPU, การ์ดจอ, จอ 165Hz และอุปกรณ์เครื่องหลัก',
          icon: 'fa-solid fa-microchip',
          keywords: 'pc specs hardware cpu gpu ram monitor สเปก คอม'
        },
        {
          id: 'tab:gear',
          category: isEn ? 'Navigation' : 'นำทางแท็บ',
          title: isEn ? 'Gear, Pro Settings, eDPI & Valorant Tracker' : 'แท็บ: เกมมิ่งเกียร์, ค่าเมาส์ & Valorant Tracker',
          subtitle: isEn ? 'Crosshair simulator, Aim Challenge & Rank lookup' : 'คำนวณ eDPI, ฝึกยิง 10 วิ และเช็กแรงก์ Valorant สด',
          icon: 'fa-solid fa-crosshairs',
          keywords: 'gear pro settings edpi crosshair aim valorant tracker เกียร์ เป้า แรงก์'
        },
        {
          id: 'tab:rules',
          category: isEn ? 'Navigation' : 'นำทางแท็บ',
          title: isEn ? 'Chat Rules, Nightbot & Meme Soundboard' : 'แท็บ: กติกาแชท, คำสั่งบอท & Soundboard',
          subtitle: isEn ? '23 Nightbot commands, Riot ID & OBS TTS Sync' : 'รวมคำสั่ง Nightbot, Riot ID และแผงกดเสียงมีม OBS',
          icon: 'fa-solid fa-robot',
          keywords: 'rules nightbot commands soundboard obs chat กติกา บอท เสียงมีม'
        },
        {
          id: 'copy:crosshair',
          category: isEn ? 'Quick Copy' : 'คัดลอกด่วน',
          title: isEn ? 'Copy Valorant Crosshair Code' : 'คัดลอกโค้ดเป้าเล็ง Valorant ของ DaLines',
          subtitle: '0;p;0;c;1;s;1;P;c;7;t;6;o;1;d;1;z;6...',
          icon: 'fa-solid fa-crosshairs',
          keywords: 'copy crosshair valorant code เป้า โค้ดเป้า'
        },
        {
          id: 'copy:prosettings',
          category: isEn ? 'Quick Copy' : 'คัดลอกด่วน',
          title: isEn ? 'Copy Full Pro Settings Summary' : 'คัดลอกสรุปค่าตั้งค่า Valorant ครบทุกตัวเลข',
          subtitle: 'DPI 800 • Sens 0.45 • eDPI 360 • 1000Hz',
          icon: 'fa-solid fa-sliders',
          keywords: 'copy pro settings dpi sens edpi ความไว'
        },
        {
          id: 'copy:ign',
          category: isEn ? 'Quick Copy' : 'คัดลอกด่วน',
          title: isEn ? 'Copy Riot ID (DaLines#TTV)' : 'คัดลอกชื่อในเกม / Riot ID: DaLines#TTV',
          subtitle: isEn ? 'Add in-game to join viewer games' : 'คัดลอกไปแอดเพื่อนเล่นด้วยกันใน Valorant',
          icon: 'fa-solid fa-id-badge',
          keywords: 'ign riot id dalines ttv ชื่อในเกม แอดเพื่อน'
        },
        {
          id: 'copy:email',
          category: isEn ? 'Quick Copy' : 'คัดลอกด่วน',
          title: isEn ? 'Copy Business Email (taung@windowslive.com)' : 'คัดลอกอีเมลติดต่องาน (taung@windowslive.com)',
          subtitle: isEn ? 'Sponsorship & business inquiries' : 'ติดต่อสปอนเซอร์และงานโฆษณา',
          icon: 'fa-solid fa-envelope',
          keywords: 'email business contact sponsor อีเมล ติดต่องาน สปอนเซอร์'
        },
        {
          id: 'copy:bank',
          category: isEn ? 'Quick Copy' : 'คัดลอกด่วน',
          title: isEn ? 'Copy KBank Account (632-2-17076-7)' : 'คัดลอกเลขบัญชีกสิกรไทย (632-2-17076-7)',
          subtitle: isEn ? 'Danai Wongwichian • Kasikornbank' : 'ดนัย วงศ์วิเชียร • โดเนทตรงไม่หักค่าธรรมเนียม',
          icon: 'fa-solid fa-building-columns',
          keywords: 'bank kbank donate account กสิกร โอน บัญชี โดเนท'
        },
        {
          id: 'sound:headshot',
          category: isEn ? 'Soundboard FX' : 'เสียงมีมทันใจ',
          title: isEn ? 'Play Meme FX: Headshot!' : 'เล่นเสียงมีม: ยิงหัวแตก! 🎯',
          subtitle: isEn ? 'Play synth FX through browser audio' : 'เล่นเสียงเอฟเฟกต์ผ่านลำโพง/หูฟัง',
          icon: 'fa-solid fa-volume-high',
          keywords: 'sound meme fx headshot เสียง มีม ยิงหัว'
        },
        {
          id: 'sound:yorn',
          category: isEn ? 'Soundboard FX' : 'เสียงมีมทันใจ',
          title: isEn ? 'Play Meme FX: Throw Game' : 'เล่นเสียงมีม: โยนแล้ว 1! 🗑️',
          subtitle: isEn ? 'Classic DaLines streamer meme FX' : 'เสียงเอฟเฟกต์ประจำช่องสายยิงเน้นโยน',
          icon: 'fa-solid fa-volume-high',
          keywords: 'sound meme fx yorn throw เสียง โยน มีม'
        },
        {
          id: 'pref:lang',
          category: isEn ? 'Preferences' : 'ตั้งค่าระบบ',
          title: isEn ? 'Switch Language (TH / EN)' : 'สลับภาษาเว็บไซต์ (ไทย / English)',
          subtitle: isEn ? 'Currently: English' : 'ภาษาปัจจุบัน: ภาษาไทย',
          icon: 'fa-solid fa-globe',
          keywords: 'language lang th en ภาษา สลับภาษา'
        },
        {
          id: 'theme:emerald',
          category: isEn ? 'Preferences' : 'ตั้งค่าระบบ',
          title: isEn ? 'Theme: Emerald Studio' : 'เปลี่ยนธีมสี: Emerald Studio',
          subtitle: '#10b981 Signature Accent',
          icon: 'fa-solid fa-palette',
          keywords: 'theme emerald green สี เขียว'
        },
        {
          id: 'theme:cyan',
          category: isEn ? 'Preferences' : 'ตั้งค่าระบบ',
          title: isEn ? 'Theme: Cyber Cyan' : 'เปลี่ยนธีมสี: Cyber Cyan',
          subtitle: '#06b6d4 Tactical Accent',
          icon: 'fa-solid fa-palette',
          keywords: 'theme cyan blue สี ฟ้า'
        },
        {
          id: 'theme:purple',
          category: isEn ? 'Preferences' : 'ตั้งค่าระบบ',
          title: isEn ? 'Theme: Twitch Violet' : 'เปลี่ยนธีมสี: Twitch Violet',
          subtitle: '#a855f7 Broadcast Accent',
          icon: 'fa-solid fa-palette',
          keywords: 'theme purple violet twitch สี ม่วง'
        },
        {
          id: 'page:dance/',
          category: isEn ? 'Companion Pages' : 'หน้าพิเศษในเครือ',
          title: isEn ? 'Open Dance Hero' : 'เปิดหน้า: Dance Hero',
          subtitle: '/dance/',
          icon: 'fa-solid fa-arrow-up-right-from-square',
          keywords: 'page dance hero เต้น'
        },
        {
          id: 'page:story/',
          category: isEn ? 'Companion Pages' : 'หน้าพิเศษในเครือ',
          title: isEn ? 'Open DaLines Story' : 'เปิดหน้า: DaLines Story',
          subtitle: '/story/',
          icon: 'fa-solid fa-arrow-up-right-from-square',
          keywords: 'page story สตอรี่ ประวัติ'
        },
        {
          id: 'page:party.html',
          category: isEn ? 'Companion Pages' : 'หน้าพิเศษในเครือ',
          title: isEn ? 'Open Party Lounge (Gacha & Wheel)' : 'เปิดหน้า: Party Lounge (กาชา & วงล้อ)',
          subtitle: '/party.html',
          icon: 'fa-solid fa-arrow-up-right-from-square',
          keywords: 'page party gacha wheel ปาร์ตี้ กาชา วงล้อ'
        },
        {
          id: 'page:tts.html',
          category: isEn ? 'Companion Pages' : 'หน้าพิเศษในเครือ',
          title: isEn ? 'Open TTS Station Control' : 'เปิดหน้า: TTS Station Hub',
          subtitle: '/tts.html',
          icon: 'fa-solid fa-arrow-up-right-from-square',
          keywords: 'page tts voice bot บอท อ่านแชท'
        }
      ];

      if (typeof NIGHTBOT_COMMANDS !== 'undefined' && Array.isArray(NIGHTBOT_COMMANDS)) {
        NIGHTBOT_COMMANDS.forEach(cmd => {
          items.push({
            id: `bot:${cmd.name}`,
            category: 'Nightbot',
            title: `${cmd.name} — ${cmd.desc}`,
            subtitle: cmd.response,
            icon: 'fa-solid fa-terminal',
            keywords: `${cmd.name} ${cmd.desc} ${(cmd.tags || []).join(' ')}`
          });
        });
      }
      return items;
    }

    function openCommandPalette() {
      playSound('pop');
      const modal = document.getElementById('modal-command-palette');
      const input = document.getElementById('cmd-palette-input');
      if (!modal) return;
      if (input) input.value = '';
      cmdPaletteActiveIndex = 0;
      filterCommandPalette();
      setModalOpen(modal, true);
    }

    function closeCommandPalette() {
      const modal = document.getElementById('modal-command-palette');
      if (!modal || modal.classList.contains('hidden')) return;
      playSound('pop');
      setModalOpen(modal, false);
    }

    function filterCommandPalette() {
      const input = document.getElementById('cmd-palette-input');
      const query = (input ? input.value : '').trim().toLowerCase();
      const allItems = getCommandPaletteItems();
      cmdPaletteFiltered = !query
        ? allItems.slice(0, 14)
        : allItems.filter(item =>
            item.title.toLowerCase().includes(query) ||
            item.subtitle.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query) ||
            item.keywords.toLowerCase().includes(query)
          ).slice(0, 18);
      if (cmdPaletteActiveIndex >= cmdPaletteFiltered.length) cmdPaletteActiveIndex = 0;
      renderCommandPaletteList();
    }

    function renderCommandPaletteList() {
      const list = document.getElementById('cmd-palette-list');
      const countEl = document.getElementById('cmd-palette-count');
      if (!list) return;
      if (countEl) {
        countEl.innerText = currentLang === 'en'
          ? `${cmdPaletteFiltered.length} items`
          : `${cmdPaletteFiltered.length} รายการ`;
      }
      if (!cmdPaletteFiltered.length) {
        list.innerHTML = `<div class="py-10 text-center text-xs text-slate-400">${currentLang === 'en' ? 'No matching commands found.' : 'ไม่พบคำสั่งหรือเมนูที่ค้นหา ลองพิมพ์คำอื่นดูครับ'}</div>`;
        return;
      }
      list.innerHTML = cmdPaletteFiltered.map((item, idx) => {
        const isActive = idx === cmdPaletteActiveIndex;
        return `<button type="button" role="option" aria-selected="${isActive}" data-cmd-idx="${idx}"
          onclick="runCommandPaletteAction('${escapeAttr(item.id)}')"
          class="w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${isActive ? 'bg-emerald-500/15 border border-emerald-400/40 text-white' : 'hover:bg-white/[0.05] border border-transparent text-slate-200'}">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-lg ${isActive ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/[0.05] text-slate-400'} flex items-center justify-center shrink-0 text-xs">
              <i aria-hidden="true" class="${escapeHtml(item.icon)}"></i>
            </div>
            <div class="min-w-0">
              <div class="text-xs sm:text-[13px] font-semibold truncate">${escapeHtml(item.title)}</div>
              <div class="text-xs text-slate-400 truncate">${escapeHtml(item.subtitle)}</div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-md bg-white/[0.06] text-[11px] font-mono text-slate-300 shrink-0">${escapeHtml(item.category)}</span>
        </button>`;
      }).join('');
    }

    function moveCommandPaletteSelection(delta) {
      if (!cmdPaletteFiltered.length) return;
      cmdPaletteActiveIndex = (cmdPaletteActiveIndex + delta + cmdPaletteFiltered.length) % cmdPaletteFiltered.length;
      renderCommandPaletteList();
      const activeBtn = document.querySelector(`#cmd-palette-list [data-cmd-idx="${cmdPaletteActiveIndex}"]`);
      if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
        activeBtn.scrollIntoView({ block: 'nearest' });
      }
    }

    function executeActiveCommandPaletteItem() {
      const selected = cmdPaletteFiltered[cmdPaletteActiveIndex];
      if (selected) runCommandPaletteAction(selected.id);
    }

    function runCommandPaletteAction(actionId) {
      closeCommandPalette();
      if (!actionId) return;
      const [kind, value] = [actionId.slice(0, actionId.indexOf(':')), actionId.slice(actionId.indexOf(':') + 1)];
      if (kind === 'tab') {
        switchTab(value, true, true);
        document.getElementById('hub-main')?.scrollIntoView({ behavior: prefersQuietEffects() ? 'auto' : 'smooth' });
      } else if (kind === 'copy') {
        if (value === 'crosshair') copyValorantCrosshair();
        else if (value === 'prosettings') copyProSettingsSummary();
        else if (value === 'ign') copyIGN();
        else if (value === 'email') copyHeroBusinessEmail();
        else if (value === 'bank') copyBankAccount();
      } else if (kind === 'sound') {
        if (value === 'headshot') playMemeSound('headshot', 'ยิงหัวแตก', null);
        else if (value === 'yorn') playMemeSound('yorn', 'โยนแล้วหนึ่ง', null);
      } else if (kind === 'pref') {
        if (value === 'lang') toggleLanguage();
      } else if (kind === 'theme') {
        setTheme(value);
      } else if (kind === 'page') {
        window.location.href = value;
      } else if (kind === 'bot') {
        const cmd = typeof NIGHTBOT_COMMANDS !== 'undefined'
          ? NIGHTBOT_COMMANDS.find(c => c.name === value)
          : null;
        if (cmd) {
          copyTextToClipboard(cmd.name, `${cmd.name}: ${cmd.response}`);
        }
      }
    }
