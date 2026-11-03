# BallIt — Landing page pública

Landing de una sola página para **BallIt**, un entrenador de tiro con IA que
analiza tu técnica desde un video, dibuja tu esqueleto y tus ángulos, te da un
puntaje del codo de 0 a 100 y un consejo en lenguaje simple.

El objetivo de la página es la **conversión**: que el visitante deje su correo en
la lista de acceso (evento `generate_lead`), con todo el recorrido medido en
Google Analytics 4 y una prueba A/B real sobre el titular del hero.

## Stack

HTML + CSS + JavaScript vanilla. Sin framework, sin build step.

```
index.html     # estructura, contenido y placeholders (listados arriba del <head>)
styles.css     # diseño (fondo claro, azul marino en títulos, naranja de marca)
ab-test.js     # asignación de variante A/B, persistencia, override por URL
analytics.js   # GA4 (Consent Mode), eventos, captura de UTM  ← CONFIG aquí
main.js        # formulario, demo/video, animación del hero, contadores
docs/
  hipotesis-ab.md   # hipótesis A/B con el formato de la rúbrica
  nota-entrega.md   # nota de entrega (propuesta de valor, CTA, métricas, 3 pasos)
```

## Cómo verlo en local

Ábrelo con cualquier servidor estático (abrir el archivo con `file://` también
funciona, pero un servidor evita problemas con rutas y cookies):

```bash
python -m http.server 8080
# luego abre http://localhost:8080
```

Los eventos se registran en la **consola del navegador** mientras `GA4_ID` sea el
placeholder, para que puedas verificar que se disparan sin enviar nada a GA4.

---

## Configuración (lo que vas a cambiar)

### 1. ID de GA4
En `analytics.js`, arriba del todo:

```js
var GA4_ID = "G-XXXXXXXXXX";   // ← pon aquí tu Measurement ID real
```

El Measurement ID lo encuentras en GA4 → **Administrar → Flujos de datos → (tu
flujo web)**. Tiene el formato `G-XXXXXXXXXX`. Mientras sea el placeholder, GA4 no
se carga y los eventos solo se registran en consola.

### 2. Endpoint del formulario
En `analytics.js`:

```js
var FORM_ENDPOINT = "";   // ← vacío = modo demo (no envía a red, pero simula éxito)
```

Opciones (elige una y pega la URL):

- **Formspree** (lo más rápido): crea un form en formspree.io y pega su URL,
  p. ej. `https://formspree.io/f/xxxxxxx`. El `fetch` POST con `FormData` ya está
  listo; Formspree responde JSON y acepta los campos `email`, `level`, `hand`,
  `variant` y los `utm_*`.
- **Google Apps Script**: publica un Web App que escriba en una hoja de cálculo y
  pega la URL `/exec`. Asegúrate de responder con `200`.
- **Firebase Firestore**: usa una Cloud Function HTTP como endpoint.

Si el endpoint **falla** (respuesta no-OK o error de red), se muestra el estado de
error y **`generate_lead` NO se dispara** — la conversión solo cuenta envíos
exitosos. Con `FORM_ENDPOINT` vacío la página corre en modo demo: no envía a la
red pero sí simula éxito y dispara `generate_lead`, útil para probar el flujo.

### 3. Marcar `generate_lead` como conversión en GA4
1. Entra a GA4 → **Administrar**.
2. En la columna de propiedad, abre **Eventos** (o **Eventos clave** en las
   versiones nuevas).
3. Espera a que `generate_lead` aparezca en la lista (puede tardar hasta 24 h tras
   el primer disparo; para verlo rápido usa **DebugView**).
4. Activa el interruptor **Marcar como evento clave** (antes "Marcar como
   conversión") en la fila de `generate_lead`.
5. A partir de ahí GA4 lo contará como conversión y lo verás en los informes de
   conversiones, segmentable por la user property `variant`.

> Atajo: también puedes crearlo como evento clave por nombre en
> **Administrar → Eventos clave → Nuevo evento clave** escribiendo `generate_lead`.

### 4. Probar cada variante del A/B
- Fuerza la versión por URL:
  - `…/index.html?variant=A` → titular de control (problema)
  - `…/index.html?variant=B` → titular de variación (resultado)
- Sin parámetro, se asigna 50/50 al azar en el primer visit y se **persiste en
  `localStorage`** (clave `ballit_ab_variant`): el mismo navegador siempre verá la
  misma versión.
- Para volver a sortear, borra esa clave de `localStorage` (DevTools →
  Application → Local Storage) o usa una ventana de incógnito.
- La variante viaja como **user property** y como **parámetro `variant`** en todos
  los eventos.

### 5. ¿Dónde veo tiempo en página y rebote?
No se reimplementan: los da GA4.
- **Engagement time**: GA4 → Informes → **Interacción → Páginas y pantallas**
  (columna "Tiempo de interacción medio"), o en **Exploraciones**.
- **Engaged sessions / bounce**: GA4 → **Adquisición** o una exploración con las
  métricas "Sesiones con interacción" y "Tasa de rebote". Segmenta por la user
  property `variant` para comparar A vs B.

---

## Placeholders a llenar antes de publicar "en serio"

Están listados en un comentario al inicio de `index.html`. Resumen:

| Qué | Dónde |
|-----|-------|
| ID de GA4 | `analytics.js` → `GA4_ID` |
| Endpoint del formulario | `analytics.js` → `FORM_ENDPOINT` |
| 3 testimonios reales | `index.html` sección confianza (`[TESTIMONIO REAL #…]`) |
| 3 métricas reales | `index.html` sección confianza (`data-count` de `.metric__num`) |
| Video real de la demo | `index.html` sección producto (`<!-- DEMO: … -->`) |

> Precio: **ya definido** en la sección "precios" (Gratis / Pro / Paquete de 5 /
> Academia). Si cambian las cifras, se editan en los bloques `.plan` de
> `index.html` y en la respuesta de la FAQ de precio.

Para las **métricas**: cambia `data-count="0"` por el número real (p. ej.
`data-count="37"`) y reemplaza el texto del `<span class="metric__label">`. El
contador anima solo al entrar en viewport.

Para el **video**: dentro de `.phone__screen` de la sección producto, sustituye el
bloque `#demoMock` por tu `<video id="demoVideo" …>`. El botón `#demoPlay` ya
dispara `video_play` al pulsarlo y `video_complete` al terminar (con un video real
usa el evento `ended`; con el mock lo simula).

---

## Publicación — recomendación: **Vercel**

Es un sitio estático (sin build), así que Vercel lo publica tal cual. El archivo
`vercel.json` ya lo deja configurado: sin framework, sin paso de build, con
`cleanUrls` activado. Tienes dos caminos; elige uno.

### Camino A — CLI de Vercel (rápido, desde esta carpeta)
1. Instala la CLI (una sola vez):
   ```bash
   npm install -g vercel
   ```
2. Desde la carpeta del proyecto (la que tiene `index.html`), inicia sesión y
   despliega:
   ```bash
   vercel login
   vercel            # primer deploy: responde las preguntas (ver abajo)
   ```
3. Responde al asistente:
   - *Set up and deploy?* → **Y**
   - *Which scope?* → tu cuenta
   - *Link to existing project?* → **N**
   - *Project name?* → `ballit` (o lo que quieras)
   - *In which directory is your code located?* → **`./`** (Enter)
   - Framework / build: **ninguno** (Vercel lo detecta como estático; si pregunta,
     deja build command vacío y output directory en blanco).
4. Te da una URL de previsualización. Para publicar la versión definitiva
   (dominio de producción):
   ```bash
   vercel --prod
   ```
5. Tu enlace público queda en `https://ballit.vercel.app` (o el nombre que elegiste)
   con HTTPS. Para actualizar, vuelve a correr `vercel --prod`.

### Camino B — Importar desde GitHub (deploy automático en cada push)
1. Sube el proyecto a un repositorio de GitHub (con `index.html` en la raíz).
2. Entra a <https://vercel.com/new> e **importa** ese repositorio.
3. En la pantalla de configuración:
   - **Framework Preset:** `Other` (estático).
   - **Build Command:** déjalo vacío.
   - **Output Directory:** déjalo vacío (sirve la raíz).
   - **Root Directory:** `./`.
4. Pulsa **Deploy**. En ~1 min tienes tu URL `https://<proyecto>.vercel.app`.
5. A partir de ahí, cada `git push` a la rama principal vuelve a desplegar solo.

> Probar las variantes A/B en Vercel: añade el parámetro a la URL pública, p. ej.
> `https://ballit.vercel.app/?variant=A` y `…/?variant=B`.

### Alternativa — Netlify Drop (arrastrar carpeta, sin cuenta)
1. Entra a <https://app.netlify.com/drop>.
2. Arrastra la **carpeta del proyecto** a la zona de drop.
3. Te da una URL `https://<algo-aleatorio>.netlify.app` al instante.

### Alternativa — GitHub Pages
1. Sube el proyecto a un repositorio de GitHub (el `index.html` debe estar en la
   raíz del repo o en `/docs`).
2. Repo → **Settings → Pages**.
3. En **Build and deployment → Source** elige **Deploy from a branch**.
4. Branch: `main` (o `master`), carpeta `/root` (o `/docs` si lo pusiste ahí).
   Guarda.
5. En 1–2 minutos tu sitio queda en
   `https://<usuario>.github.io/<repositorio>/`.
6. Como las rutas de CSS/JS son relativas, funciona tal cual en el subdirectorio.

### Alternativa — Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting      # public dir: . (el que tiene index.html); SPA: No
firebase deploy
```
Te da una URL `https://<proyecto>.web.app`.

> Nota: esta carpeta contiene los archivos de la landing en la raíz. Si prefieres
> aislar el deploy, mueve `index.html`, `styles.css`, `*.js` y `docs/` a una
> subcarpeta (p. ej. `public/`) y publica esa.

---

## Checklist rápido antes de entregar
- [ ] `GA4_ID` real en `analytics.js`.
- [ ] `FORM_ENDPOINT` real en `analytics.js` y prueba de envío.
- [ ] `generate_lead` marcado como evento clave/conversión en GA4.
- [ ] Testimonios y métricas reales puestos.
- [ ] Video real de la demo (o dejar el mock si aún no hay).
- [x] Precio/plan definido (sección "precios" + FAQ).
- [ ] Sitio publicado y enlace probado en móvil y escritorio.
- [ ] Capturas de `?variant=A` y `?variant=B`.
