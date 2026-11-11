    let heroVideo = null;
    let heroIsSeeking = false;
    let heroPendingTime = null;
    let heroTargetTime = 0;
    let heroIsAutoPlaying = false;
    let heroTypewriterInterval = null;
    let heroTypewriterTimer = null;
    let targetScrollProgress = 0;
    let currentScrollProgress = 0;
    let heroCurrentStage = 1;
    let heroInitialized = false;
    let heroFrame = 0;
    let heroScrollFrame = 0;
    let heroInView = true;
    let heroNeedsRender = true;
    let heroLastFrameTime = 0;
    let heroTypewriterText = '';
    let heroVizActive = false;
    let heroViz = null;
    let heroVizBars = [];
    const heroMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

    function heroCanAnimate() {
      return !heroMotionPreference.matches && !navigator.connection?.saveData;
    }

    function scheduleHeroAnimation() {
      if (document.hidden || !heroInView) return;
      if (!heroCanAnimate()) {
        cancelAnimationFrame(heroFrame);
        heroFrame = 0;
        currentScrollProgress = targetScrollProgress;
        renderHeroStages(currentScrollProgress);
        heroNeedsRender = false;
        animateAudioVisualizer();
        return;
      }
      if (!heroFrame) heroFrame = requestAnimationFrame(heroAnimationLoop);
    }

    function finishHeroTypewriter() {
      clearInterval(heroTypewriterInterval);
      clearTimeout(heroTypewriterTimer);
      heroTypewriterInterval = heroTypewriterTimer = null;
      const content = document.getElementById('hero-typewriter-content');
      const cursor = document.getElementById('hero-typewriter-cursor');
      if (content && heroTypewriterText) content.textContent = heroTypewriterText;
      if (cursor) cursor.style.display = 'none';
    }

    function syncHeroActivity() {
      if (document.hidden || !heroInView) {
        cancelAnimationFrame(heroFrame);
        cancelAnimationFrame(heroScrollFrame);
        heroFrame = heroScrollFrame = 0;
        heroVideo?.pause();
        finishHeroTypewriter();
        return;
      }
      if (!heroCanAnimate()) finishHeroTypewriter();
      if (heroIsAutoPlaying && heroVideo?.paused) {
        heroVideo.play().catch(() => setHeroAutoDance(false));
      }
      heroNeedsRender = true;
      scheduleHeroAnimation();
    }

    function initHeroDance() {
      if (heroInitialized) return;
      heroVideo = document.getElementById('hero-dance-video');
      if (!heroVideo) return;
      heroInitialized = true;
      heroViz = document.getElementById('hero-audio-viz');
      heroVizBars = heroViz ? [...heroViz.querySelectorAll('span')] : [];

      heroVideo.addEventListener('seeked', () => {
        heroIsSeeking = false;
        if (heroPendingTime !== null) {
          const next = heroPendingTime;
          heroPendingTime = null;
          if (!document.hidden && heroInView && !heroIsAutoPlaying) requestSeek(next);
        }
      });
      heroVideo.addEventListener('loadedmetadata', () => {
        heroNeedsRender = true;
        scheduleHeroAnimation();
      });
      heroVideo.addEventListener('timeupdate', () => {
        if (heroIsAutoPlaying && !document.hidden && heroInView) {
          updateHeroHUDProgress(heroVideo.currentTime, heroVideo.duration || 1);
        }
      });
      ['play', 'pause', 'volumechange'].forEach(name => heroVideo.addEventListener(name, scheduleHeroAnimation));
      window.addEventListener('scroll', onHeroScroll, { passive: true });
      window.addEventListener('resize', onHeroScroll, { passive: true });
      document.addEventListener('visibilitychange', syncHeroActivity);
      heroMotionPreference.addEventListener?.('change', syncHeroActivity);
      navigator.connection?.addEventListener?.('change', syncHeroActivity);
      window.addEventListener('pagehide', () => {
        cancelAnimationFrame(heroFrame);
        cancelAnimationFrame(heroScrollFrame);
        heroFrame = heroScrollFrame = 0;
        heroVideo.pause();
        finishHeroTypewriter();
      });
      window.addEventListener('pageshow', () => { updateHeroScrollTarget(); syncHeroActivity(); });
      const track = document.getElementById('hero-scroll-track');
      if (track && 'IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
          heroInView = entries[0].isIntersecting;
          syncHeroActivity();
        }).observe(track);
      }

      const viewport = document.getElementById('hero-sticky-viewport');
      const spotlight = document.getElementById('hero-cursor-spotlight');
      if (viewport && spotlight && window.matchMedia('(hover: hover)').matches) {
        let spotlightFrame = 0;
        let pointer = null;
        viewport.addEventListener('pointermove', event => {
          if (!heroCanAnimate() || document.hidden) return;
          pointer = event;
          if (spotlightFrame) return;
          spotlightFrame = requestAnimationFrame(() => {
            spotlightFrame = 0;
            const rect = viewport.getBoundingClientRect();
            const x = pointer.clientX - rect.left;
            const y = pointer.clientY - rect.top;
            spotlight.style.background = 'radial-gradient(600px circle at ' + x + 'px ' + y + 'px, rgba(16, 185, 129, 0.15), transparent 70%)';
          });
        }, { passive: true });
      }
      initBentoTiltPhysics();
      window.addEventListener('keydown', event => {
        if (event.target?.closest?.('button, a, input, textarea, select, [contenteditable]')) return;
        if (event.code === 'Space' && heroInView && !document.hidden) {
          event.preventDefault();
          toggleHeroAutoDance();
        }
      });
      document.addEventListener('dalines:live-status', event => checkHeroLiveStatus(event.detail));
      updateHeroScrollTarget();
      startHeroTypewriter();
      checkHeroLiveStatus();
      scheduleHeroAnimation();
    }

    function updateHeroScrollTarget() {
      const track = document.getElementById('hero-scroll-track');
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const trackHeight = track.offsetHeight - window.innerHeight;
      targetScrollProgress = trackHeight > 0 ? Math.max(0, Math.min(1, -rect.top / trackHeight)) : 0;
      const inView = rect.bottom > 0 && rect.top < window.innerHeight;
      if (inView !== heroInView) {
        heroInView = inView;
        syncHeroActivity();
      }
      scheduleHeroAnimation();
    }

    function onHeroScroll() {
      if (heroScrollFrame || document.hidden) return;
      heroScrollFrame = requestAnimationFrame(() => {
        heroScrollFrame = 0;
        updateHeroScrollTarget();
      });
    }

    function requestSeek(time) {
      if (!heroVideo || !Number.isFinite(time) || !Number.isFinite(heroVideo.duration) || heroVideo.duration <= 0) return;
      const dur = heroVideo.duration;
      const clamped = Math.max(0, Math.min(time, dur));
      if (Math.abs(heroTargetTime - clamped) < 0.025 && (heroIsSeeking || Math.abs(heroVideo.currentTime - clamped) < 0.025)) return;
      heroTargetTime = clamped;
      if (heroIsSeeking) {
        heroPendingTime = clamped;
      } else if (Math.abs(heroVideo.currentTime - clamped) >= 0.025) {
        heroIsSeeking = true;
        try {
          heroVideo.currentTime = clamped;
          updateHeroHUDProgress(clamped, dur);
        } catch {
          heroIsSeeking = false;
        }
      }
    }

    function heroAnimationLoop(timestamp) {
      heroFrame = 0;
      if (document.hidden || !heroInView) return;
      if (timestamp - heroLastFrameTime < 1000 / 30 && heroLastFrameTime) {
        scheduleHeroAnimation();
        return;
      }
      const elapsed = heroLastFrameTime ? Math.min(timestamp - heroLastFrameTime, 100) : 1000 / 30;
      heroLastFrameTime = timestamp;
      const delta = targetScrollProgress - currentScrollProgress;
      if (heroNeedsRender || delta !== 0) {
        currentScrollProgress = !heroCanAnimate() || Math.abs(delta) < 0.0003
          ? targetScrollProgress
          : currentScrollProgress + delta * (1 - Math.pow(0.88, elapsed / (1000 / 60)));
        if (heroCanAnimate() && heroVideo && !heroIsAutoPlaying) requestSeek(currentScrollProgress * heroVideo.duration);
        renderHeroStages(currentScrollProgress);
        heroNeedsRender = false;
      }
      animateAudioVisualizer();
      if ((heroCanAnimate() && targetScrollProgress !== currentScrollProgress) || heroVizActive) scheduleHeroAnimation();
    }

    function renderHeroStages(p) {
      const stage1 = document.getElementById('hero-stage-1');
      const stage2 = document.getElementById('hero-stage-2');
      const stage3 = document.getElementById('hero-stage-3');
      const stageBadge = document.getElementById('hero-hud-stage-badge');

      // Stage 1 (0.0 to 0.33)
      if (stage1) {
        let op1 = 1;
        if (p > 0.15) {
          op1 = Math.max(0, 1 - (p - 0.15) / 0.15);
        }
        stage1.style.opacity = op1;
        stage1.style.transform = `scale(${0.95 + 0.05 * op1}) translateY(${(1 - op1) * -20}px)`;
        stage1.style.pointerEvents = op1 > 0.5 ? 'auto' : 'none';
        stage1.inert = op1 <= 0.5;
        stage1.setAttribute('aria-hidden', String(op1 <= 0.5));
      }

      // Stage 2 (0.33 to 0.66)
      if (stage2) {
        let op2 = 0;
        if (p >= 0.20 && p <= 0.40) {
          op2 = (p - 0.20) / 0.20;
        } else if (p > 0.40 && p < 0.60) {
          op2 = 1;
        } else if (p >= 0.60 && p <= 0.75) {
          op2 = Math.max(0, 1 - (p - 0.60) / 0.15);
        }
        stage2.style.opacity = op2;
        stage2.style.transform = `scale(${0.92 + 0.08 * op2})`;
        stage2.style.pointerEvents = op2 > 0.5 ? 'auto' : 'none';
        stage2.inert = op2 <= 0.5;
        stage2.setAttribute('aria-hidden', String(op2 <= 0.5));
      }

      // Stage 3 (0.66 to 1.0)
      if (stage3) {
        let op3 = 0;
        if (p >= 0.65) {
          op3 = Math.min(1, (p - 0.65) / 0.18);
        }
        stage3.style.opacity = op3;
        stage3.style.transform = `scale(${0.92 + 0.08 * op3}) translateY(${(1 - op3) * 20}px)`;
        stage3.style.pointerEvents = op3 > 0.5 ? 'auto' : 'none';
        stage3.inert = op3 <= 0.5;
        stage3.setAttribute('aria-hidden', String(op3 <= 0.5));
      }

      // Track stage milestones
      let currentStageNum = 1;
      if (p >= 0.60) currentStageNum = 3;
      else if (p >= 0.25) currentStageNum = 2;

      if (currentStageNum !== heroCurrentStage) {
        heroCurrentStage = currentStageNum;
        if (typeof playSound === 'function') {
          playSound('click');
        }
      }

      if (stageBadge) {
        stageBadge.innerText = `STAGE ${heroCurrentStage}/3`;
      }
    }

    function initBentoTiltPhysics() {
      if (!window.matchMedia('(hover: hover)').matches) return;
      document.querySelectorAll('.bento-tilt-card').forEach(card => {
        let frame = 0;
        let pointer = null;
        card.addEventListener('pointermove', event => {
          if (!heroCanAnimate() || document.hidden) return;
          pointer = event;
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            const rect = card.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const rotateX = ((pointer.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -10;
            const rotateY = ((pointer.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 10;
            card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale3d(1.02, 1.02, 1.02)';
          });
        }, { passive: true });
        card.addEventListener('pointerleave', () => {
          cancelAnimationFrame(frame);
          frame = 0;
          card.style.transform = '';
        });
      });
    }

    function animateAudioVisualizer() {
      if (!heroViz) return;
      const isAudible = heroCanAnimate() && !document.hidden && heroInView && heroVideo && !heroVideo.muted && !heroVideo.paused;
      if (!isAudible && !heroVizActive) return;
      heroVizActive = Boolean(isAudible);
      heroViz.classList.toggle('opacity-40', !isAudible);
      heroViz.classList.toggle('opacity-100', Boolean(isAudible));
      const now = Date.now() / 150;
      heroVizBars.forEach((bar, index) => {
        bar.style.height = (isAudible ? 4 + Math.abs(Math.sin(now + index * 0.8)) * 12 : 4) + 'px';
      });
    }

    function updateHeroHUDProgress(cur, dur) {
      const prog = document.getElementById('hero-hud-progress');
      const time = document.getElementById('hero-hud-time');
      if (prog && dur > 0) {
        prog.style.width = ((cur / dur) * 100) + '%';
      }
      if (time) {
        time.innerText = cur.toFixed(1) + 's / ' + dur.toFixed(1) + 's';
      }
    }

    function toggleHeroAutoDance() {
      setHeroAutoDance(!heroIsAutoPlaying);
    }

    function setHeroAutoDance(active) {
      if (!heroVideo) return;
      heroIsAutoPlaying = Boolean(active);
      heroPendingTime = null;
      const btn = document.getElementById('hero-hud-play-text');
      if (active) {
        if (!document.hidden && heroInView) heroVideo.play().catch(() => setHeroAutoDance(false));
        if (btn) btn.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block mr-1"></span>⏸ พักการเต้น';
      } else {
        heroVideo.pause();
        if (btn) btn.textContent = '▶ เต้นอัตโนมัติ';
        heroNeedsRender = true;
      }
      scheduleHeroAnimation();
    }

    function toggleHeroDanceAudio() {
      if (!heroVideo) return;
      heroVideo.muted = !heroVideo.muted;
      const isMuted = heroVideo.muted;
      const btn = document.getElementById('hero-sound-toggle-btn');
      const icon = document.getElementById('hero-sound-icon');
      const text = document.getElementById('hero-sound-text');

      if (!isMuted) {
        if (!heroIsAutoPlaying) setHeroAutoDance(true);
        if (icon) icon.innerText = '🔊';
        if (text) text.innerText = (currentLang === 'th') ? 'เปิดเสียง' : 'Sound On';
        if (btn) {
          btn.classList.add('bg-emerald-400', 'text-black', 'border-emerald-400');
          btn.classList.remove('bg-white/10', 'text-white');
        }
      } else {
        if (icon) icon.innerText = '🔇';
        if (text) text.innerText = (currentLang === 'th') ? 'ปิดเสียง' : 'Sound Off';
        if (btn) {
          btn.classList.remove('bg-emerald-400', 'text-black', 'border-emerald-400');
          btn.classList.add('bg-white/10', 'text-white');
        }
      }
      scheduleHeroAnimation();
    }

    function startHeroTypewriter() {
      clearInterval(heroTypewriterInterval);
      clearTimeout(heroTypewriterTimer);
      heroTypewriterInterval = heroTypewriterTimer = null;
      const content = document.getElementById('hero-typewriter-content');
      const cursor = document.getElementById('hero-typewriter-cursor');
      if (!content) return;
      heroTypewriterText = translations[currentLang]?.hero_typewriter || 'Glad you stopped by. Good vibes and sharp aim always find a way. What game are we diving into today?';
      if (!heroCanAnimate() || document.hidden || !heroInView) {
        finishHeroTypewriter();
        return;
      }
      content.textContent = '';
      if (cursor) cursor.style.display = 'inline-block';
      let index = 0;
      heroTypewriterTimer = setTimeout(() => {
        heroTypewriterTimer = null;
        heroTypewriterInterval = setInterval(() => {
          if (document.hidden || !heroInView || !heroCanAnimate()) { finishHeroTypewriter(); return; }
          index++;
          content.textContent = heroTypewriterText.slice(0, index);
          if (index >= heroTypewriterText.length) finishHeroTypewriter();
        }, 35);
      }, 500);
    }

    function copyHeroBusinessEmail() {
      copyTextToClipboard('taung@windowslive.com', currentLang === 'th' ? 'คัดลอกอีเมลแล้ว! ✓' : 'Email copied! ✓').then(success => {
        if (!success) return;
        const text = document.getElementById('hero-email-text');
        if (text) {
          const original = text.innerHTML;
          text.innerHTML = '<span class="text-emerald-400 font-semibold">' + (currentLang === 'th' ? 'คัดลอกอีเมลแล้ว! ✓' : 'Copied to clipboard! ✓') + '</span>';
          setTimeout(() => {
            text.innerHTML = original;
          }, 2000);
        }
        if (typeof playSound === 'function') playSound('copy');
      }).catch(() => {});
    }

    function copyValorantCrosshairHero() {
      const code = '0;P;c;5;o;1;d;1;z;1;f;0;0t;1;0l;2;0o;2;0a;1;0f;0;1b;0';
      copyTextToClipboard(code, currentLang === 'th' ? 'คัดลอกโค้ดเป้า Valorant แล้ว! 🎯' : 'Valorant Crosshair Copied! 🎯').then(success => {
        if (!success) return;
        const btnText = document.getElementById('hero-crosshair-copy-text');
        if (btnText) {
          const orig = btnText.innerText;
          btnText.innerText = (currentLang === 'th') ? 'คัดลอกแล้ว! ✓' : 'Copied! ✓';
          setTimeout(() => { btnText.innerText = orig; }, 2000);
        }
        if (typeof showToast === 'function') {
          showToast((currentLang === 'th') ? 'คัดลอกโค้ดเป้า Valorant แล้ว! 🎯' : 'Valorant Crosshair Copied! 🎯');
        }
        if (typeof playSound === 'function') playSound('copy');
      }).catch(() => {});
    }

    function checkHeroLiveStatus(status) {
      const isLive = status ? status.isLive : (typeof twitchStatusKnown !== 'undefined' && twitchStatusKnown ? currentLiveState : null);
      const badge = document.getElementById('hero-live-badge');
      const dot = document.getElementById('hero-live-dot');
      const statusText = document.getElementById('hero-live-text');
      if (!badge || !dot || !statusText) return;
      if (isLive === true) {
        badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
        dot.className = 'w-1.5 h-1.5 rounded-full bg-red-500';
        statusText.textContent = currentLang === 'th' ? 'กำลังสตรีมสดบน TWITCH' : 'LIVE ON TWITCH';
      } else {
        badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-white/5 text-neutral-400 border-white/10';
        dot.className = 'w-1.5 h-1.5 rounded-full bg-neutral-500';
        statusText.textContent = isLive === false
          ? (currentLang === 'th' ? 'ออฟไลน์' : 'OFFLINE')
          : (currentLang === 'th' ? 'กำลังตรวจสอบสถานะ' : 'CHECKING STATUS');
      }
    }

    // Auto-init on DOMContentLoaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initHeroDance);
    } else {
      initHeroDance();
    }
