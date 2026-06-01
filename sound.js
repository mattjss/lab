(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────────
  let muted = false;
  let lastHoverEl = null;
  let hoverAudio = null, clickAudio = null, openAudio = null;

  // ── HTML Audio init (lazy — requires user gesture) ────────────────
  function initAudio() {
    if (hoverAudio) return;
    hoverAudio = new Audio('./sounds/hover.mp3');
    hoverAudio.volume = 0.25;
    clickAudio = new Audio('./sounds/selection.mp3');
    clickAudio.volume = 0.30;
    openAudio = new Audio('./sounds/selection.mp3');
    openAudio.volume = 0.45;
  }

  // ── Shared Web Audio context (for synthesized sounds) ─────────────
  let _ctx = null;
  function ac() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  // ── Synthesized hover sounds ──────────────────────────────────────

  // Vector — particles following field lines
  // A soft sine sweep: 300→700 Hz over 160ms. Feels like a vector pointing.
  function synthVector() {
    try {
      const ctx = ac();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(700, t + 0.16);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.055, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.start(t); osc.stop(t + 0.18);
    } catch (_) {}
  }

  // Grid — structured lattice of points
  // A crisp triangle-wave click with fast pitch drop. Snapping to a grid node.
  function synthGrid() {
    try {
      const ctx = ac();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(2600, t);
      osc.frequency.exponentialRampToValueAtTime(700, t + 0.045);
      gain.gain.setValueAtTime(0.065, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
      osc.start(t); osc.stop(t + 0.06);
    } catch (_) {}
  }

  // Cloth — fabric simulation
  // Warm low-pass noise burst: like fingertips brushing soft fabric.
  function synthCloth() {
    try {
      const ctx = ac();
      const size = Math.floor(ctx.sampleRate * 0.22);
      const buf = ctx.createBuffer(1, size, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < size; i++) ch[i] = Math.random() * 2 - 1;

      const src = ctx.createBufferSource();
      src.buffer = buf;

      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 1100;
      lpf.Q.value = 0.6;

      const gain = ctx.createGain();
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.055, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.20);

      src.connect(lpf); lpf.connect(gain); gain.connect(ctx.destination);
      src.start(t); src.stop(t + 0.24);
    } catch (_) {}
  }

  // Spider Mesh — elastic web threads
  // Fast-attack decaying sine: a single silk thread plucked and resonating.
  function synthSpider() {
    try {
      const ctx = ac();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 510;
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.095, t + 0.007);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      osc.start(t); osc.stop(t + 0.44);
    } catch (_) {}
  }

  // ── Sound definitions ────────────────────────────────────────────
  const sounds = {
    hover()          { initAudio(); hoverAudio.currentTime = 0; hoverAudio.play().catch(() => {}); },
    click()          { initAudio(); clickAudio.currentTime = 0; clickAudio.play().catch(() => {}); },
    'open-project'() { initAudio(); openAudio.currentTime = 0;  openAudio.play().catch(() => {}); },
    'hover-vector'() { synthVector(); },
    'hover-grid'()   { synthGrid();   },
    'hover-cloth'()  { synthCloth();  },
    'hover-spider'() { synthSpider(); },
  };

  // ── Dispatcher ───────────────────────────────────────────────────
  function play(name) {
    if (muted) return;
    const fn = sounds[name] || sounds['hover'];
    try { fn(); } catch (_) {}
  }

  // ── Hover delegation (pointerover + dedup) ───────────────────────
  document.addEventListener('pointerover', e => {
    const el = e.target.closest('[data-sound-hover]');
    if (!el || el === lastHoverEl) return;
    lastHoverEl = el;
    play(el.dataset.soundHover || 'hover');
  });

  document.addEventListener('pointerout', e => {
    if (lastHoverEl && !lastHoverEl.contains(e.relatedTarget)) {
      lastHoverEl = null;
    }
  });

  // ── Click delegation ─────────────────────────────────────────────
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-sound-click]');
    if (!el) return;
    play(el.dataset.soundClick || 'click');
  });

  // ── Mute toggle ──────────────────────────────────────────────────
  function syncMuteUI() {
    document.querySelectorAll('[data-sound-mute]').forEach(el => {
      el.setAttribute('aria-label', muted ? 'Unmute sounds' : 'Mute sounds');
      el.textContent = muted ? 'sound off' : 'sound on';
    });
  }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-sound-mute]')) {
      muted = !muted;
      syncMuteUI();
    }
  });

  // ── Public API ───────────────────────────────────────────────────
  window.SoundUI = {
    play,
    toggle() { muted = !muted; syncMuteUI(); },
    mute()   { muted = true;  syncMuteUI(); },
    unmute() { muted = false; syncMuteUI(); },
    get isMuted() { return muted; },
  };
})();
