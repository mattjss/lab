(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────────
  let AC = null;
  let muted = false;
  let lastHoverEl = null;

  // ── AudioContext ─────────────────────────────────────────────────
  function ctx() {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }

  // ── Sound definitions ────────────────────────────────────────────
  // To swap to file-based audio: replace a sound function with:
  //   const src = ctx().createBufferSource();
  //   fetch('/sounds/ui-hover-soft.wav')
  //     .then(r => r.arrayBuffer())
  //     .then(b => ctx().decodeAudioData(b, buf => { src.buffer = buf; src.connect(ctx().destination); src.start(); }));
  const sounds = {

    // Glassy high-freq shimmer — barely perceptible, confirms pointer entry
    hover() {
      const a = ctx(), t = a.currentTime;
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine';
      o.frequency.value = 3200;
      o.connect(g); g.connect(a.destination);
      g.gain.setValueAtTime(0.006, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.030);
      o.start(t); o.stop(t + 0.032);
    },

    // Short digital tap — tone + narrow-band noise texture
    click() {
      const a = ctx(), t = a.currentTime;
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine';
      o.frequency.value = 1600;
      o.connect(g); g.connect(a.destination);
      g.gain.setValueAtTime(0.014, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.038);
      o.start(t); o.stop(t + 0.04);
      const nLen = Math.floor(a.sampleRate * 0.022);
      const nBuf = a.createBuffer(1, nLen, a.sampleRate);
      const nd = nBuf.getChannelData(0);
      for (let i = 0; i < nLen; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nLen);
      const nSrc = a.createBufferSource(); nSrc.buffer = nBuf;
      const flt = a.createBiquadFilter();
      flt.type = 'bandpass'; flt.frequency.value = 2400; flt.Q.value = 1.4;
      const nG = a.createGain(); nG.gain.value = 0.014;
      nSrc.connect(flt); flt.connect(nG); nG.connect(a.destination);
      nSrc.start(t);
    },

    // Ascending two-note chime — purposeful, used only for opening a project
    'open-project'() {
      const a = ctx(), t = a.currentTime;
      const nLen = Math.floor(a.sampleRate * 0.035);
      const nBuf = a.createBuffer(1, nLen, a.sampleRate);
      const nd = nBuf.getChannelData(0);
      for (let i = 0; i < nLen; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nLen * 0.18));
      const nSrc = a.createBufferSource(); nSrc.buffer = nBuf;
      const hpf = a.createBiquadFilter();
      hpf.type = 'highpass'; hpf.frequency.value = 2200;
      const nG = a.createGain(); nG.gain.value = 0.020;
      nSrc.connect(hpf); hpf.connect(nG); nG.connect(a.destination);
      nSrc.start(t);
      [660, 1047].forEach((freq, i) => {
        const d = i * 0.052;
        const o = a.createOscillator(), g = a.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        o.connect(g); g.connect(a.destination);
        g.gain.setValueAtTime(0.016, t + d);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.080);
        o.start(t + d); o.stop(t + d + 0.085);
      });
    },
  };

  // ── Dispatcher ───────────────────────────────────────────────────
  function play(name) {
    if (muted) return;
    const fn = sounds[name] || sounds['click'];
    try { fn(); } catch (_) {}
  }

  // ── Hover delegation (pointerover + dedup) ───────────────────────
  // pointerover bubbles; dedup via lastHoverEl prevents re-firing
  // while the pointer moves within the same element or its children.
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
