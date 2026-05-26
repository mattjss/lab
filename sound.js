(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────────
  let muted = false;
  let lastHoverEl = null;
  let hoverAudio = null, clickAudio = null, openAudio = null;

  // ── Audio init (lazy — requires user gesture) ─────────────────────
  function initAudio() {
    if (hoverAudio) return;
    hoverAudio = new Audio('./sounds/hover.mp3');
    hoverAudio.volume = 0.25;
    clickAudio = new Audio('./sounds/selection.mp3');
    clickAudio.volume = 0.30;
    openAudio = new Audio('./sounds/selection.mp3');
    openAudio.volume = 0.45;
  }

  // ── Sound definitions ────────────────────────────────────────────
  const sounds = {
    hover()         { initAudio(); hoverAudio.currentTime = 0; hoverAudio.play().catch(() => {}); },
    click()         { initAudio(); clickAudio.currentTime = 0; clickAudio.play().catch(() => {}); },
    'open-project'(){ initAudio(); openAudio.currentTime = 0;  openAudio.play().catch(() => {}); },
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
