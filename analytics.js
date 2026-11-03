/* ================================================================
   BallIt — Analítica (Google Analytics 4) + consentimiento + UTM
   ----------------------------------------------------------------
   TODO lo configurable vive en estas dos constantes:
     GA4_ID        → tu Measurement ID de GA4 (formato G-XXXXXXXXXX)
     FORM_ENDPOINT → a dónde se envía el formulario (lo usa main.js)

   GA4 se carga SOLO tras consentimiento (Consent Mode v2):
     - Por defecto analytics_storage = 'denied'.
     - Al aceptar, se concede y se carga gtag.js.
     - page_view es automático una vez cargado GA4.

   Eventos (nombres exactos pedidos):
     page_view (auto), click_cta, form_start, generate_lead,
     scroll_depth, video_play, video_complete, faq_open.
   Todos incluyen el parámetro `variant` (A/B), y `variant` se envía
   además como user property.
   ================================================================ */
(function () {
  "use strict";

  /* ============================================================
     CONFIGURACIÓN — cambia solo estas dos líneas
     ============================================================ */
  var GA4_ID = "G-XXXXXXXXXX";            // ← tu Measurement ID de GA4
  var FORM_ENDPOINT = "";                 // ← Formspree / Apps Script / Firestore. Vacío = modo demo (no envía a red)

  var CONSENT_KEY = "ballit_consent";     // 'granted' | 'denied'

  /* Variante desde ab-test.js (fallback 'A' si no cargó) */
  var VARIANT = (window.BallItAB && window.BallItAB.variant) || "A";

  /* ============================================================
     UTM — capturar de la URL y guardar en sessionStorage
     ============================================================ */
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
  var UTM_STORE = "ballit_utm";

  function captureUtm() {
    var params, stored = {};
    try { stored = JSON.parse(sessionStorage.getItem(UTM_STORE) || "{}"); } catch (e) { stored = {}; }
    try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }

    var utm = {};
    UTM_KEYS.forEach(function (k) {
      var fromUrl = params ? params.get(k) : null;
      utm[k] = fromUrl || stored[k] || "";  // la URL actual gana; si no, lo ya guardado
    });

    try { sessionStorage.setItem(UTM_STORE, JSON.stringify(utm)); } catch (e) { /* noop */ }
    return utm;
  }

  var UTM = captureUtm();

  /* ============================================================
     GA4 — Consent Mode + carga diferida
     ============================================================ */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag; // expuesto por si se depura en consola

  // Estado de consentimiento por defecto: denegado hasta que el usuario acepte.
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied"
  });

  var gaLoaded = false;

  function loadGA() {
    if (gaLoaded) return;
    if (!GA4_ID || GA4_ID.indexOf("G-") !== 0) {
      // Sin ID válido: no cargamos red, pero dejamos el tracking en modo log
      // para poder verificar los eventos en consola durante desarrollo.
      console.info("[BallIt] GA4_ID placeholder: eventos se registran en consola, no se envían.");
      gaLoaded = true;
      return;
    }
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
    document.head.appendChild(s);

    gtag("js", new Date());
    // variant como user property en toda la sesión
    gtag("config", GA4_ID, {
      user_properties: { variant: VARIANT }
    });
    // Reafirma la user property (algunas vistas la quieren por set)
    gtag("set", "user_properties", { variant: VARIANT });

    gaLoaded = true;
  }

  function grantConsent() {
    gtag("consent", "update", { analytics_storage: "granted" });
    loadGA();
  }

  /* ============================================================
     track() — envoltura única de todos los eventos
     Siempre inyecta `variant`. Si GA4 no está cargado (placeholder o
     sin consentimiento), registra en consola para poder verificar.
     ============================================================ */
  function track(eventName, params) {
    var payload = Object.assign({ variant: VARIANT }, params || {});
    if (typeof window.gtag === "function" && gaLoaded && GA4_ID.indexOf("G-") === 0) {
      window.gtag("event", eventName, payload);
    } else {
      console.debug("[BallIt event]", eventName, payload);
    }
  }

  /* ============================================================
     Eventos declarativos de UI
     ============================================================ */

  // click_cta — todos los <.js-cta> con data-cta-id / data-cta-location
  function wireCtas() {
    document.querySelectorAll(".js-cta").forEach(function (el) {
      el.addEventListener("click", function () {
        track("click_cta", {
          cta_id: el.getAttribute("data-cta-id") || "unknown",
          cta_location: el.getAttribute("data-cta-location") || "unknown"
        });
      });
    });
  }

  // form_start — primera interacción con cualquier campo del formulario
  function wireFormStart() {
    var form = document.getElementById("leadForm");
    if (!form) return;
    var fired = false;
    function onFirst() {
      if (fired) return;
      fired = true;
      track("form_start", {});
    }
    ["focusin", "change"].forEach(function (evt) {
      form.addEventListener(evt, onFirst, { once: false });
    });
  }

  // scroll_depth — 25 / 50 / 75 / 90 %, cada umbral una sola vez
  function wireScrollDepth() {
    var thresholds = [25, 50, 75, 90];
    var fired = {};
    function check() {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      var pct = Math.round((window.scrollY / scrollable) * 100);
      thresholds.forEach(function (t) {
        if (pct >= t && !fired[t]) {
          fired[t] = true;
          track("scroll_depth", { percent: t });
        }
      });
    }
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (!ticking) {
        window.requestAnimationFrame(function () { check(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });
    check();
  }

  // faq_open — qué pregunta se abrió
  function wireFaq() {
    document.querySelectorAll(".faq__item").forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (item.open) {
          track("faq_open", { question: item.getAttribute("data-faq") || "unknown" });
        }
      });
    });
  }

  /* ============================================================
     API pública — main.js dispara estos en los momentos correctos
     ============================================================ */
  window.BallItAnalytics = {
    variant: VARIANT,
    utm: UTM,
    track: track,
    formEndpoint: FORM_ENDPOINT,
    ga4Id: GA4_ID,

    // video de demo
    videoPlay: function () { track("video_play", {}); },
    videoComplete: function () { track("video_complete", {}); },

    // generate_lead — SOLO lo llama main.js tras envío exitoso.
    // Incluye las UTM como parámetros además de ir en los campos ocultos.
    generateLead: function (extra) {
      var params = {
        method: "landing_form",
        utm_source: UTM.utm_source,
        utm_medium: UTM.utm_medium,
        utm_campaign: UTM.utm_campaign,
        utm_content: UTM.utm_content
      };
      track("generate_lead", Object.assign(params, extra || {}));
    }
  };

  /* ============================================================
     Consentimiento — banner sobrio; GA4 solo tras aceptar
     ============================================================ */
  function initConsent() {
    var banner = document.getElementById("consent");
    var accept = document.getElementById("consentAccept");
    var reject = document.getElementById("consentReject");
    var saved;
    try { saved = localStorage.getItem(CONSENT_KEY); } catch (e) { saved = null; }

    if (saved === "granted") { grantConsent(); return; }
    if (saved === "denied") { return; } // respeta el rechazo, no mostramos otra vez

    if (banner) banner.hidden = false;

    if (accept) accept.addEventListener("click", function () {
      try { localStorage.setItem(CONSENT_KEY, "granted"); } catch (e) {}
      if (banner) banner.hidden = true;
      grantConsent();
    });
    if (reject) reject.addEventListener("click", function () {
      try { localStorage.setItem(CONSENT_KEY, "denied"); } catch (e) {}
      if (banner) banner.hidden = true;
      // No se carga GA4. El resto del sitio funciona igual.
    });
  }

  function init() {
    wireCtas();
    wireFormStart();
    wireScrollDepth();
    wireFaq();
    initConsent();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
