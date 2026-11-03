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
  var GA4_ID = "G-G1B30K33HQ";            // ← tu Measurement ID de GA4
  var FORM_ENDPOINT = "https://formspree.io/f/xaeelzwe";                 // ← Formspree / Apps Script / Firestore. Vacío = modo demo (no envía a red)

  var CONSENT_KEY = "ballit_consent";     // 'granted' | 'denied'

  /* Variante desde ab-test.js (fallback 'A' si no cargó) */
  var VARIANT = (window.BallItAB && window.BallItAB.variant) || "A";

  /* ============================================================
     UTM — capturar de la URL y guardar en sessionStorage
     ============================================================ */
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
  var UTM_STORE = "ballit_utm";

  // Los UTM vienen de la URL, que el usuario/atacante controla. Aunque gtag no
  // los inyecta en el DOM, sí se guardan y se mandan al backend del formulario
  // (de ahí a una hoja/CRM). Para evitar que un ?utm_source=<script>… se
  // convierta en XSS almacenado en TU vista de leads, saneamos en el origen:
  // quitamos <, >, ", ', caracteres de control, y limitamos la longitud.
  function sanitizeUtm(v) {
    if (typeof v !== "string") return "";
    return v
      .replace(/[<>"'`\\]/g, "")        // quita caracteres peligrosos para HTML/atributos
      .replace(/[\u0000-\u001F\u007F]/g, "") // quita caracteres de control
      .trim()
      .slice(0, 150);                   // tope de longitud razonable para un UTM
  }

  function captureUtm() {
    var params, stored = {};
    try { stored = JSON.parse(sessionStorage.getItem(UTM_STORE) || "{}"); } catch (e) { stored = {}; }
    try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }

    var utm = {};
    UTM_KEYS.forEach(function (k) {
      var fromUrl = params ? params.get(k) : null;
      utm[k] = sanitizeUtm(fromUrl || stored[k] || "");  // la URL actual gana; si no, lo ya guardado
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
  var gaValid = !!GA4_ID && GA4_ID.indexOf("G-") === 0;

  // Carga el tag base de GA4 de inmediato (patrón recomendado por Google con
  // Consent Mode): así el detector de Google SÍ encuentra el tag. NO se
  // recolectan datos ni cookies hasta que el usuario acepta, porque
  // analytics_storage arranca en 'denied' (ver gtag consent default arriba).
  function loadGA() {
    if (gaLoaded) return;
    if (!gaValid) {
      console.info("[BallIt] GA4_ID placeholder: eventos se registran en consola, no se envían.");
      gaLoaded = true;
      return;
    }
    var s = document.createElement("script");
    s.async = true;
    s.referrerPolicy = "strict-origin-when-cross-origin";
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_ID);
    document.head.appendChild(s);

    gtag("js", new Date());
    gtag("config", GA4_ID, {
      user_properties: { variant: VARIANT }
    });
    gtag("set", "user_properties", { variant: VARIANT });

    gaLoaded = true;
  }

  // Al aceptar, se concede el almacenamiento; el tag ya está cargado.
  function grantConsent() {
    gtag("consent", "update", { analytics_storage: "granted" });
    loadGA(); // no-op si ya está cargado
  }

  /* ============================================================
     track() — envoltura única de todos los eventos
     Siempre inyecta `variant`. Si GA4 no está cargado (placeholder o
     sin consentimiento), registra en consola para poder verificar.
     ============================================================ */
  function track(eventName, params) {
    var payload = Object.assign({ variant: VARIANT }, params || {});
    if (gaValid && typeof window.gtag === "function") {
      // El tag ya está cargado desde el inicio. Consent Mode retiene los
      // eventos hasta que se concede analytics_storage y los envía al aceptar.
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
     Consentimiento — banner sobrio.
     El tag GA4 SIEMPRE se carga (para que Google lo detecte), pero
     Consent Mode mantiene analytics_storage en 'denied' hasta aceptar:
     sin cookies ni datos recolectados hasta entonces.
     ============================================================ */
  function initConsent() {
    var banner = document.getElementById("consent");
    var accept = document.getElementById("consentAccept");
    var reject = document.getElementById("consentReject");
    var saved;
    try { saved = localStorage.getItem(CONSENT_KEY); } catch (e) { saved = null; }

    // Carga el tag base de inmediato en todos los casos (consent-gated).
    loadGA();

    if (saved === "granted") { grantConsent(); return; }
    if (saved === "denied") { return; } // ya decidió no; no mostramos de nuevo

    if (banner) banner.hidden = false;

    if (accept) accept.addEventListener("click", function () {
      try { localStorage.setItem(CONSENT_KEY, "granted"); } catch (e) {}
      if (banner) banner.hidden = true;
      grantConsent();
    });
    if (reject) reject.addEventListener("click", function () {
      try { localStorage.setItem(CONSENT_KEY, "denied"); } catch (e) {}
      if (banner) banner.hidden = true;
      // El tag está cargado pero analytics_storage sigue 'denied': no recolecta.
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
