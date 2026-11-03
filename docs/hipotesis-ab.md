# Hipótesis A/B — Titular del hero (BallIt)

## Problema / oportunidad
El hero es lo primero que ve el jugador amateur que llega a la landing. Tenemos
dos formas legítimas de engancharlo: nombrarle el **problema** que ya siente
(falla y no sabe por qué) o mostrarle el **resultado** que puede lograr (corregir
su tiro en casa, sin entrenador). No sabemos cuál mueve más a dejar el correo.
El titular es la variable de mayor apalancamiento sobre la conversión, así que es
el candidato natural para una prueba A/B limpia.

## Versión A — Control (enfoque en el problema)
> "¿Sabes por qué fallas tus tiros? Tu codo ya lo sabe."

Apela al dolor y a la curiosidad: insinúa que la causa es concreta y medible
(el codo) y que la persona hoy no la ve.

## Versión B — Variación (enfoque en el resultado)
> "Corrige tu tiro en casa: ve exactamente qué ajustar, sin entrenador."

Apela al beneficio y a la autonomía: promete una mejora accionable sin depender
de un entrenador, desde casa.

## Cambio realizado
Cambia **únicamente el texto del titular `#heroHeadline`**. Todo lo demás es
idéntico entre versiones: mismo subtítulo, mismo CTA ("Quiero probar BallIt"),
mismo diseño, mismas secciones, mismo formulario. Así cualquier diferencia en la
conversión se atribuye al titular y no a otro factor.

## Implementación
- Asignación **50/50 aleatoria** en el primer visit (`Math.random() < 0.5`).
- **Persistencia en `localStorage`** (`ballit_ab_variant`): el mismo visitante
  siempre ve la misma versión en visitas posteriores.
- **Override por URL** con `?variant=A` o `?variant=B` para pruebas y capturas
  (también se persiste para que las recargas sean consistentes).
- `variant` se envía como **user property** de GA4 y como **parámetro en todos
  los eventos** (`click_cta`, `form_start`, `generate_lead`, `scroll_depth`,
  `video_play`, `video_complete`, `faq_open`).
- Código en `ab-test.js`; el texto de cada versión vive en los atributos
  `data-variant-a` / `data-variant-b` del `<h1>` en `index.html`.

## KPI principal
**Tasa de conversión visita → `generate_lead`**, segmentada por `variant`.

    conversión(variante) = sesiones con generate_lead (variante) / sesiones (variante)

La variante ganadora es la de mayor tasa de conversión, una vez alcanzada
significancia estadística.

## Métricas de control (secundarias)
Para entender *por qué* gana una variante y descartar falsos positivos:
- **`click_cta`** por `cta_id` y `variant` — ¿el titular empuja más clics al CTA?
- **`scroll_depth`** (25/50/75/90 %) por `variant` — ¿una versión retiene más lectura?
- **Engagement time** (GA4) por `variant` — tiempo activo en página.
- **Engaged sessions / bounce** (GA4) por `variant` — ¿una versión reduce el rebote?
- **`video_play` / `video_complete`** por `variant` — interés en ver el producto.
- **`faq_open`** por `variant` — qué objeciones pesan antes de convertir.

## Lectura y decisión
- Comparar la tasa de conversión de A vs B en GA4 (exploración segmentada por la
  user property `variant`).
- Mantener la prueba hasta tener tamaño de muestra suficiente; declarar ganadora
  solo con significancia (ver más abajo si el tráfico no alcanza).
- Al cerrar: fijar el titular ganador como texto por defecto y, si se quiere,
  abrir una nueva prueba sobre otra variable (CTA, subtítulo, imagen del producto).

## Métodos alternativos de validación (si no hay tráfico suficiente)
Una landing de proyecto universitario puede no recibir suficientes visitas para
alcanzar significancia estadística en el A/B. En ese caso, la decisión no se
abandona: se complementa con métodos cualitativos y de muestra pequeña, que
además explican el *porqué* detrás de los números. **Entrevistas** a 5–8
jugadores del público objetivo mostrándoles ambos titulares y preguntando cuál
los haría probar el prototipo y dejar su reseña, y por qué; **pruebas de
usabilidad moderadas** pidiendo
a la persona que complete el registro en voz alta para detectar fricción;
**grabaciones de sesión y mapas de calor** (p. ej. con herramientas tipo
Hotjar/Clarity) para ver hasta dónde llega la gente, dónde duda y dónde abandona;
y **test de preferencia / primer clic** (tipo "cinco segundos") para medir qué
titular comunica el beneficio más rápido. Estos métodos dan dirección accionable
con muestras pequeñas, aunque no sustituyen la significancia estadística del A/B
cuando el tráfico sí alcanza.
