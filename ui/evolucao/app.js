(function () {

  const modes = document.querySelectorAll(".mode");

  function setMode(mode) {
    modes.forEach(m => {
      m.classList.toggle(
        "active",
        m.dataset.mode === mode
      );
    });
  }

  window.addEventListener("message", (event) => {
    const { type, payload } = event.data || {};
    if (type === "CHANGE_EVOLUTION_TAB") {
      setMode(payload.tab);
    }
  });

  // Estado inicial
  setMode("atendimento");

})();