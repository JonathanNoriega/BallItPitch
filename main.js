/* ================================================================
   BallIt — Cableado de la UI
   ----------------------------------------------------------------
   - Rellena campos ocultos del formulario (variante + UTMs).
   - Envía el formulario a FORM_ENDPOINT y muestra estado claro.
     generate_lead SOLO se dispara si el envío fue exitoso.
   - Botón de play de la demo → video_play / video_complete.
   - Único momento de entrada del hero: dibuja el arco una vez y
     anima el esqueleto cuando el teléfono entra en viewport.
   - Contadores de métricas (animan desde data-count).
   Respeta prefers-reduced-motion.
   ================================================================ */
(function () {
  "use strict";

  var A = window.BallItAnalytics || null;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------
     1) Campos ocultos del formulario: variante + UTMs
     ------------------------------------------------------------ */
  function fillHiddenFields() {
    if (!A) return;
    var map = {
      fVariant: A.variant,
      fUtmSource: A.utm.utm_source,
      fUtmMedium: A.utm.utm_medium,
      fUtmCampaign: A.utm.utm_campaign,
      fUtmContent: A.utm.utm_content
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = map[id] || "";
    });
  }

  /* ------------------------------------------------------------
     2) Envío del formulario
     ------------------------------------------------------------ */
  function wireForm() {
    var form = document.getElementById("leadForm");
    if (!form) return;
    var status = document.getElementById("formStatus");
    var email = document.getElementById("email");
    var emailErr = document.getElementById("emailErr");
    var review = document.getElementById("review");
    var reviewErr = document.getElementById("reviewErr");
    var ratingErr = document.getElementById("ratingErr");
    var submitBtn = form.querySelector('button[type="submit"]');

    function setStatus(msg, kind) {
      if (!status) return;
      status.textContent = msg;
      status.className = "form__status" + (kind ? " is-" + kind : "");
    }

    function validEmail(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    function getRating() {
      var checked = form.querySelector('input[name="rating"]:checked');
      return checked ? checked.value : "";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Puntuación obligatoria
      if (!getRating()) {
        if (ratingErr) ratingErr.hidden = false;
        var firstStar = form.querySelector('input[name="rating"]');
        if (firstStar) firstStar.focus();
        return;
      }
      if (ratingErr) ratingErr.hidden = true;

      // Reseña obligatoria
      if (!review || !review.value.trim()) {
        if (review) { review.setAttribute("aria-invalid", "true"); review.focus(); }
        if (reviewErr) reviewErr.hidden = false;
        return;
      }
      if (review) review.removeAttribute("aria-invalid");
      if (reviewErr) reviewErr.hidden = true;

      // Correo OPCIONAL: solo se valida si el usuario escribió algo.
      if (email && email.value && !validEmail(email.value)) {
        email.setAttribute("aria-invalid", "true");
        if (emailErr) emailErr.hidden = false;
        email.focus();
        return;
      }
      if (email) email.removeAttribute("aria-invalid");
      if (emailErr) emailErr.hidden = true;

      // Honeypot anti-spam: campo oculto que un humano nunca llena.
      // Si viene con algo, es un bot: fingimos éxito y NO enviamos ni
      // disparamos generate_lead (no contaminamos leads ni métricas).
      var hp = form.querySelector('input[name="website"]');
      if (hp && hp.value) {
        setStatus("¡Listo! Revisa tu correo.", "ok");
        form.reset();
        return;
      }

      fillHiddenFields(); // asegura UTM/variante frescas antes de enviar

      var endpoint = A ? A.formEndpoint : "";
      var data = new FormData(form);
      // El honeypot no se envía al backend.
      data.delete("website");

      // Modo demo: sin endpoint configurado no hacemos red, pero SÍ
      // consideramos éxito local para poder probar el flujo completo.
      if (!endpoint) {
        onSuccess();
        return;
      }

      setStatus("Enviando…", "loading");
      if (submitBtn) submitBtn.disabled = true;

      fetch(endpoint, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: data
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res;
        })
        .then(function () { onSuccess(); })
        .catch(function () {
          // Si el endpoint falla, generate_lead NO se dispara.
          if (submitBtn) submitBtn.disabled = false;
          setStatus("No pudimos enviar tu correo. Revisa tu conexión e inténtalo de nuevo.", "err");
        });
    });

    function onSuccess() {
      if (submitBtn) submitBtn.disabled = false;
      setStatus("¡Gracias por tu reseña! Nos ayuda a mejorar BallIt.", "ok");
      // Conversión: solo aquí.
      if (A) A.generateLead({
        rating: getRating(),
        level: (form.querySelector("#level") || {}).value || ""
      });
      form.reset();
      fillHiddenFields(); // repoblar ocultos tras el reset
    }
  }

  /* ------------------------------------------------------------
     3) Demo: botón de play → video_play / video_complete
        Si se reemplaza el mock por un <video id="demoVideo">,
        se enlazan los eventos reales del elemento.
     ------------------------------------------------------------ */
  function wireDemo() {
    var btn = document.getElementById("demoPlay");
    if (!btn) return;
    var video = document.getElementById("demoVideo"); // existe solo si ya hay video real
    var bar = document.getElementById("demoProgress");
    var fill = document.getElementById("demoProgressFill");
    var knob = document.getElementById("demoProgressKnob");

    // --- Barra de progreso personalizada (sin controles nativos) ----------
    function setVisual(pct) {
      pct = Math.max(0, Math.min(100, pct));
      if (fill) fill.style.width = pct + "%";
      if (knob) knob.style.left = pct + "%";
      if (bar) bar.setAttribute("aria-valuenow", String(Math.round(pct)));
    }
    function seekToClientX(clientX) {
      if (!video || !bar || !video.duration) return;
      var rect = bar.getBoundingClientRect();
      var ratio = (clientX - rect.left) / rect.width;
      ratio = Math.max(0, Math.min(1, ratio));
      video.currentTime = ratio * video.duration;
      setVisual(ratio * 100);
    }
    // Ajusta la pantalla del teléfono a la relación de aspecto REAL del video,
    // así se ve completo y sin franjas (no forzamos 9:19 sobre un 9:16).
    if (video) {
      video.addEventListener("loadedmetadata", function () {
        if (video.videoWidth && video.videoHeight) {
          var screen = video.closest(".phone__screen");
          if (screen) {
            screen.style.aspectRatio = video.videoWidth + " / " + video.videoHeight;
          }
        }
      });
    }

    if (video && bar) {
      video.addEventListener("timeupdate", function () {
        if (video.duration) setVisual((video.currentTime / video.duration) * 100);
      });

      var dragging = false;
      bar.addEventListener("pointerdown", function (e) {
        dragging = true;
        bar.setPointerCapture(e.pointerId);
        seekToClientX(e.clientX);
      });
      bar.addEventListener("pointermove", function (e) {
        if (dragging) seekToClientX(e.clientX);
      });
      bar.addEventListener("pointerup", function () { dragging = false; });
      bar.addEventListener("pointercancel", function () { dragging = false; });

      // Teclado: flechas mueven ±5 s
      bar.addEventListener("keydown", function (e) {
        if (!video.duration) return;
        if (e.key === "ArrowRight") { video.currentTime = Math.min(video.duration, video.currentTime + 5); e.preventDefault(); }
        else if (e.key === "ArrowLeft") { video.currentTime = Math.max(0, video.currentTime - 5); e.preventDefault(); }
      });
    }

    // Clic sobre el video: pausa/reanuda. El botón de play reaparece en pausa.
    if (video) {
      video.style.cursor = "pointer";
      video.addEventListener("click", function () {
        if (video.paused) { video.play(); btn.classList.add("is-hidden"); }
        else { video.pause(); btn.classList.remove("is-hidden"); }
      });
    }

    // Si el video sale de la vista mientras se reproduce, se pausa solo
    // (p. ej. al hacer scroll) y el botón de play reaparece.
    if (video && "IntersectionObserver" in window) {
      var pauseObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting && !video.paused) {
            video.pause();
            btn.classList.remove("is-hidden");
          }
        });
      }, { threshold: 0.35 });
      pauseObs.observe(video);
    }

    var started = false; // para no duplicar video_play al reanudar

    btn.addEventListener("click", function () {
      btn.classList.add("is-hidden");

      if (video && typeof video.play === "function") {
        // Video real SIN controles nativos. video_play solo la primera vez.
        if (!started) { started = true; if (A) A.videoPlay(); }
        if (bar) bar.hidden = false; // mostrar la barra al empezar
        var p = video.play();
        if (p && typeof p.catch === "function") {
          p.catch(function () { btn.classList.remove("is-hidden"); });
        }
        video.addEventListener("ended", function () {
          if (A) A.videoComplete();
          btn.classList.remove("is-hidden");
        }, { once: true });
      } else {
        if (A) A.videoPlay();
        // Mock: simulamos la reproducción para poder medir "complete".
        var delay = reduceMotion ? 0 : 2600;
        setTimeout(function () {
          if (A) A.videoComplete();
          btn.classList.remove("is-hidden");
        }, delay);
      }
    });
  }

  /* ------------------------------------------------------------
     4) Hero: arco de trayectoria (un solo momento de entrada)
     ------------------------------------------------------------ */
  function animateShotArc() {
    var path = document.getElementById("arcPath");
    var ball = document.getElementById("arcBall");
    if (!path || !ball) return;

    var length = path.getTotalLength();

    if (reduceMotion) {
      ball.style.opacity = "1";
      var end = path.getPointAtLength(length);
      ball.setAttribute("cx", end.x);
      ball.setAttribute("cy", end.y);
      return;
    }

    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;

    var DURATION = 1500, start = null;
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / DURATION, 1);
      var e = easeOut(t);
      path.style.strokeDashoffset = String(length * (1 - e));
      var pt = path.getPointAtLength(length * e);
      ball.setAttribute("cx", pt.x);
      ball.setAttribute("cy", pt.y);
      ball.style.opacity = "1";
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------
     5) Esqueleto: se dibuja al entrar en viewport
     ------------------------------------------------------------ */
  function wireSkeletons() {
    var phones = document.querySelectorAll(".phone[data-skeleton]");
    if (!phones.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      phones.forEach(function (p) { p.classList.add("is-drawn"); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-drawn"); obs.unobserve(en.target); }
      });
    }, { threshold: 0.3 });

    phones.forEach(function (p) {
      var rect = p.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        setTimeout(function () { p.classList.add("is-drawn"); }, 300);
      } else {
        obs.observe(p);
      }
    });
  }

  /* ------------------------------------------------------------
     6) Contadores de métricas (animan al entrar en viewport)
        data-count="0" por ahora (placeholders reales). Cuando pongas
        números reales en data-count, el contador los anima solo.
     ------------------------------------------------------------ */
  function wireCounters() {
    var nums = document.querySelectorAll(".metric__num[data-count]");
    if (!nums.length) return;

    function run(el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      if (reduceMotion || target === 0) { el.textContent = String(target); return; }
      var dur = 1100, start = null;
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / dur, 1);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!("IntersectionObserver" in window)) { nums.forEach(run); return; }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); obs.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { obs.observe(n); });
  }

  /* ------------------------------------------------------------
     7) FAQ en acordeón: al abrir una pregunta, las demás se cierran.
        analytics.js escucha 'toggle' para faq_open pero solo registra
        al ABRIR (item.open === true), así que cerrar las otras aquí no
        genera eventos falsos.
     ------------------------------------------------------------ */
  function wireFaqAccordion() {
    var items = document.querySelectorAll(".faq__item");
    if (!items.length) return;
    items.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (!item.open) return;
        items.forEach(function (other) {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  /* ------------------------------------------------------------
     Arranque
     ------------------------------------------------------------ */
  function init() {
    fillHiddenFields();
    wireForm();
    wireDemo();
    animateShotArc();
    wireSkeletons();
    wireCounters();
    wireFaqAccordion();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
