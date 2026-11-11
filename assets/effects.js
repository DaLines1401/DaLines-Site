    // --- 1. Interactive Cyber Constellation Canvas Engine ---
    let cyberParticles = [];
    let cyberMouse = { x: -9999, y: -9999, radius: 120 };

    let cyberCanvasInitialized = false;
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

    function allowsDecorativeMotion() {
      return !motionPreference.matches && !navigator.connection?.saveData;
    }

    function initCyberCanvas() {
      if (cyberCanvasInitialized) return;
      const canvas = document.getElementById('cyber-bg-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      cyberCanvasInitialized = true;

      let width = 0;
      let height = 0;
      let frame = 0;
      let resizeFrame = 0;
      let lastFrameTime = 0;
      let maxDistance = 115;
      const frameDuration = 1000 / 30;

      function resize() {
        width = Math.max(1, window.innerWidth);
        height = Math.max(1, window.innerHeight);
        const scale = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        const isMobile = width < 768;
        maxDistance = isMobile ? 85 : 115;
        const particleCount = isMobile ? 24 : 44;
        cyberParticles = Array.from({ length: particleCount }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.65,
          vy: (Math.random() - 0.5) * 0.65,
          size: Math.random() * 1.8 + 1,
          baseAlpha: Math.random() * 0.45 + 0.35
        }));
      }

      function getPrimaryRGB() {
        const theme = document.documentElement.dataset.theme;
        if (theme === 'cyan') return '6, 182, 212';
        if (theme === 'purple') return '168, 85, 247';
        return '16, 185, 129';
      }

      function draw(timestamp) {
        frame = 0;
        if (document.hidden || !allowsDecorativeMotion()) return;
        frame = requestAnimationFrame(draw);
        const elapsed = timestamp - lastFrameTime;
        if (elapsed < frameDuration) return;
        const step = Math.min(elapsed / (1000 / 60), 3);
        lastFrameTime = timestamp - (elapsed % frameDuration);
        ctx.clearRect(0, 0, width, height);
        const rgb = getPrimaryRGB();

        for (const p of cyberParticles) {
          p.x += p.vx * step;
          p.y += p.vy * step;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
          const dx = cyberMouse.x - p.x;
          const dy = cyberMouse.y - p.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared > 0 && distanceSquared < cyberMouse.radius ** 2) {
            const distance = Math.sqrt(distanceSquared);
            const force = (1 - distance / cyberMouse.radius) * 1.8 * step;
            p.x -= dx / distance * force;
            p.y -= dy / distance * force;
          }
        }

        ctx.shadowBlur = 0;
        ctx.lineWidth = 0.8;
        const maxDistanceSquared = maxDistance * maxDistance;
        for (let i = 0; i < cyberParticles.length; i++) {
          const p = cyberParticles[i];
          for (let j = i + 1; j < cyberParticles.length; j++) {
            const p2 = cyberParticles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const distanceSquared = dx * dx + dy * dy;
            if (distanceSquared < maxDistanceSquared) {
              const alpha = (1 - Math.sqrt(distanceSquared) / maxDistance) * 0.28;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = 'rgba(' + rgb + ', ' + alpha + ')';
              ctx.stroke();
            }
          }
        }
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(' + rgb + ', 0.8)';
        for (const p of cyberParticles) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + rgb + ', ' + p.baseAlpha + ')';
          ctx.fill();
        }
      }

      function syncAnimation() {
        document.documentElement.classList.toggle('page-hidden', document.hidden);
        if (document.hidden || !allowsDecorativeMotion()) {
          cancelAnimationFrame(frame);
          frame = 0;
          if (!allowsDecorativeMotion()) ctx.clearRect(0, 0, width, height);
          return;
        }
        if (!frame) {
          lastFrameTime = performance.now();
          frame = requestAnimationFrame(draw);
        }
      }

      window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => { resize(); syncAnimation(); });
      }, { passive: true });
      window.addEventListener('pointermove', (event) => {
        if (!allowsDecorativeMotion() || event.pointerType === 'touch') return;
        cyberMouse.x = event.clientX;
        cyberMouse.y = event.clientY;
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => {
        cyberMouse.x = cyberMouse.y = -9999;
      });
      document.addEventListener('visibilitychange', syncAnimation);
      motionPreference.addEventListener?.('change', syncAnimation);
      navigator.connection?.addEventListener?.('change', syncAnimation);
      window.addEventListener('pagehide', () => {
        cancelAnimationFrame(frame);
        cancelAnimationFrame(resizeFrame);
        frame = 0;
      });
      window.addEventListener('pageshow', syncAnimation);
      resize();
      syncAnimation();
    }

    // =========================================================================
    // 📅 1. WEEKLY STREAM SCHEDULE & RADAR COUNTDOWN ENGINE
    // =========================================================================

    const WEEKLY_SCHEDULE_DATA = [
      { day: 0, name: "วันอาทิตย์ (Sunday)", status: "OFF", badge: "💤 วันพักผ่อน", game: "😴 พักผ่อนชาร์จพลัง • เจอกันใหม่วันจันทร์", time: "OFF DAY", icon: "fa-bed", isLive: false },
      { day: 1, name: "วันจันทร์ (Monday)", status: "LIVE", badge: "🟢 LIVE 19:30", game: "🎯 Valorant ไต่แรงค์กับตวง • สายยิงเน้นโยน", time: "19:30 - 23:30", icon: "fa-crosshairs", isLive: true },
      { day: 2, name: "วันอังคาร (Tuesday)", status: "LIVE", badge: "🟢 LIVE 19:30", game: "🏹 Valorant ลุยเดี่ยว • ฝึกเป้าเล็งวันแท็ป", time: "19:30 - 23:30", icon: "fa-bullseye", isLive: true },
      { day: 3, name: "วันพุธ (Wednesday)", status: "LIVE", badge: "🟢 LIVE 19:30", game: "🛡️ Apex Legends / Party เล่นกับคนดู", time: "19:30 - 23:30", icon: "fa-shield-halved", isLive: true },
      { day: 4, name: "วันพฤหัสบดี (Thursday)", status: "LIVE", badge: "🟢 LIVE 19:30", game: "🎯 Valorant Custom Game กับคนดูในดิสคอร์ด", time: "19:30 - 23:30", icon: "fa-users", isLive: true },
      { day: 5, name: "วันศุกร์ (Friday)", status: "LIVE", badge: "🔥 FRIDAY NIGHT", game: "🍻 Friday Night Live สตรีมยาวๆ ฉลองสุดสัปดาห์", time: "20:00 - 00:30", icon: "fa-fire", isLive: true },
      { day: 6, name: "วันเสาร์ (Saturday)", status: "LIVE", badge: "⭐ WEEKEND SPECIAL", game: "🎮 วาไรตี้ & ชาเลนจ์สุดปั่นตามใจคนดู", time: "19:00 - 23:30", icon: "fa-trophy", isLive: true }
    ];

    let selectedScheduleDayIndex = 1;

    function selectScheduleDay(dayIndex, silent = false) {
      selectedScheduleDayIndex = dayIndex;
      if (!silent) playSound('tab');

      // Update active button state
      document.querySelectorAll('.schedule-day-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById(`sched-day-${dayIndex}`);
      if (activeBtn) activeBtn.classList.add('active');

      const data = WEEKLY_SCHEDULE_DATA.find(d => d.day === dayIndex);
      if (!data) return;

      const cardDay = document.getElementById('sched-detail-day');
      const cardBadge = document.getElementById('sched-detail-badge');
      const cardGame = document.getElementById('sched-detail-game');
      const cardTime = document.getElementById('sched-detail-time');
      const cardIcon = document.getElementById('sched-detail-icon');

      if (cardDay) cardDay.textContent = data.name;
      if (cardGame) cardGame.textContent = data.game;
      if (cardTime) cardTime.textContent = data.time;

      if (cardBadge) {
        cardBadge.textContent = data.badge;
        cardBadge.className = data.isLive 
          ? "px-2 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          : "px-2 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700";
      }

      if (cardIcon) {
        cardIcon.innerHTML = `<i aria-hidden="true" class="fa-solid ${data.icon}"></i>`;
        cardIcon.className = data.isLive
          ? "w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-sm shrink-0"
          : "w-8 h-8 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center text-sm shrink-0";
      }
    }

    const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
    let streamCountdownInitialized = false;

    // Work in Bangkok's calendar even when a visitor is in a different time zone.
    function getNextStreamStart(nowEpoch = Date.now()) {
      const localNow = new Date(nowEpoch + BANGKOK_OFFSET_MS);
      for (let offset = 0; offset <= 7; offset++) {
        const localDay = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + offset));
        const schedule = WEEKLY_SCHEDULE_DATA.find(item => item.day === localDay.getUTCDay());
        if (!schedule?.isLive) continue;
        const [hours, minutes] = schedule.time.split(' - ')[0].split(':').map(Number);
        const target = Date.UTC(localDay.getUTCFullYear(), localDay.getUTCMonth(), localDay.getUTCDate(), hours, minutes) - BANGKOK_OFFSET_MS;
        if (target > nowEpoch) return { target, schedule, offset };
      }
      return null;
    }

    function initStreamCountdown() {
      if (streamCountdownInitialized) return;
      const elH = document.getElementById('countdown-hours');
      const elM = document.getElementById('countdown-minutes');
      const elS = document.getElementById('countdown-seconds');
      if (!elH || !elM || !elS) return;
      streamCountdownInitialized = true;
      const nextStreamText = document.getElementById('next-stream-time-text');
      let timer = null;
      let inView = !('IntersectionObserver' in window);
      let markedDay = -1;

      function updateTimer() {
        const now = Date.now();
        const today = new Date(now + BANGKOK_OFFSET_MS).getUTCDay();
        if (today !== markedDay) {
          document.querySelectorAll('.schedule-day-btn.today-indicator').forEach(button => button.classList.remove('today-indicator'));
          document.getElementById('sched-day-' + today)?.classList.add('today-indicator');
          if (markedDay === -1) selectScheduleDay(today, true);
          markedDay = today;
        }
        const next = getNextStreamStart(now);
        if (!next) return;
        const diff = Math.max(0, next.target - now);
        const values = [Math.floor(diff / 3600000), Math.floor(diff % 3600000 / 60000), Math.floor(diff % 60000 / 1000)];
        [elH, elM, elS].forEach((element, index) => {
          const value = String(values[index]).padStart(2, '0');
          if (element.textContent !== value) element.textContent = value;
        });
        if (nextStreamText) {
          const time = next.schedule.time.split(' - ')[0];
          const text = next.schedule.name + ' ' + time + ' (UTC+7)';
          if (nextStreamText.textContent !== text) nextStreamText.textContent = text;
        }
      }

      function syncTimer() {
        clearTimeout(timer);
        timer = null;
        if (document.hidden || !inView) return;
        updateTimer();
        timer = setTimeout(syncTimer, 1000 - Date.now() % 1000);
      }

      updateTimer();
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
          inView = entries[0].isIntersecting;
          syncTimer();
        });
        observer.observe(elH.closest('.cyber-hud-box') || elH);
      }
      document.addEventListener('visibilitychange', syncTimer);
      window.addEventListener('pagehide', () => clearTimeout(timer));
      window.addEventListener('pageshow', syncTimer);
      syncTimer();
    }

    // =========================================================================
    // 🎛️ 2. DALINES CYBER MEME SOUNDBOARD ENGINE
    // =========================================================================

    let visualizerTimer = null;

    function playCyberSound(soundId) {
      if (!isSoundEnabled) {
        showToast('เปิดเสียงเอฟเฟกต์ที่ปุ่มลำโพงมุมขวาบนก่อนนะครับ 🔊');
        return;
      }
      initAudio();
      const now = audioCtx.currentTime;

      triggerSpectrumBounce();

      if (soundId === 'aim_miss') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
        showToast('🎯 สายยิงเน้นโยน! วืดเป็นงานประจำ');
      } else if (soundId === 'laser_sharp') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(2400, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.18);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
        showToast('⚡ One Tap ลั่นหัว! คมจัดปลัดบอก');
      } else if (soundId === 'miracle_clutch') {
        [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + idx * 0.06);
          gain.gain.setValueAtTime(0.08, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.4);
        });
        showToast('🔮 คลัตช์ 1v5! ปาฏิหาริย์เกิดขึ้นจริง');
      } else if (soundId === 'karma_out') {
        [320, 280, 240, 180].forEach((f, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now + idx * 0.09);
          gain.gain.setValueAtTime(0.1, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.08);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.08);
        });
        showToast('💀 แต้มบุญหมด! แตกหนึ่งสวยพี่สวย');
      } else if (soundId === 'donate_cash') {
        [987.77, 1318.51].forEach((f, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.07);
          gain.gain.setValueAtTime(0.12, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.35);
        });
        showToast('💰 โดเนทเข้าแล้วจ้า! ขอบพระคุณมากครับ');
      } else if (soundId === 'thank_you') {
        [440, 554.37, 659.25, 880].forEach((f) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.5);
        });
        showToast('🙏 ขอบคุณสำหรับการสนับสนุนและรับชมครับ!');
      }
    }

    function triggerSpectrumBounce() {
      const bars = document.querySelectorAll('.spectrum-bar');
      if (!bars.length || document.hidden || !allowsDecorativeMotion()) return;

      if (visualizerTimer) clearInterval(visualizerTimer);
      let count = 0;
      visualizerTimer = setInterval(() => {
        if (document.hidden) { clearInterval(visualizerTimer); visualizerTimer = null; return; }
        bars.forEach(bar => {
          const randH = Math.floor(Math.random() * 18) + 4;
          bar.style.height = `${randH}px`;
        });
        count++;
        if (count > 8) {
          clearInterval(visualizerTimer);
          bars.forEach((bar, idx) => {
            bar.style.height = `${(idx % 3 + 1) * 3}px`;
          });
        }
      }, 70);
    }

    // =========================================================================
    // 🎯 3. INTERACTIVE CANVAS ROULETTE CHALLENGE WHEEL ENGINE
    // =========================================================================

    const WHEEL_CONFIG = {
      weapons: {
        title: "โหมดสุ่มปืน",
        items: [
          { text: "Odin", color: "#ef4444", desc: "สายกดยาวไม่ปล่อย" },
          { text: "Judge", color: "#06b6d4", desc: "ลูกซองประชิดไซท์" },
          { text: "Sheriff", color: "#f59e0b", desc: "วันแท็ปหัวคมๆ" },
          { text: "Vandal", color: "#10b981", desc: "ปืนหลักกู้ชาติ" },
          { text: "Operator", color: "#a855f7", desc: "สไนเปอร์นัดเดียวจอด" },
          { text: "Bucky", color: "#ec4899", desc: "ลูกซองสไนเปอร์" },
          { text: "Classic", color: "#3b82f6", desc: "ปืนพกฟรีทั้งเกม" },
          { text: "Phantom", color: "#14b8a6", desc: "ลั่นเงียบทะลุสโมก" },
          { text: "Marshal", color: "#eab308", desc: "สไนเปอร์พริ้วสะบัด" },
          { text: "Guardian", color: "#6366f1", desc: "เคาะแม่นทีละนัด" }
        ]
      },
      agents: {
        title: "โหมดสุ่มเอเจนท์",
        items: [
          { text: "Jett", color: "#06b6d4", desc: "แดชพุ่งชนทุกไฟต์" },
          { text: "Reyna", color: "#a855f7", desc: "ตึงจัดไม่พึ่งทีม" },
          { text: "Omen", color: "#6366f1", desc: "วาร์ปหลังศัตรู" },
          { text: "Sova", color: "#3b82f6", desc: "ยิงศรช็อตสแกนแมพ" },
          { text: "Cypher", color: "#f59e0b", desc: "กล้องส่องทุกมุม" },
          { text: "Iso", color: "#10b981", desc: "กางโล่ 1v1 ดวลเดี่ยว" },
          { text: "Clove", color: "#ec4899", desc: "ตายแล้วฟื้นมาแก้แค้น" },
          { text: "Phoenix", color: "#ef4444", desc: "แฟลชตาแตกไฟลุก" },
          { text: "Viper", color: "#14b8a6", desc: "กางม่านพิษคุมไซท์" },
          { text: "Gekko", color: "#eab308", desc: "มอนสเตอร์แก๊งป่วนเมือง" },
          { text: "Yoru", color: "#8b5cf6", desc: "ตัวปลอมสลับมิติ" }
        ]
      },
      trolls: {
        title: "โหมดชาเลนจ์สุดปั่น",
        items: [
          { text: "ห้ามกดปุ่มย่อ", color: "#ef4444", desc: "No Crouch ตลอดทั้งเกม" },
          { text: "วิ่งยิงอย่างเดียว", color: "#06b6d4", desc: "Run & Gun ห้ามหยุดเดิน" },
          { text: "กระโดดยิงเท่านั้น", color: "#f59e0b", desc: "Jump Shot Only" },
          { text: "ยิงจนหมดแม็ก", color: "#10b981", desc: "ห้ามรีโหลดจนกว่ากระสุนหมด" },
          { text: "กลั้นหายใจเวลายิง", color: "#a855f7", desc: "ท้าทายปอดคนเล่น" },
          { text: "360 Spin ก่อนยิง", color: "#ec4899", desc: "หมุนรอบตัวก่อนลั่นไก" },
          { text: "ปืนพกทั้งเกม", color: "#3b82f6", desc: "Pistol Only Challenge" },
          { text: "ห้ามกดใช้อัลติ", color: "#14b8a6", desc: "No Ultimate Throughout Game" }
        ]
      }
    };

    let currentWheelMode = 'weapons';
    let currentWheelAngle = 0;
    let isWheelSpinning = false;
    let lastTickIndex = -1;

    function initRouletteWheel() {
      drawRouletteWheel();
    }

    function setWheelMode(mode, btn) {
      if (isWheelSpinning) return;
      currentWheelMode = mode;
      playSound('tab');

      document.querySelectorAll('.wheel-mode-btn').forEach(b => {
        b.className = 'wheel-mode-btn px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition active:scale-95 cursor-pointer';
      });
      if (btn) {
        btn.className = 'wheel-mode-btn px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold transition active:scale-95 cursor-pointer';
      }

      drawRouletteWheel();

      const items = WHEEL_CONFIG[mode].items;
      const res = items[0];
      const resText = document.getElementById('wheel-result-text');
      if (resText) resText.textContent = `${res.text} (${res.desc})`;
    }

    function drawRouletteWheel() {
      const canvas = document.getElementById('roulette-wheel-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const center = size / 2;
      const radius = center - 8;

      ctx.clearRect(0, 0, size, size);

      const items = WHEEL_CONFIG[currentWheelMode].items;
      const numSegments = items.length;
      const arc = (Math.PI * 2) / numSegments;

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(currentWheelAngle);

      // Draw Segments
      for (let i = 0; i < numSegments; i++) {
        const angle = i * arc;
        const item = items[i];

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, angle, angle + arc);
        ctx.closePath();

        ctx.fillStyle = item.color;
        ctx.fill();

        // Wedge separator lines
        ctx.strokeStyle = '#06080c';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Text label
        ctx.save();
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Kanit, sans-serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(item.text, radius - 20, 4);
        ctx.restore();
      }

      // Outer rim
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#334155';
      ctx.stroke();

      ctx.restore();
    }

    function spinRouletteWheel() {
      if (isWheelSpinning) return;
      isWheelSpinning = true;

      const btnSpin = document.getElementById('btn-spin-wheel');
      const btnCenter = document.getElementById('btn-wheel-center-spin');
      if (btnSpin) btnSpin.classList.add('opacity-60', 'pointer-events-none');
      if (btnCenter) btnCenter.classList.add('scale-95');

      const items = WHEEL_CONFIG[currentWheelMode].items;
      const numSegments = items.length;
      const arc = (Math.PI * 2) / numSegments;

      // Random target: 5 to 8 full spins + random wedge
      const extraSpins = 5 + Math.floor(Math.random() * 4);
      const randomStopIndex = Math.floor(Math.random() * numSegments);
      // Needle is at top: 3*PI/2 (270 deg)
      // When segment i is at needle, (angle + i * arc + arc/2) % 2PI = 3*PI/2
      const targetAngleAtPointer = (3 * Math.PI / 2) - (randomStopIndex * arc + arc / 2);
      const totalRotation = (extraSpins * Math.PI * 2) + ((targetAngleAtPointer - (currentWheelAngle % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2));

      const startAngle = currentWheelAngle;
      const duration = motionPreference.matches ? 1 : 3800; // ms
      const startTime = performance.now();

      function playTickSound() {
        if (!isSoundEnabled) return;
        try {
          initAudio();
          const now = audioCtx.currentTime;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(650, now);
          osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.04);

          // Pointer visual kick
          const pointer = document.getElementById('wheel-pointer-needle');
          if (pointer) {
            pointer.classList.add('kick');
            setTimeout(() => pointer.classList.remove('kick'), 50);
          }
        } catch (e) {}
      }

      function animateSpin(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);

        // Cubic ease out
        const easeOut = 1 - Math.pow(1 - progress, 3);
        currentWheelAngle = startAngle + totalRotation * easeOut;

        drawRouletteWheel();

        // Calculate tick when segment crosses needle
        const normalizedAngle = (currentWheelAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const currentSegment = Math.floor(((3 * Math.PI / 2 - normalizedAngle + Math.PI * 4) % (Math.PI * 2)) / arc);
        if (currentSegment !== lastTickIndex) {
          lastTickIndex = currentSegment;
          playTickSound();
        }

        if (progress < 1) {
          requestAnimationFrame(animateSpin);
        } else {
          // Finished Spin
          isWheelSpinning = false;
          if (btnSpin) btnSpin.classList.remove('opacity-60', 'pointer-events-none');
          if (btnCenter) btnCenter.classList.remove('scale-95');

          const winner = items[randomStopIndex];
          const resultCard = document.getElementById('wheel-result-card');
          const resultText = document.getElementById('wheel-result-text');

          if (resultText) resultText.textContent = `${winner.text} (${winner.desc})`;
          if (resultCard) {
            resultCard.style.borderColor = winner.color;
            resultCard.style.boxShadow = `0 0 25px ${winner.color}80`;
            setTimeout(() => {
              resultCard.style.borderColor = '';
              resultCard.style.boxShadow = '';
            }, 3000);
          }

          // Fanfare sound
          playCyberSound('miracle_clutch');
          spawnWheelConfetti();
          showToast(`🎉 ผลสุ่ม: ${winner.text} - ${winner.desc}!`);
        }
      }

      requestAnimationFrame(animateSpin);
    }

    function rollCyberChallengeCombo() {
      playSound('pop');
      const wList = WHEEL_CONFIG.weapons.items;
      const aList = WHEEL_CONFIG.agents.items;
      const tList = WHEEL_CONFIG.trolls.items;

      const w = wList[Math.floor(Math.random() * wList.length)];
      const a = aList[Math.floor(Math.random() * aList.length)];
      const t = tList[Math.floor(Math.random() * tList.length)];

      const resultText = document.getElementById('wheel-result-text');
      if (resultText) resultText.textContent = `คอมโบ: ${a.text} + ปืน ${w.text} + ${t.text}`;

      playCyberSound('laser_sharp');
      spawnWheelConfetti();
      showToast(`⚡ สุ่มคอมโบ: ${a.text} + ${w.text} + ${t.text}`);
    }

    function copyWheelResultToClipboard() {
      const resultText = document.getElementById('wheel-result-text');
      const text = resultText ? resultText.textContent : "ผลสุ่ม DaLines Wheel";
      playSound('pop');
      copyTextToClipboard(text, 'คัดลอกผลสุ่มแล้ว! นำไปวางในแชทสตรีมได้เลย ✨');
    }

    function spawnWheelConfetti() {
      if (!allowsDecorativeMotion()) return;
      const colors = ['#ef4444', '#06b6d4', '#f59e0b', '#10b981', '#a855f7', '#ec4899'];
      for (let i = 0; i < 24; i++) {
        const el = document.createElement('div');
        el.className = 'fixed pointer-events-none z-50 rounded-full select-none';
        const size = Math.random() * 8 + 4;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        el.style.left = `${window.innerWidth / 2 + (Math.random() - 0.5) * 80}px`;
        el.style.top = `${window.innerHeight / 2 + (Math.random() - 0.5) * 80}px`;
        el.style.opacity = '1';
        el.style.transition = 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.8s ease-out';
        document.body.appendChild(el);

        const tx = (Math.random() - 0.5) * 280;
        const ty = (Math.random() - 0.5) * 280 - 80;

        requestAnimationFrame(() => {
          el.style.transform = `translate(${tx}px, ${ty}px) scale(0)`;
          el.style.opacity = '0';
        });

        setTimeout(() => el.remove(), 850);
      }
    }
