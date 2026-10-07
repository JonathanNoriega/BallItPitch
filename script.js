/* ================================================================
   BallIt — animación de entrada
   Un solo momento trabajado, no efectos repetidos por sección:
     1) El arco de trayectoria del hero se "dibuja" y el balón lo
        recorre una vez al cargar.
     2) El esqueleto del mockup se dibuja cuando el teléfono entra
        en viewport (IntersectionObserver).
   Respeta prefers-reduced-motion: si está activo, todo queda en su
   estado final sin movimiento.
   ================================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ------------------------------------------------------------
     1) Arco de trayectoria del hero
     ------------------------------------------------------------ */
  function animateShotArc() {
    var path = document.getElementById("arcPath");
    var ball = document.getElementById("arcBall");
    if (!path || !ball) return;

    var length = path.getTotalLength();

    if (reduceMotion) {
      // Estado final: arco visible, balón al final del recorrido.
      ball.style.opacity = "1";
      var end = path.getPointAtLength(length);
      ball.setAttribute("cx", end.x);
      ball.setAttribute("cy", end.y);
      return;
    }

    // Preparar el "trazo" oculto del arco.
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;

    var DURATION = 1600; // ms
    var start = null;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / DURATION, 1);
      var eased = easeOutCubic(t);

      // Dibuja el arco progresivamente.
      path.style.strokeDashoffset = String(length * (1 - eased));

      // Mueve el balón sobre el trazo ya dibujado.
      var pt = path.getPointAtLength(length * eased);
      ball.setAttribute("cx", pt.x);
      ball.setAttribute("cy", pt.y);
      ball.style.opacity = "1";

      if (t < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------
     2) Dibujo del esqueleto cuando el teléfono es visible
     ------------------------------------------------------------ */
  function wireSkeletons() {
    var phones = document.querySelectorAll(".phone[data-skeleton]");
    if (!phones.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      // Sin observer / sin movimiento: marcar como dibujado directamente.
      phones.forEach(function (p) {
        p.classList.add("is-drawn");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-drawn");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.35 }
    );

    phones.forEach(function (p) {
      // El teléfono del hero está sobre el pliegue: dibújalo de una vez
      // tras un breve respiro para que el trazo sea perceptible.
      var rect = p.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        setTimeout(function () {
          p.classList.add("is-drawn");
        }, 350);
      } else {
        observer.observe(p);
      }
    });
  }

  /* ------------------------------------------------------------
     Arranque
     ------------------------------------------------------------ */
  function init() {
    animateShotArc();
    wireSkeletons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
