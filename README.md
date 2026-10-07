# BallIt — Pitch

Sitio estático de una sola página para presentar **BallIt**: un entrenador de tiro
con IA que analiza tu técnica desde un video, dibuja tu esqueleto y tus ángulos, y
redacta un consejo en lenguaje simple a partir de mediciones reales.

Es contenido de presentación en vivo (proyectado o en navegador), no una app
funcional: sin backend, sin llamadas a API.

## Stack

HTML + CSS + JavaScript vanilla, sin framework ni build step.

```
index.html    # estructura y contenido
styles.css    # dirección de diseño (base oscura, naranja de marca, display condensada)
script.js     # único momento de entrada (arco de tiro + dibujo del esqueleto)
```

## Cómo verlo

Abre `index.html` directamente en el navegador, o sírvelo con cualquier static host:

```bash
python3 -m http.server 8080
# luego abre http://localhost:8080
```

## Demo

La sección **Demo** tiene un mockup estático de la pantalla de Resultados dentro de
un marco tipo teléfono. Para reemplazarlo por la grabación real de la app, busca el
comentario `<!-- DEMO: reemplazar ... -->` en `index.html` y sustituye el bloque
`.shot` por tu `<video>` o `<img>`.
