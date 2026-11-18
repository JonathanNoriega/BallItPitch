# BallIt — Cambios en la LANDING (repo `BallItPitch`, HTML/CSS/JS vanilla, Vercel)

> **Para Claude Code:** este archivo es tu única fuente para la landing. El back y su **contrato de demos** están en `CAMBIOS_BACK.md` (sección 2); léelo primero. **[HECHO VERIFICADO]** = lo confirmé leyendo el código.

---

## 0. Qué se quiere

Un **mini-MVP "falso"** dentro de la landing: la persona elige uno de 3 videos de ejemplo y vive el mismo recorrido que en la app, **con datos que pide al back** (nada hardcodeado):

1. Elige un ejemplo → ve el **video original** y un botón **"Analizar este tiro"**.
2. Pulsa → animación de **"procesando"** (~3–4 s).
3. Ve el **video anotado** (esqueleto + ángulo ya dibujados) **junto con sus datos**: puntaje, veredicto y el consejo del coach.
4. CTA a la app real.

---

## 1. Hallazgos

| # | Hallazgo |
|---|---|
| L-H1 | **[HECHO VERIFICADO]** Sin framework ni build. Scripts al final del `<body>`: `ab-test.js`, `analytics.js`, `main.js` (líneas ~774-776 de `index.html`). |
| L-H2 | **[HECHO VERIFICADO]** `analytics.js` expone `window.BallItAnalytics` (`track`, `videoPlay`, `videoComplete`, `generateLead`, `variant`, …). `track()` ya agrega `variant` a todos los eventos. |
| L-H3 | **[HECHO VERIFICADO]** `wireCtas()` enlaza los `.js-cta` presentes **al cargar**. Un botón insertado después por JS no queda enlazado solo. |
| L-H4 | **[HECHO VERIFICADO]** La sección `#producto` ya muestra un teléfono con `demo.mp4` (17 MB, sigue en uso). Los CTA apuntan a `https://ball-it-fd.vercel.app/` (la app). No hay CSP ni headers en `vercel.json`. |
| L-H5 | **[HECHO VERIFICADO, por el front]** El back real es `https://ballit-api.onrender.com`. **[SUPUESTO]** en plan gratuito de Render se duerme (primera petición 30–60 s). |

---

## 2. Cambios

### L1. Archivos

- Nuevo **`demo.js`**, con `<script src="demo.js"></script>` justo **después de `main.js`** (necesita `window.BallItAnalytics`, que ya existe tras `analytics.js`).
- Nueva sección en `index.html` + estilos en `styles.css` reutilizando las variables CSS y el tema oscuro existentes.
- Constante al inicio de `demo.js`, mismo estilo que `GA4_ID`:
  ```js
  var API_BASE = "https://ballit-api.onrender.com";   // back en Render
  ```

### L2. Sección `#prueba` ("Pruébalo ahora")

Va **inmediatamente después de `#producto`**. Estructura:

- **Título y una línea:** "Elige un tiro de ejemplo y mira cómo BallIt lo analiza. Sin subir nada."
- **Tarjetas:** generadas por JS con `GET {API_BASE}/demos`: miniatura (`API_BASE + thumb_url`), título, descripción, etiqueta de veredicto con color. Mientras carga, 3 *skeletons*.
- **Panel del demo** (reemplaza a las tarjetas al elegir una; botón "← Elegir otro ejemplo"):
  1. **Estado "original":** `<video src=API_BASE+video_url poster=API_BASE+thumb_url controls playsinline muted preload="metadata">` + botón **"Analizar este tiro"**.
  2. **Estado "procesando":** barra de progreso y texto que cambia — "Preparando video… → Detectando movimiento… → Generando feedback…" — **~3–4 s** (~1 s con `prefers-reduced-motion`). Mientras tanto ya se pidió `GET {API_BASE}/demos/{slug}` (se lanza al **elegir** la tarjeta, no al pulsar "Analizar", para que el JSON ya esté listo). Si aún no llegó al terminar la animación, esperar con el texto "Generando feedback…".
  3. **Estado "resultado":** `<video src=API_BASE+demo.annotated_url controls playsinline muted>` (el **anotado**; mismo largo y fps que el original), **puntaje** `summary.score` en un anillo o número grande con CSS, **veredicto** con color (bueno/dudoso/malo), y del coach: `coach.resumen`, un ítem de `lo_hiciste_bien` (si hay) y el primero de `puedes_mejorar` (`titulo` + `intenta_esto`). Además `summary.n` tiros analizados.
  4. **CTA:** botón **"Quiero probar BallIt"** → `https://ball-it-fd.vercel.app/` (`target="_blank" rel="noopener"`), con `btn btn--solid js-cta`, `data-cta-id="demo_resultado"`, `data-cta-location="demo"`. Por L-H3, **enlazarlo manualmente** al crearlo: llamar `BallItAnalytics.track('click_cta', {cta_id:'demo_resultado', cta_location:'demo'})` en su `click` (copiar los nombres de parámetros exactos que usa `wireCtas` en `analytics.js`).
- Todo texto que venga del back se inserta con `textContent` (no `innerHTML`).

### L3. Degradación elegante y servidor dormido (obligatorio)

La landing es la cara pública: **nunca debe verse rota**.
- **Despertar el back:** al cargar la página, lanzar `fetch(API_BASE + '/demos')` en segundo plano (sin bloquear nada). En Render gratuito esto "despierta" el servicio mientras la persona lee el resto de la página. Guardar la promesa y reutilizarla al pintar las tarjetas.
- Mientras la sección no tenga datos, **mantenerla oculta** (`hidden`); mostrarla solo cuando `/demos` responda bien.
- Si `/demos` falla o no responde en **~60 s** (`AbortController`), la sección **sigue oculta** y la landing queda igual que hoy. Sin errores visibles; a lo sumo un `console.warn`.
- Si falla `GET /demos/{slug}` al elegir una tarjeta: mensaje amable en el panel ("No pudimos cargar este ejemplo. Prueba otro o abre la app") + el CTA a la app.
- Si falla la carga de un video: `error` en el `<video>` → mostrar el mismo mensaje, sin romper el resto.

### L4. Analítica (`analytics.js`)

En `window.BallItAnalytics`, junto a `videoPlay`/`videoComplete`:

```js
demoSelect: function (slug) { track("demo_select", { demo_slug: slug }); },
demoAnalyze: function (slug) { track("demo_analyze", { demo_slug: slug }); },
demoResult: function (slug, score) { track("demo_result_view", { demo_slug: slug, score: score }); },
```

Llamarlos al elegir tarjeta, al pulsar "Analizar este tiro" y al mostrar el resultado. Añadir los tres nombres al comentario de cabecera de `analytics.js` y a "métricas secundarias" en `README.md` y `docs/nota-entrega.md`. Esto da el embudo *elige → analiza → ve resultado → clic al CTA*, segmentable por `variant`.

### L5. Texto de la sección `#producto`

Sin cambios de código. Solo revisar que la copia ("Graba y analiza en la app") no contradiga a la nueva sección; si hace falta, ajustar una frase. **No tocar** `ab-test.js`, el formulario/`FORM_ENDPOINT`, el hero ni `demo.mp4`.

---

## 3. Checks de aceptación

- [ ] Con el back arriba: aparecen 3 tarjetas con miniaturas reales; elegir una → video **original** → "Analizar este tiro" → procesando → video **anotado** con puntaje, veredicto y coach.
- [ ] Con el back **apagado o dormido** (probarlo de verdad): la sección `#prueba` no aparece y el resto de la landing funciona idéntico; cuando el back despierta, aparece sola.
- [ ] En consola (GA4 aún en modo log) se ven `demo_select`, `demo_analyze`, `demo_result_view` y `click_cta` con `cta_id=demo_resultado`.
- [ ] Videos reproducibles en **celular real** (Safari iOS y Chrome Android), con *seek* (depende del 206 del back).
- [ ] Tema claro y oscuro correctos; sin scroll horizontal en 360 px.
- [ ] CORS: la landing en su dominio real y en `localhost` puede leer `/demos` (requiere `CAMBIOS_BACK.md`, B4.1, con el dominio de la landing).

## 4. Pendientes del usuario

- Dominio de la landing (para CORS en Render).
- Que el back ya tenga los demos generados y desplegados antes de probar esto.
