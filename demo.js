/* ================================================================
   BallIt — Mini-MVP de la sección #prueba
   ----------------------------------------------------------------
   La persona elige uno de 3 videos de ejemplo y vive el recorrido de
   la app con DATOS DEL BACK (nada hardcodeado):
     elige → ve el original → "Analizar" → procesando → video anotado
     + puntaje + veredicto + consejo del coach → CTA a la app.

   Degradación elegante (obligatoria): la landing es la cara pública y
   nunca debe verse rota. Si el back está dormido/caído, la sección
   #prueba queda oculta y el resto de la landing funciona igual.

   Contrato del back (ver CAMBIOS_BACK.md):
     GET /demos        -> [{ slug, title, description, thumb_url, video_url, verdict }]
     GET /demos/{slug} -> { annotated_url, summary:{score,n}, verdict,
                            coach:{resumen, lo_hiciste_bien:[], puedes_mejorar:[{titulo,intenta_esto}]} }
   ================================================================ */
(function () {
  "use strict";

  var API_BASE = "https://ballit-api.onrender.com";   // back en Render

  var A = window.BallItAnalytics || null;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- elementos ----------------------------------------------------
  var section   = document.getElementById("prueba");
  var cardsWrap = document.getElementById("demoCards");
  var panel     = document.getElementById("demoPanel");
  var backBtn   = document.getElementById("demoBack");
  var screenEl  = document.getElementById("demoScreen");

  var sOriginal   = document.getElementById("demoStateOriginal");
  var sProcessing = document.getElementById("demoStateProcessing");
  var sResult     = document.getElementById("demoStateResult");
  var sError      = document.getElementById("demoStateError");

  var titleEl   = document.getElementById("demoTitle");
  var descEl    = document.getElementById("demoDesc");
  var analyzeBtn= document.getElementById("demoAnalyze");
  var stepEl    = document.getElementById("demoStep");
  var progBar   = document.getElementById("demoProgBar");

  var scoreEl   = document.getElementById("demoScore");
  var ringEl    = document.getElementById("demoRing");
  var verdictEl = document.getElementById("demoVerdict");
  var coachEl   = document.getElementById("demoCoachResume");
  var goodWrap  = document.getElementById("demoGoodWrap");
  var goodEl    = document.getElementById("demoGood");
  var impWrap   = document.getElementById("demoImproveWrap");
  var impTitle  = document.getElementById("demoImproveTitle");
  var impTip    = document.getElementById("demoImproveTip");
  var nEl       = document.getElementById("demoN");
  var ctaBtn    = document.getElementById("demoCta");

  if (!section || !cardsWrap) return;

  // --- estado -------------------------------------------------------
  var demosPromise = null;     // GET /demos (se reutiliza)
  var currentSlug = null;
  var currentDemo = null;      // tarjeta elegida (datos de /demos)
  var detailPromise = null;    // GET /demos/{slug} lanzado al elegir
  var analysisDetail = null;   // detalle ya resuelto

  // mapeo de veredicto del back → clase de color de la UI
  function verdictClass(v) {
    if (v === "bueno") return "verdict--green";
    if (v === "malo")  return "verdict--red";
    return "verdict--yellow"; // dudoso / por defecto
  }
  function verdictText(v) {
    if (v === "bueno") return "Bien";
    if (v === "malo")  return "A corregir";
    return "Casi";
  }

  // --- fetch con timeout --------------------------------------------
  function fetchJson(url, ms) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, ms || 60000);
    return fetch(url, { signal: ctrl.signal })
      .then(function (res) {
        clearTimeout(t);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .catch(function (err) { clearTimeout(t); throw err; });
  }

  // --- despertar el back y traer /demos -----------------------------
  function loadDemos() {
    if (demosPromise) return demosPromise;
    // ~60 s de margen para el cold start de Render gratuito
    demosPromise = fetchJson(API_BASE + "/demos", 60000);
    return demosPromise;
  }

  // --- pintar tarjetas ----------------------------------------------
  function renderCards(demos) {
    cardsWrap.innerHTML = ""; // quita skeletons (contenido propio, no del back)
    demos.slice(0, 3).forEach(function (d) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "democard";
      card.setAttribute("data-slug", d.slug || "");

      var thumb = document.createElement("span");
      thumb.className = "democard__thumb";
      if (d.thumb_url) {
        var img = document.createElement("img");
        img.src = API_BASE + d.thumb_url;
        img.alt = "";
        img.loading = "lazy";
        thumb.appendChild(img);
      }

      var title = document.createElement("span");
      title.className = "democard__title";
      title.textContent = d.title || "Tiro de ejemplo";

      var desc = document.createElement("span");
      desc.className = "democard__desc";
      desc.textContent = d.description || "";

      var tag = document.createElement("span");
      tag.className = "democard__tag verdict " + verdictClass(d.verdict);
      tag.textContent = verdictText(d.verdict);

      card.appendChild(thumb);
      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(tag);
      card.addEventListener("click", function () { selectDemo(d); });
      cardsWrap.appendChild(card);
    });
  }

  // --- helpers de estado del panel ----------------------------------
  function showState(el) {
    [sOriginal, sProcessing, sResult, sError].forEach(function (s) {
      if (s) s.hidden = (s !== el);
    });
  }
  function clearScreen() { if (screenEl) screenEl.innerHTML = ""; }

  function showPanel() {
    if (cardsWrap) cardsWrap.hidden = true;
    if (panel) panel.hidden = false;
  }
  function showCards() {
    if (panel) panel.hidden = true;
    if (cardsWrap) cardsWrap.hidden = false;
    currentSlug = null; currentDemo = null;
    detailPromise = null; analysisDetail = null;
    clearScreen();
  }

  // --- elegir una tarjeta -------------------------------------------
  function selectDemo(d) {
    currentDemo = d;
    currentSlug = d.slug || "";
    analysisDetail = null;
    if (A) A.demoSelect(currentSlug);

    // Prefetch del detalle AL ELEGIR (para que el JSON esté listo
    // cuando termine la animación de "procesando").
    detailPromise = fetchJson(API_BASE + "/demos/" + encodeURIComponent(currentSlug), 60000)
      .then(function (json) { analysisDetail = json; return json; })
      .catch(function (err) { console.warn("[BallIt] /demos/" + currentSlug, err); throw err; });

    showPanel();
    showState(sOriginal);

    // Video ORIGINAL dentro del teléfono. Si no carga, mostramos un aviso
    // pero dejamos el botón "Analizar este tiro" para que el flujo siga.
    clearScreen();
    var v = document.createElement("video");
    v.className = "shot-video";
    v.src = API_BASE + (d.video_url || "");
    if (d.thumb_url) v.poster = API_BASE + d.thumb_url;
    v.controls = true; v.playsInline = true; v.muted = true;
    v.preload = "metadata";
    v.addEventListener("error", function () {
      v.hidden = true;
      if (screenEl && !screenEl.querySelector(".shot-video-fallback")) {
        var note = document.createElement("div");
        note.className = "shot-video-fallback";
        note.textContent = "No se pudo cargar el video, pero puedes analizar el tiro.";
        screenEl.appendChild(note);
      }
    });
    screenEl.appendChild(v);

    if (titleEl) titleEl.textContent = d.title || "Tu tiro de ejemplo";
    if (descEl) descEl.textContent = d.description || "";
  }

  // --- analizar: animación + esperar el detalle ---------------------
  function analyze() {
    if (!currentSlug) return;
    if (A) A.demoAnalyze(currentSlug);
    showState(sProcessing);

    var steps = ["Preparando video…", "Detectando movimiento…", "Generando feedback…"];
    var total = reduceMotion ? 1000 : 3500;
    var start = null;

    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / total, 1);
      if (progBar) progBar.style.width = (t * 100) + "%";
      var idx = Math.min(steps.length - 1, Math.floor(t * steps.length));
      if (stepEl) stepEl.textContent = steps[idx];
      if (t < 1) { requestAnimationFrame(frame); return; }
      finishAnalyze();
    }
    requestAnimationFrame(frame);
  }

  function finishAnalyze() {
    // Si el detalle ya llegó, mostrar; si no, esperar con "Generando feedback…"
    if (analysisDetail) { renderResult(analysisDetail); return; }
    if (stepEl) stepEl.textContent = "Generando feedback…";
    if (detailPromise) {
      detailPromise.then(function (json) { renderResult(json); })
                   .catch(function () { showError(); });
    } else {
      showError();
    }
  }

  // --- resultado -----------------------------------------------------
  function renderResult(detail) {
    if (!detail) { showError(); return; }
    var summary = detail.summary || {};
    var coach = detail.coach || {};

    showState(sResult);

    // Video ANOTADO. Si el video no carga, NO tumbamos el resultado:
    // el feedback (puntaje, veredicto, consejo) es lo importante y se queda.
    clearScreen();
    var v = document.createElement("video");
    v.className = "shot-video";
    v.src = API_BASE + (detail.annotated_url || "");
    v.controls = true; v.playsInline = true; v.muted = true;
    v.preload = "metadata";
    v.addEventListener("error", function () {
      // Oculta el video roto y deja un aviso; mantiene el feedback visible.
      v.hidden = true;
      if (screenEl && !screenEl.querySelector(".shot-video-fallback")) {
        var note = document.createElement("div");
        note.className = "shot-video-fallback";
        note.textContent = "El video no se pudo cargar, pero aquí está tu análisis.";
        screenEl.appendChild(note);
      }
    });
    screenEl.appendChild(v);

    // Puntaje
    var score = typeof summary.score === "number" ? summary.score : 0;
    if (scoreEl) scoreEl.textContent = String(score);
    if (ringEl) ringEl.style.setProperty("--pct", String(Math.max(0, Math.min(100, score))));

    // Veredicto
    if (verdictEl) {
      verdictEl.className = "verdict " + verdictClass(detail.verdict);
      verdictEl.textContent = verdictText(detail.verdict);
    }

    // Coach
    if (coachEl) coachEl.textContent = coach.resumen || "";

    var good = (coach.lo_hiciste_bien && coach.lo_hiciste_bien[0]) || "";
    if (goodWrap && goodEl) {
      if (good) { goodEl.textContent = good; goodWrap.hidden = false; }
      else { goodWrap.hidden = true; }
    }

    var imp = (coach.puedes_mejorar && coach.puedes_mejorar[0]) || null;
    if (impWrap) {
      if (imp) {
        if (impTitle) impTitle.textContent = imp.titulo || "";
        if (impTip) impTip.textContent = imp.intenta_esto || "";
        impWrap.hidden = false;
      } else { impWrap.hidden = true; }
    }

    if (nEl) {
      nEl.textContent = typeof summary.n === "number"
        ? (summary.n + " tiros analizados") : "";
    }

    if (A) A.demoResult(currentSlug, score);
  }

  function showError() {
    showState(sError);
    clearScreen();
  }

  // --- CTA del resultado: enlazar manualmente (L-H3) ----------------
  function wireCta(btn) {
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (A) A.track("click_cta", { cta_id: "demo_resultado", cta_location: "demo" });
    });
  }

  // --- arranque -----------------------------------------------------
  function init() {
    if (analyzeBtn) analyzeBtn.addEventListener("click", analyze);
    if (backBtn) backBtn.addEventListener("click", showCards);
    wireCta(ctaBtn);
    wireCta(document.getElementById("demoErrCta"));

    // Despertar el back y pintar cuando responda. Si falla/timeout,
    // la sección queda oculta y la landing sigue igual.
    loadDemos()
      .then(function (demos) {
        if (!Array.isArray(demos) || !demos.length) return; // nada que mostrar
        renderCards(demos);
        section.hidden = false; // recién ahora se muestra
      })
      .catch(function (err) {
        console.warn("[BallIt] /demos no disponible, sección #prueba oculta:", err);
        // section sigue hidden; no se muestra ningún error al usuario
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
