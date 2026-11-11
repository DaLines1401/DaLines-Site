// User preferences remain usable when storage is unavailable (private browsing, quota, or policy).
const preferenceMemory = new Map();
const safeStorage = {
  getItem(key) {
    if (preferenceMemory.has(key)) return preferenceMemory.get(key);
    try { return window.localStorage.getItem(key); }
    catch { return preferenceMemory.get(key) ?? null; }
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
    // TWITCH VIDEO & STREAM PLAYER CONTROLLER
    // -----------------------------------------------------------------
    let currentPlayerMode = 'live'; // 'live' หรือ 'trailer'
    let isChatOpen = false;

    function getTwitchParentsQuery() {
      const host = window.location.hostname;
      const parents = new Set(['localhost', '127.0.0.1', 'dalines-site.dalines.workers.dev', 'pages.dalines.workers.dev', 'dalines.tv']);
      if (host) parents.add(host);
      return Array.from(parents).filter(Boolean).map(p => `parent=${encodeURIComponent(p)}`).join('&');
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
        setFrameSource(iframe, `https://player.twitch.tv/?channel=dalines&${parentQuery}&autoplay=true&muted=false`);
        
        if (badge) {
          badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-gaming font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1';
          badge.innerHTML = currentLiveState ? '<span class="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>STREAMING' : '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>LIVE PLAYER';
        }
        if (title) title.innerText = 'Twitch: dalines (Live Stream)';
        
        btnLive.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-red-600 text-white shadow-lg cursor-pointer';
        btnTrailer.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5 hover:bg-slate-800 cursor-pointer';
      } else {
        currentPlayerMode = 'trailer';
        setFrameSource(iframe, `https://player.twitch.tv/?video=1475544386&${parentQuery}&autoplay=true`);
        
        if (badge) {
          badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-gaming font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1';
          badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>TRAILER VOD';
        }
        if (title) title.innerText = 'Twitch VOD: 1475544386 (Trailer)';
        
        btnTrailer.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-emerald-600 text-white shadow-lg cursor-pointer';
        btnLive.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5 hover:bg-slate-800 cursor-pointer';
      }
    }

    function setFrameSource(frame, url) {
      if (frame && frame.getAttribute('src') !== url) frame.src = url;
    }

    function stopStreamEmbeds() {
      setFrameSource(document.getElementById('twitch-main-player'), 'about:blank');
      setFrameSource(document.getElementById('twitch-chat-frame'), 'about:blank');
      if (isChatOpen) {
        isChatOpen = false;
        document.getElementById('twitch-chat-container')?.classList.add('hidden');
        const label = document.getElementById('chat-toggle-text');
        if (label) label.textContent = currentLang === 'en' ? 'Open chat' : 'เปิดแชท';
      }
    }

    function setPlayerMode(mode) {
      playSound('tab');
      currentPlayerMode = mode === 'trailer' ? 'trailer' : 'live';
      updateTwitchPlayer(currentPlayerMode);
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
      playSound('tab');
      const streamBtn = document.querySelector('[data-tab="stream"]');
      if (streamBtn) streamBtn.click();
      setPlayerMode(mode);
    }

    // -----------------------------------------------------------------
    // MULTI-LANGUAGE SYSTEM (i18n: TH & EN)
    // -----------------------------------------------------------------
    const translations = {
      th: {
        banner_desc: "• สตรีมหลักบน Twitch แวะมาเมาท์กันได้!",
        banner_btn: "ชมไลฟ์สด",
        theme_label: '<i aria-hidden="true" class="fa-solid fa-palette text-xs mr-1"></i>ธีม',
        share_btn: "แชร์",
        bio_text: "🎮 สตรีมเมอร์สายยิง เน้นโยน จริงจังมาเยอะแล้วครับ! • Just an FPS & Battle Royale lover from Thailand 🇹🇭",
        name_tag: "ตวง (Tuang) • 30 yrs",
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
        party_title: "Join the Party & Add In-Game",
        party_desc: "ชื่อในเกม / IGN: <strong class=\"text-emerald-300 font-mono text-sm\">DaLines</strong> (รบกวนกด Follow ในสตรีมก่อนแอดมาเล่นด้วยกันน้า!)",
        copy_ign: "คัดลอกชื่อในเกม: DaLines",
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
        toast_copy_ign: "คัดลอก IGN: DaLines เรียบร้อย! 🎮",
        toast_sound_on: "เปิดเสียงเอฟเฟกต์แล้ว 🔊",
        toast_sound_off: "ปิดเสียงเอฟเฟกต์แล้ว 🔇",
        clips_desc: "คลังคลิปไฮไลท์ยอดนิยมตลอดกาลจาก twitch.tv/dalines เรียงตามยอดเข้าชมสูงสุด"
      },
      en: {
        banner_desc: "• Catch me live on Twitch! Come say hi!",
        banner_btn: "Watch Live",
        theme_label: '<i aria-hidden="true" class="fa-solid fa-palette text-xs mr-1"></i>Theme',
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
        party_title: "Join the Party & In-Game ID",
        party_desc: "In-Game Name: <strong class=\"text-emerald-300 font-mono text-sm\">DaLines</strong> (Please follow the stream before sending a friend request!)",
        copy_ign: "Copy IGN: DaLines",
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
        toast_copy_ign: "IGN: DaLines copied to clipboard! 🎮",
        toast_sound_on: "Sound FX Enabled 🔊",
        toast_sound_off: "Sound FX Muted 🔇",
        clips_desc: "All-time top clips and highlights from twitch.tv/dalines sorted by view count!"
      }
    };

    let currentLang = safeStorage.getItem('dalines_lang') === 'en' ? 'en' : 'th';

    function setLanguage(lang) {
      if (!['th', 'en'].includes(lang)) return;
      currentLang = lang;
      safeStorage.setItem('dalines_lang', lang);
      document.documentElement.lang = lang;

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
          el.innerHTML = translations[lang][key];
        }
      });

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
    // SOUND EFFECTS ENGINE (Web Audio API)
    // -----------------------------------------------------------------
    let audioCtx = null;
    let isSoundEnabled = safeStorage.getItem('dalines_sound') !== 'false';

    function initAudio() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    function playSound(type) {
      if (!isSoundEnabled) return;
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
          gain.connect(audioCtx.destination);
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
            gain.connect(audioCtx.destination);
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
          gain.connect(audioCtx.destination);
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
          gain.connect(audioCtx.destination);
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
          gain.connect(audioCtx.destination);
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
          gain.connect(audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.22);
        }
      } catch (e) {}
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
      noiseGain.connect(audioCtx.destination);
      noise.start(now);

      const subOsc = audioCtx.createOscillator();
      const subGain = audioCtx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(150, now);
      subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      subGain.gain.setValueAtTime(0.25, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      subOsc.connect(subGain);
      subGain.connect(audioCtx.destination);
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
        gain.connect(audioCtx.destination);
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
      gain.connect(audioCtx.destination);
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
      boingGain.connect(audioCtx.destination);
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
      clickGain1.connect(audioCtx.destination);
      click1.start(now);
      click1.stop(now + 0.05);

      const click2 = audioCtx.createOscillator();
      const clickGain2 = audioCtx.createGain();
      click2.type = 'square';
      click2.frequency.setValueAtTime(2200, now + 0.08);
      clickGain2.gain.setValueAtTime(0.18, now + 0.08);
      clickGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      click2.connect(clickGain2);
      clickGain2.connect(audioCtx.destination);
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
        gain.connect(audioCtx.destination);
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
        gain.connect(audioCtx.destination);
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
        gain.connect(audioCtx.destination);
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
        gain.connect(audioCtx.destination);
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
        gain.connect(audioCtx.destination);
        osc.start(now + tOffset);
        osc.stop(now + tOffset + 0.09);
      });
    }

    function toggleSoundFx() {
      isSoundEnabled = !isSoundEnabled;
      safeStorage.setItem('dalines_sound', isSoundEnabled);
      updateSoundIcon();
      if (isSoundEnabled) {
        playSound('pop');
        showToast(translations[currentLang].toast_sound_on);
      } else {
        showToast(translations[currentLang].toast_sound_off);
      }
    }

    function updateSoundIcon() {
      const icon = document.getElementById('sound-icon');
      if (icon) {
        if (isSoundEnabled) {
          icon.className = 'fa-solid fa-volume-high text-xs';
          icon.style.color = 'var(--primary-color)';
        } else {
          icon.className = 'fa-solid fa-volume-xmark text-xs text-slate-500';
          icon.style.color = '';
        }
      }
    }

    // -----------------------------------------------------------------
    // THEME CONTROLLER
    // -----------------------------------------------------------------
    function setTheme(color, silent = false) {
      if (!['emerald', 'cyan', 'purple'].includes(color)) color = 'emerald';
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

    const savedTheme = safeStorage.getItem('dalines_theme') || 'emerald';
    setTheme(savedTheme, true);

    function dismissLiveBanner() {
      const banner = document.getElementById('sticky-live-banner');
      if (banner) {
        banner.style.transform = 'translateY(-100%)';
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 300);
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

    const initializedTabs = new Set();
    function initializeTab(tab) {
      if (initializedTabs.has(tab)) return;
      initializedTabs.add(tab);
      if (tab === 'stream') {
        initClipsVault();
        initEmoteShowcase();
        initStreamCountdown();
      } else if (tab === 'gear') {
        initSensCalculator();
        initRouletteWheel();
      } else if (tab === 'rules') {
        initObsTts();
        initBotCommands();
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      setLanguage(currentLang);
      updateSoundIcon();
      initCyberCanvas();
      setupModals();

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
      document.addEventListener('pointerdown', e => {
        if (prefersQuietEffects() || e.pointerType === 'touch') return;
        playSound('sparkle');
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#10b981';
        for (let i = 0; i < 4; i++) {
          const sparkle = document.createElement('div');
          sparkle.className = 'sparkle-particle';
          sparkle.style.cssText = 'width:5px;height:5px;background:' + color + ';left:' + e.clientX + 'px;top:' + e.clientY + 'px';
          const angle = Math.random() * Math.PI * 2;
          sparkle.style.setProperty('--tx', (Math.cos(angle) * 35 - 50) + '%');
          sparkle.style.setProperty('--ty', (Math.sin(angle) * 35 - 50) + '%');
          document.body.appendChild(sparkle);
          setTimeout(() => sparkle.remove(), 650);
        }
      }, { passive: true });

      const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
      const tabContents = document.querySelectorAll('.tab-content');
      const tabList = tabButtons[0]?.parentElement;
      tabList?.setAttribute('role', 'tablist');
      tabList?.setAttribute('aria-label', 'DaLines');
      function activateTab(button, focus = false) {
        const target = button.dataset.tab;
        playSound('tab');
        initializeTab(target);
        tabContents.forEach(panel => {
          const selected = panel.id === 'tab-' + target;
          panel.classList.toggle('active', selected);
          panel.hidden = !selected;
        });
        tabButtons.forEach(btn => {
          const selected = btn === button;
          btn.setAttribute('aria-selected', String(selected));
          btn.tabIndex = selected ? 0 : -1;
          btn.classList.toggle('theme-active-btn', selected);
          btn.classList.toggle('text-slate-400', !selected);
          btn.classList.toggle('font-medium', !selected);
        });
        if (target === 'stream') updateTwitchPlayer(currentPlayerMode);
        else stopStreamEmbeds();
        if (target === 'pc') {
          document.getElementById('tab-pc')?.querySelectorAll('.counter-number').forEach(counter => {
            counter.textContent = counter.dataset.target;
          });
        }
        if (focus) button.focus();
      }
      tabButtons.forEach((button, index) => {
        const tab = button.dataset.tab;
        button.id ||= 'tab-button-' + tab;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', 'tab-' + tab);
        const panel = document.getElementById('tab-' + tab);
        if (panel) {
          panel.setAttribute('role', 'tabpanel');
          panel.setAttribute('aria-labelledby', button.id);
          panel.tabIndex = 0;
          panel.hidden = !panel.classList.contains('active');
        }
        const selected = Boolean(panel?.classList.contains('active'));
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
        button.addEventListener('click', event => { event.preventDefault(); activateTab(button); });
        button.addEventListener('keydown', event => {
          let next;
          if (event.key === 'ArrowRight') next = (index + 1) % tabButtons.length;
          else if (event.key === 'ArrowLeft') next = (index - 1 + tabButtons.length) % tabButtons.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = tabButtons.length - 1;
          else return;
          event.preventDefault(); activateTab(tabButtons[next], true);
        });
      });
      const activeTab = tabButtons.find(button => button.getAttribute('aria-selected') === 'true');
      if (activeTab) initializeTab(activeTab.dataset.tab);

      document.getElementById('btn-share')?.addEventListener('click', () => {
        playSound('pop');
        if (navigator.share) {
          navigator.share({ title: 'DaLines | Profile Hub & Battle Station', url: window.location.href }).catch(() => {});
        } else copyTextToClipboard(window.location.href, translations[currentLang].toast_copy_link);
      });
      startLiveStatusPolling();
    });

    let currentLiveState = false;
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
      const controller = new AbortController();
      liveStatusRequest = controller;
      lastLiveStatusCheck = Date.now();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const [uptimeRes, gameRes] = await Promise.all([
          fetch('https://decapi.me/twitch/uptime/dalines', { signal: controller.signal }),
          fetch('https://decapi.me/twitch/game/dalines', { signal: controller.signal })
        ]);
        if (!uptimeRes.ok) return;
        const uptime = (await uptimeRes.text()).trim();
        const game = gameRes.ok ? (await gameRes.text()).trim() : '';

        if (!uptime || /error|not found|rate limit|too many|unknown/i.test(uptime)) return;
        const hasDuration = /\d+\s*(?:days?|hours?|minutes?|seconds?)/i.test(uptime);
        if (!hasDuration && !/offline/i.test(uptime)) return;
        const isLive = hasDuration && !/offline/i.test(uptime);
        currentLiveState = isLive;

        const liveDot = document.getElementById('live-dot');
        const textBadge = document.getElementById('live-text-badge');
        const bannerDesc = document.getElementById('live-banner-desc');
        const btnText = document.getElementById('live-banner-btn-text');
        const streamBadge = currentPlayerMode === 'live' ? document.getElementById('player-status-badge') : null;

        if (isLive) {
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
        } else {
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
            streamBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-gaming font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1';
            streamBadge.textContent = 'OFFLINE';
          }
        }
      } catch (err) {
        // Keep the last known status during a transient network failure.
      } finally {
        clearTimeout(timeout);
        if (liveStatusRequest === controller) liveStatusRequest = null;
      }
    }

    const VALORANT_CROSSHAIR = '0;p;0;c;1;s;1;P;c;7;t;6;o;1;d;1;z;6;a;0;f;0;m;1;0l;3;0o;7;0a;0;0f;0;1t;10;1l;3;1o;6;1a;0;1m;0;1e;0.338;A;c;7;t;6;o;1;d;1;z;6;a;0;m;1;0t;3;0l;3;0o;5;0a;0;0f;0;1t;10;1l;3;1o;3;1a;0;1m;0;1e;3;S;c;6;s;4;o;1';

    function copyValorantCrosshair() {
      playSound('pop');
      return copyTextToClipboard(VALORANT_CROSSHAIR, translations[currentLang].toast_copy_crosshair || 'คัดลอกโค้ดเป้า Valorant เรียบร้อย! 🎯');
    }

    let toastTimer = 0;
    function showToast(msg) {
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
      return copyTextToClipboard('DaLines', translations[currentLang].toast_copy_ign);
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
      // Connect only on an explicit click; ordinary visitors do not need WebRTC or PeerJS.
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
      } catch(e) {
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
          muteBtn.innerHTML = '<i aria-hidden="true" class="fa-solid fa-volume-xmark"></i> Muted (เปิดเสียง)';
        } else {
          muteBtn.className = 'px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-[10px] font-medium transition cursor-pointer flex items-center gap-1';
          muteBtn.innerHTML = '<i aria-hidden="true" class="fa-solid fa-volume-high"></i> Mute/Unmute';
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
    function setupModals() {
      ['modal-tts-helper', 'modal-clip-player'].forEach(id => {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', 'true');
        modal.addEventListener('click', event => {
          if (event.target === modal) id === 'modal-clip-player' ? closeClipModal() : closeTtsHelperModal();
        });
      });
      document.addEventListener('keydown', event => {
        const modal = ['modal-clip-player', 'modal-tts-helper'].map(id => document.getElementById(id)).find(el => el && !el.classList.contains('hidden'));
        if (!modal) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          modal.id === 'modal-clip-player' ? closeClipModal() : closeTtsHelperModal();
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
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }

    // -----------------------------------------------------------------
    // DALINES HALL OF FAME & HIGHLIGHTS VAULT (TWITCH CLIPS: range=all)
    // Source: https://www.twitch.tv/dalines/clips?range=all
    // -----------------------------------------------------------------
    const DALINES_CLIPS = [
      {
            "id": "clip-1",
            "slug": "ElegantEagerGoldfishAMPEnergyCherry-9uGytF396fyRA5xc",
            "title": "นัวอะไรขนาดนั้น",
            "game": "VALORANT",
            "curator": "DaLines",
            "views": 216,
            "duration": "0:26",
            "category": "valorant",
            "badge": "👑 #1 ALL-TIME TOP",
            "badgeClass": "bg-amber-500/20 text-amber-300 border-amber-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/a7fd0812-aabe-4df1-9c62-33f743f76411/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/ElegantEagerGoldfishAMPEnergyCherry-9uGytF396fyRA5xc",
            "createdAt": "2022-04-03"
      },
      {
            "id": "clip-2",
            "slug": "DifficultNiceGarageUncleNox",
            "title": "Dancing : รถซื้อแกง",
            "game": "Just Chatting",
            "curator": "feixian1412",
            "views": 192,
            "duration": "0:24",
            "category": "other",
            "badge": "🥈 #2 TOP VIRAL",
            "badgeClass": "bg-slate-400/20 text-slate-200 border-slate-400/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/f7f6701f-12bc-4972-8330-054b2c7ce6e8/landscape/thumb/thumb-0000000000-1280x720.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/DifficultNiceGarageUncleNox",
            "createdAt": "2020-05-06"
      },
      {
            "id": "clip-3",
            "slug": "RealChillyPancakeKeepo-XUD53z3NRrGzcqkB",
            "title": "A clear? then go B",
            "game": "VALORANT",
            "curator": "DaLines",
            "views": 172,
            "duration": "0:30",
            "category": "valorant",
            "badge": "🥉 #3 TOP HIGHLIGHT",
            "badgeClass": "bg-orange-500/20 text-orange-300 border-orange-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/42467f1d-f0d1-4e95-9449-b7f6a84f18c7/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/RealChillyPancakeKeepo-XUD53z3NRrGzcqkB",
            "createdAt": "2021-09-29"
      },
      {
            "id": "clip-4",
            "slug": "BitterBraveTomatoEleGiggle-LCD4OrW4n4OP0N5Z",
            "title": "โนเอลร้องเพลง",
            "game": "Grand Theft Auto V",
            "curator": "DaLines",
            "views": 145,
            "duration": "0:26",
            "category": "other",
            "badge": "🚗 GTA V RP",
            "badgeClass": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/79fa3232-4084-4500-841a-62a6a2908872/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/BitterBraveTomatoEleGiggle-LCD4OrW4n4OP0N5Z",
            "createdAt": "2022-05-28"
      },
      {
            "id": "clip-5",
            "slug": "EnchantingLaconicSparrowTheTarFu",
            "title": "Skip Valorant battle pass 50 tiers",
            "game": "VALORANT",
            "curator": "Archuron",
            "views": 119,
            "duration": "0:59",
            "category": "valorant",
            "badge": "🎯 VALORANT",
            "badgeClass": "bg-rose-500/20 text-rose-300 border-rose-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/bac763d1-bca8-4134-be26-72ce11275692/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/EnchantingLaconicSparrowTheTarFu",
            "createdAt": "2020-10-13"
      },
      {
            "id": "clip-6",
            "slug": "KnottyCuriousCattleHoneyBadger",
            "title": "360 stinger",
            "game": "VALORANT",
            "curator": "DaLines",
            "views": 111,
            "duration": "0:28",
            "category": "valorant",
            "badge": "🎯 VALORANT",
            "badgeClass": "bg-rose-500/20 text-rose-300 border-rose-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/ba2fdbe3-d147-49d5-bfa8-6bb6a71dc3c9/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/KnottyCuriousCattleHoneyBadger",
            "createdAt": "2021-02-08"
      },
      {
            "id": "clip-7",
            "slug": "DependableGracefulWheelBrainSlug-SMdvjtBZ4jL7qMpP",
            "title": "สมแล้วที่ชื่อ TaoHooo",
            "game": "VALORANT",
            "curator": "zealproject",
            "views": 110,
            "duration": "0:28",
            "category": "valorant",
            "badge": "🎯 VALORANT",
            "badgeClass": "bg-rose-500/20 text-rose-300 border-rose-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/71cbeeed-d997-4d68-ad0c-c72b7033ddf3/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/DependableGracefulWheelBrainSlug-SMdvjtBZ4jL7qMpP",
            "createdAt": "2021-04-11"
      },
      {
            "id": "clip-8",
            "slug": "PlainDiligentWolfBudBlast",
            "title": "Scrim เค้าเล่นกันอย่างนี้",
            "game": "Apex Legends",
            "curator": "DaLines",
            "views": 110,
            "duration": "1:00",
            "category": "apex",
            "badge": "⚡ APEX HIGHLIGHT",
            "badgeClass": "bg-amber-500/20 text-amber-300 border-amber-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/42c88ec2-96e0-486d-b9ed-1b14be00edc8/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/PlainDiligentWolfBudBlast",
            "createdAt": "2020-05-09"
      },
      {
            "id": "clip-9",
            "slug": "ProtectiveVainGrouseBrokeBack",
            "title": "ท่าหมา",
            "game": "Apex Legends",
            "curator": "ssingtho",
            "views": 100,
            "duration": "0:09",
            "category": "apex",
            "badge": "🏆 APEX MOMENT",
            "badgeClass": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/208d4b9d-daa6-41e0-8b6a-8d1ea6d6c2be/landscape/thumb/thumb-0000000000-1280x720.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/ProtectiveVainGrouseBrokeBack",
            "createdAt": "2019-12-03"
      },
      {
            "id": "clip-10",
            "slug": "LitigiousIronicSageBCouch-ec4xE4jyeoPJ3qif",
            "title": "กดเรี���กเคสมั้ยล่ะ 55555",
            "game": "Grand Theft Auto V",
            "curator": "DaLines",
            "views": 94,
            "duration": "1:00",
            "category": "other",
            "badge": "🚗 GTA V RP",
            "badgeClass": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/15059b4c-070a-45bc-9f6c-7084d18e04fc/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/LitigiousIronicSageBCouch-ec4xE4jyeoPJ3qif",
            "createdAt": "2022-02-20"
      },
      {
            "id": "clip-11",
            "slug": "EnergeticImpossibleClipsdadKappaWealth",
            "title": "โนตม",
            "game": "Apex Legends",
            "curator": "Archuron",
            "views": 90,
            "duration": "0:07",
            "category": "apex",
            "badge": "🏆 APEX MOMENT",
            "badgeClass": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/923a3fcd-3e25-4080-9eee-1beb1c547391/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/EnergeticImpossibleClipsdadKappaWealth",
            "createdAt": "2020-11-20"
      },
      {
            "id": "clip-12",
            "slug": "LachrymoseObliviousCardHeyGirl",
            "title": "RE-45 330m+ ",
            "game": "Apex Legends",
            "curator": "DaLines",
            "views": 84,
            "duration": "0:33",
            "category": "apex",
            "badge": "🏆 APEX MOMENT",
            "badgeClass": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/0bc22c82-b040-4ddd-812a-361460ff1919/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/LachrymoseObliviousCardHeyGirl",
            "createdAt": "2020-05-24"
      },
      {
            "id": "clip-13",
            "slug": "InterestingRealBorkRalpherZ-a3CT1ubdygsDQTqS",
            "title": "[ace] รีบขึ้นได โทษที",
            "game": "VALORANT",
            "curator": "DaLines",
            "views": 82,
            "duration": "0:30",
            "category": "valorant",
            "badge": "🔥 VALORANT ACE",
            "badgeClass": "bg-red-500/20 text-red-300 border-red-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/6a2f7b98-be2d-45b7-9933-a871b4e782bc/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/InterestingRealBorkRalpherZ-a3CT1ubdygsDQTqS",
            "createdAt": "2023-08-10"
      },
      {
            "id": "clip-14",
            "slug": "CuriousAffluentNewtSuperVinlin",
            "title": "3 เกม apex 10 kills XD",
            "game": "VALORANT",
            "curator": "DaLines",
            "views": 80,
            "duration": "1:00",
            "category": "valorant",
            "badge": "🎯 VALORANT",
            "badgeClass": "bg-rose-500/20 text-rose-300 border-rose-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/41e514a8-e92c-4eb4-a19a-7e7a98efd3a5/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/CuriousAffluentNewtSuperVinlin",
            "createdAt": "2021-01-28"
      },
      {
            "id": "clip-15",
            "slug": "ArtisticAveragePepperoniSoBayed",
            "title": "เชี้ยเฟี้ยวสัส อย่างเท��� idolเลย",
            "game": "VALORANT",
            "curator": "Archuron",
            "views": 80,
            "duration": "0:40",
            "category": "valorant",
            "badge": "🎯 VALORANT",
            "badgeClass": "bg-rose-500/20 text-rose-300 border-rose-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/6b14209d-4958-45b6-b60c-387b1a47143a/landscape/thumb/thumb-0000000000-1664x936.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/ArtisticAveragePepperoniSoBayed",
            "createdAt": "2021-01-06"
      },
      {
            "id": "clip-16",
            "slug": "AggressiveManlyPenguinKappaClaus",
            "title": "หมากัดหัวนม",
            "game": "Apex Legends",
            "curator": "Archuron",
            "views": 80,
            "duration": "0:25",
            "category": "apex",
            "badge": "🏆 APEX MOMENT",
            "badgeClass": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/634b8de6-6953-463a-b706-6b662ef64154/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/AggressiveManlyPenguinKappaClaus",
            "createdAt": "2020-08-22"
      },
      {
            "id": "clip-17",
            "slug": "HandsomeCallousRatMrDestructoid-Zzz6FfuzdD6PI3fy",
            "title": "ฝาแฝดหอยแครง",
            "game": "VALORANT",
            "curator": "typepy",
            "views": 77,
            "duration": "1:00",
            "category": "valorant",
            "badge": "🎯 VALORANT",
            "badgeClass": "bg-rose-500/20 text-rose-300 border-rose-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/bc2ad997-427f-4cf6-8350-9efe70fb2e46/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/HandsomeCallousRatMrDestructoid-Zzz6FfuzdD6PI3fy",
            "createdAt": "2021-09-26"
      },
      {
            "id": "clip-18",
            "slug": "HomelyFurtiveSushiCclamChamp-jCKX-x3I_5Gii6zm",
            "title": "เยนมาเเล้ว",
            "game": "Apex Legends",
            "curator": "guyenna",
            "views": 73,
            "duration": "0:12",
            "category": "apex",
            "badge": "🏆 APEX MOMENT",
            "badgeClass": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/e75a4a7b-2d99-4024-9c13-f0e7a200b8af/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/HomelyFurtiveSushiCclamChamp-jCKX-x3I_5Gii6zm",
            "createdAt": "2021-05-31"
      },
      {
            "id": "clip-19",
            "slug": "MoldyDifficultCougarThisIsSparta",
            "title": "ลงยังไง",
            "game": "Fortnite",
            "curator": "Ammarinn",
            "views": 71,
            "duration": "0:41",
            "category": "other",
            "badge": "🎪 FORTNITE",
            "badgeClass": "bg-blue-500/20 text-blue-300 border-blue-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/6b8c647e-3ea8-41ef-83d0-46c0d2b80431/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/MoldyDifficultCougarThisIsSparta",
            "createdAt": "2020-02-19"
      },
      {
            "id": "clip-20",
            "slug": "LuckyCrispyBasenjiOptimizePrime",
            "title": "God Havoc",
            "game": "Apex Legends",
            "curator": "1StarGamingTH",
            "views": 71,
            "duration": "0:28",
            "category": "apex",
            "badge": "⚡ APEX HIGHLIGHT",
            "badgeClass": "bg-amber-500/20 text-amber-300 border-amber-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/77d29652-6aa8-40b2-85fd-d25b9cb9d42e/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/LuckyCrispyBasenjiOptimizePrime",
            "createdAt": "2020-05-03"
      },
      {
            "id": "clip-21",
            "slug": "AdventurousBlindingButterBIRB",
            "title": "Lucky with largest crosshair",
            "game": "VALORANT",
            "curator": "DaLines",
            "views": 69,
            "duration": "0:23",
            "category": "valorant",
            "badge": "🎯 VALORANT",
            "badgeClass": "bg-rose-500/20 text-rose-300 border-rose-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/4582e1d1-ff92-4392-a61d-4cb74bc3685f/landscape/thumb/thumb-0000000000-1664x936.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/AdventurousBlindingButterBIRB",
            "createdAt": "2021-01-11"
      },
      {
            "id": "clip-22",
            "slug": "ExuberantPlausibleCoyoteStoneLightning",
            "title": "Loba 3.8k Damage",
            "game": "Apex Legends",
            "curator": "DaLines",
            "views": 66,
            "duration": "1:00",
            "category": "apex",
            "badge": "⚡ APEX HIGHLIGHT",
            "badgeClass": "bg-amber-500/20 text-amber-300 border-amber-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/640d4a55-73d5-4f2a-8496-472c6d518bcb/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/ExuberantPlausibleCoyoteStoneLightning",
            "createdAt": "2020-05-15"
      },
      {
            "id": "clip-23",
            "slug": "ComfortableElatedInternSpicyBoy-kX84MxdkorxVtKZH",
            "title": "เป็นแฟนทำไรได้บ้าง",
            "game": "VALORANT",
            "curator": "Archuron",
            "views": 65,
            "duration": "0:05",
            "category": "valorant",
            "badge": "🎯 VALORANT",
            "badgeClass": "bg-rose-500/20 text-rose-300 border-rose-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/db8ad1f1-e699-4871-aaaf-d32a64101407/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/ComfortableElatedInternSpicyBoy-kX84MxdkorxVtKZH",
            "createdAt": "2023-01-15"
      },
      {
            "id": "clip-24",
            "slug": "InnocentTangiblePuppyDancingBaby",
            "title": "หลุด",
            "game": "Apex Legends",
            "curator": "typepy",
            "views": 60,
            "duration": "0:28",
            "category": "apex",
            "badge": "🏆 APEX MOMENT",
            "badgeClass": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
            "thumbnailUrl": "https://static-cdn.jtvnw.net/twitch-video-assets/twitch-vap-video-assets-prod-us-west-2/da18730e-cc88-48bd-87a9-d5836fe88504/landscape/thumb/thumb-0000000000-1920x1080.jpg",
            "clipUrl": "https://www.twitch.tv/dalines/clip/InnocentTangiblePuppyDancingBaby",
            "createdAt": "2020-05-10"
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
        const likes = clip.views + (isLiked ? 1 : 0);
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
                <i aria-hidden="true" class="fa-solid fa-eye text-[8px]"></i>
                <span>${clip.views} views</span>
              </div>

              <!-- Center Play Icon -->
              <div class="absolute inset-0 flex items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity">
                <div class="w-10 h-10 rounded-full bg-[#9146FF]/90 group-hover:bg-[#9146FF] text-white flex items-center justify-center text-sm shadow-[0_0_20px_rgba(145,70,255,0.7)] group-hover:scale-110 transition-transform">
                  <i aria-hidden="true" class="fa-solid fa-play ml-0.5 text-xs"></i>
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
                  <span class="truncate"><i aria-hidden="true" class="fa-solid fa-user-pen text-[9px] text-purple-400 mr-1"></i>${escapeHtml(clip.curator)}</span>
                  <span class="text-slate-500 shrink-0 font-medium">${clip.game}</span>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5 text-xs">
                <button type="button" onclick="openClipModal('${clip.id}')" class="px-2.5 py-1.5 rounded-lg bg-[#9146FF]/30 hover:bg-[#9146FF] text-purple-200 hover:text-white border border-[#9146FF]/50 text-[10px] font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer shadow">
                  <i aria-hidden="true" class="fa-solid fa-play text-[8px]"></i>
                  <span>ชมคลิป</span>
                </button>

                <div class="flex items-center gap-1">
                  <!-- Like Button -->
                  <button type="button" onclick="toggleClipLike('${clip.id}', event)" class="px-2 py-1 rounded-lg ${isLiked ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'bg-slate-800 text-slate-400 hover:text-pink-400'} text-[10px] font-mono transition flex items-center gap-1 cursor-pointer active:scale-90" title="ถูกใจคลิป">
                    <i aria-hidden="true" class="fa-${isLiked ? 'solid' : 'regular'} fa-heart ${isLiked ? 'text-pink-400' : ''}"></i>
                    <span id="like-count-${clip.id}">${likes}</span>
                  </button>

                  <!-- Direct Link on Twitch -->
                  <a href="${clip.clipUrl}" target="_blank" rel="noopener noreferrer" class="p-1.5 rounded-lg bg-slate-800 hover:bg-[#9146FF]/40 text-slate-400 hover:text-white text-[10px] transition cursor-pointer" title="เปิดดูบน Twitch">
                    <i aria-hidden="true" class="fa-brands fa-twitch"></i>
                  </a>

                  <!-- Share Link Button -->
                  <button type="button" onclick="shareClip('${clip.id}', event)" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] transition cursor-pointer" title="แชร์คลิป">
                    <i aria-hidden="true" class="fa-solid fa-share-nodes"></i>
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
      if (badge) badge.innerText = `${clip.game.toUpperCase()} • ${clip.views} VIEWS • CLIPPED BY ${clip.curator.toUpperCase()}`;
      
      const hostname = window.location.hostname || 'dalines-site.dalines.workers.dev';
      const embedUrl = `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip.slug)}&parent=${hostname}&parent=localhost&parent=127.0.0.1&parent=dalines-site.dalines.workers.dev&parent=dalines.pages.dev&autoplay=true`;
      if (iframe) iframe.src = embedUrl;

      if (extLink) {
        extLink.href = clip.clipUrl;
        extLink.innerHTML = `<i aria-hidden="true" class="fa-brands fa-twitch"></i> <span>เปิดบน Twitch</span> <i aria-hidden="true" class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>`;
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
      e.stopPropagation();
      playSound('pop');
      const clip = DALINES_CLIPS.find(c => c.id === clipId);
      if (!clip) return;
      return copyTextToClipboard(`${clip.title} - ชมคลิป DaLines จาก Twitch: ${clip.clipUrl}`, 'คัดลอกลิงก์คลิป Twitch เรียบร้อย! 🎬');
    }

    // -----------------------------------------------------------------
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
                  <i aria-hidden="true" class="${game.icon} text-xs"></i>
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
                <i aria-hidden="true" class="fa-regular fa-copy text-[9px]"></i>
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
      currentBaseSens = (gameKey === 'valorant') ? 0.3 : 1.8;

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
    // NIGHTBOT STREAM COMMANDS HUB
    // -----------------------------------------------------------------
    const NIGHTBOT_COMMANDS = [
      // 🎯 เป้า & ความไวเมาส์ (Aim & Sens)
      {
        name: "!sens",
        cat: "aim",
        desc: "ความไวเมาส์ในเกม (In-game Sensitivity)",
        response: "Valorant : in game sens : 0.3 // ADS : 1.0 | Apex : in game sens : 1.8 // ADS : 1.0",
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
        response: "หลัก DaLines #0001 | ไก่1 DaLines #0002 | ไก่2 DaLines #0003 | ไก่3 DaLines #0004 | ไก่4 DaLines #0005",
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
        response: "CPU: Ryzen 7 2700 | GPU: GTX 1070 8GB OC | RAM: Corsair RGB Pro 16GB (3000MHz) | Monitor: Xiaomi Mi 2K 27\" (165Hz) + Dell 144Hz",
        tags: ["spec", "specs", "สเปก", "คอม", "cpu", "gpu", "จอ"]
      },
      {
        name: "!mouse",
        cat: "gear",
        desc: "เมาส์เกมมิ่งประจำกาย",
        response: "Loga Garuda Wireless",
        tags: ["mouse", "เมาส์", "loga", "garuda"]
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
        response: "https://discord.gg/62uf9BE",
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
              <i aria-hidden="true" class="fa-solid fa-arrow-up-right-from-square text-[8px]"></i>
            </a>
          `;
        }

        return `
          <div class="p-2.5 sm:p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 group flex flex-col justify-between shadow-sm">
            <div>
              <div class="flex items-center justify-between gap-1.5 mb-1.5">
                <button type="button" onclick="copyBotCommand('${safeName}', this)" class="cmd-badge-btn px-2 py-0.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/40 text-indigo-300 font-mono font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer" title="คลิกเพื่อคัดลอกคำสั่ง">
                  <span>${safeName}</span>
                  <i aria-hidden="true" class="fa-regular fa-copy text-[10px] opacity-70 group-hover:opacity-100"></i>
                </button>
                <span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">${cmd.cat}</span>
              </div>
              <div class="text-[11px] font-medium text-slate-300 mb-1 leading-snug">${safeDesc}</div>
              <div class="text-[10px] text-slate-400 bg-black/40 border border-slate-800/80 rounded-lg p-1.5 font-mono break-all line-clamp-2 select-all">${safeResp}</div>
            </div>
            <div class="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between gap-1">
              <button type="button" onclick="copyBotCommand('${safeName}', this)" class="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition cursor-pointer">
                <i aria-hidden="true" class="fa-solid fa-terminal text-[9px]"></i>
                <span>ก๊อปปี้คำสั่ง</span>
              </button>
              <div class="flex items-center gap-1">
                ${linkBtn}
                <button type="button" onclick="copyBotResponse('${safeResp.replace(/'/g, "\\'")}', this)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium transition active:scale-95 cursor-pointer" title="คัดลอกคำตอบ">
                  <i aria-hidden="true" class="fa-regular fa-clipboard text-[9px]"></i>
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

