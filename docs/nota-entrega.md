# Nota de entrega — Landing page BallIt

## Propuesta de valor
BallIt es una app de escritorio que analiza con IA la técnica de tiro de un
jugador amateur de básquetbol. El jugador sube o graba un video de su tiro y
recibe su esqueleto y sus ángulos dibujados sobre su propio video, un puntaje
de 0 a 100 de la alineación del codo con veredicto 🟢🟡🔴, consejos en lenguaje
simple generados con IA a partir de mediciones reales ("tu codo se separa 41°
del torso; lo ideal es menos de 22°"), e historial para comparar antes/después.

A diferencia de las apps genéricas que tiran un número sin explicarlo, BallIt
traduce la medición en algo accionable, para el jugador de 18–25 años que
entrena solo, se graba con el celular y no sabe qué está haciendo mal.

## CTA (llamado a la acción)
**"Quiero probar BallIt"** — mismo texto en todos los puntos del sitio (nav,
hero, pasos, costo de inacción y formulario final) para poder medirlo de forma
consistente. Lleva siempre al formulario de registro de la lista de acceso.

## Métrica principal
**Tasa de conversión visita → `generate_lead`**: porcentaje de sesiones en las
que el visitante envía con éxito el formulario de registro (correo + nivel + mano
de tiro opcional). Es el evento de conversión principal en GA4.

## Métricas secundarias
- `click_cta` (por `cta_id` y `cta_location`): qué CTA genera más clics.
- `scroll_depth` (25 / 50 / 75 / 90 %): cuánto de la página se consume.
- `form_start`: cuántos empiezan el formulario (para medir abandono vs. envío).
- `video_play` / `video_complete`: interés en ver el producto en acción.
- `faq_open` (por pregunta): qué objeciones pesan antes de decidir.
- Engagement time y engaged sessions / bounce (nativos de GA4).
- Todas segmentables por `variant` (A/B).

## Hipótesis A/B (resumen)
Variable única: el titular del hero.
- **A (control, problema):** "¿Sabes por qué fallas tus tiros? Tu codo ya lo sabe."
- **B (variación, resultado):** "Corrige tu tiro en casa: ve exactamente qué ajustar, sin entrenador."

Asignación 50/50 persistida en `localStorage`, forzable con `?variant=A|B`.
KPI: tasa de conversión visita → `generate_lead` por variante. Detalle completo
en `docs/hipotesis-ab.md`.

## Próximos 3 pasos del usuario
1. **Deja tu correo y recibe acceso** al prototipo de escritorio.
2. **Sube o graba un video de tu tiro** (con el celular basta).
3. **Recibe tu análisis y sigue tu progreso**, comparando antes/después.

---

## Datos reales pendientes
- ID de GA4: **[COMPLETAR]** (hoy `G-XXXXXXXXXX` en `analytics.js`).
- Endpoint del formulario: **[COMPLETAR]** (constante `FORM_ENDPOINT` en `analytics.js`).
- Testimonios reales: **[COMPLETAR]** (3 bloques en la sección de confianza).
- Métricas reales de tracción: **[COMPLETAR]** (3 contadores en la sección de confianza).
- Video/GIF real de la demo: **[COMPLETAR]** (contenedor marcado en la sección "producto").
- Precio / plan: **definido** (sección "precios" + FAQ). Planes: Gratis 0 COP (2
  análisis/semana), Pro 45.000 COP/mes (ilimitado), Paquete de 5 por 12.000 COP,
  Academia a tarifa fija (post-MVP).
- Enlace público publicado: **[COMPLETAR]** (ver README, sección de publicación).
