/* ================================================================
   BallIt — A/B testing del titular del hero
   ----------------------------------------------------------------
   Una sola variable cambia entre versiones: el titular del hero.
     A (control)   → enfocada en el PROBLEMA
     B (variación) → enfocada en el RESULTADO
   El resto de la página es idéntico para que la prueba sea limpia.

   Reglas:
   - Asignación 50/50 aleatoria en el primer visit.
   - Persistida en localStorage: el mismo visitante siempre ve lo mismo.
   - Forzable por URL con ?variant=A o ?variant=B (pruebas y capturas).
   - La variante queda expuesta en window.BallItAB.variant para que
     analytics.js la envíe como user property y en todos los eventos.
   ================================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "ballit_ab_variant";
  var VALID = ["A", "B"];

  function fromUrl() {
    try {
      var p = new URLSearchParams(window.location.search).get("variant");
      if (!p) return null;
      p = p.toUpperCase();
      return VALID.indexOf(p) !== -1 ? p : null;
    } catch (e) {
      return null;
    }
  }

  function fromStorage() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return VALID.indexOf(v) !== -1 ? v : null;
    } catch (e) {
      return null;
    }
  }

  function persist(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* modo privado */ }
  }

  function assign() {
    return Math.random() < 0.5 ? "A" : "B";
  }

  /* Resolución de la variante: URL manda; si no, localStorage; si no,
     asignación nueva 50/50. Un override por URL también se persiste para
     que las capturas sean reproducibles en recargas. */
  function resolve() {
    var forced = fromUrl();
    if (forced) { persist(forced); return forced; }

    var stored = fromStorage();
    if (stored) return stored;

    var fresh = assign();
    persist(fresh);
    return fresh;
  }

  var variant = resolve();

  /* Aplica el titular correspondiente. El HTML trae data-variant-a y
     data-variant-b en #heroHeadline; así el copy vive en el markup. */
  function applyHeadline() {
    var el = document.getElementById("heroHeadline");
    if (!el) return;
    var text = variant === "A"
      ? el.getAttribute("data-variant-a")
      : el.getAttribute("data-variant-b");
    if (text) el.textContent = text;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyHeadline);
  } else {
    applyHeadline();
  }

  // Expuesto para analytics.js y main.js
  window.BallItAB = {
    variant: variant,
    STORAGE_KEY: STORAGE_KEY
  };
})();
