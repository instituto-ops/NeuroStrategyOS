(function () {
  "use strict";
  console.log("Shell app.js loaded");

  const frame = document.getElementById("content-frame");
  if (!frame) {
    console.error("Shell: iframe #content-frame não encontrado");
    return;
  }

  // Minimal global state (no clinical interpretation)
  const State = {
    activePatientId: null, // string | null
    sessionState: "idle" // "idle" | "active" | "paused" | "closed"
  };

  // Menu navigation (deterministic, level 1 only)
  const menuItems = document.querySelectorAll('.menu-item');
  const allowedTargets = Array.from(menuItems).map(m => m.dataset.target).filter(Boolean);

  function setActiveMenu(target) {
    if (!allowedTargets.includes(target)) return;
    menuItems.forEach(m => m.classList.toggle('active', m.dataset.target === target));
    // Deterministic mapping: load nucleus index.html from sibling UI folder
    const src = `../${target}/index.html`;
    frame.src = src;
    console.log('Shell → NAV:', target, src);
  }

  // Initialize default
  setActiveMenu('dashboard');

  // Menu clicks only change nucleus (no clinical logic)
  menuItems.forEach(item => {
    item.addEventListener('click', () => setActiveMenu(item.dataset.target));
  });

  // Post message to current nucleus (only allowed messages)
  function postToNucleus(type, payload) {
    if (!frame.contentWindow) return;
    frame.contentWindow.postMessage({ type, payload }, '*');
    console.log('Shell → Nucleus:', type, payload);
  }

  // Expose a small, explicit API for human / dev to set/clear patient (no validation)
  window.Shell = {
    setPatient(id) {
      State.activePatientId = typeof id === 'string' ? id : null;
      postToNucleus('SET_PATIENT', { patientId: State.activePatientId });
      console.log('Shell: setPatient', State.activePatientId);
    },
    clearPatient() {
      State.activePatientId = null;
      postToNucleus('CLEAR_PATIENT');
      console.log('Shell: clearPatient');
    },
    getContext() {
      return { activePatientId: State.activePatientId, sessionState: State.sessionState };
    },
    _internal_state: State
  };

  // Message contract: only respond to REQUEST_CONTEXT and REQUEST_NAVIGATION
  window.addEventListener('message', (event) => {
    const data = event.data || {};
    const { type, payload } = data;

    if (type === 'REQUEST_CONTEXT') {
      // Reply directly to the sender
      try {
        event.source.postMessage({ type: 'CONTEXT', payload: { activePatientId: State.activePatientId, sessionState: State.sessionState } }, '*');
        console.log('Shell ← REQUEST_CONTEXT: replied');
      } catch (e) {
        console.warn('Shell: could not reply to REQUEST_CONTEXT', e);
      }
      return;
    }

    if (type === 'REQUEST_NAVIGATION') {
      // Only allow navigation to level-1 targets and ignore other requests
      const target = payload && payload.target;
      if (allowedTargets.includes(target)) {
        setActiveMenu(target);
        try { event.source.postMessage({ type: 'NAVIGATION_DONE', payload: { target } }, '*'); } catch (e) { /* ignore */ }
        console.log('Shell ← REQUEST_NAVIGATION: navigated to', target);
      } else {
        console.warn('Shell: REQUEST_NAVIGATION target not allowed', target);
      }
      return;
    }

    // Ignore any other message types - firewall
    console.warn('Shell: ignoring message type', type);
  }, false);

})();
