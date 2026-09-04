# gotcha

A non-obvious pitfall or trap, learned the hard way.

## Probar el poll en una pestaña oculta: Chrome estrangula los timers

**What:** Verificar el refresco de 4s o el reloj de 1s del aviso de conexión en
una pestaña que no está visible (`document.visibilityState === "hidden"`, como
la que maneja la automatización del navegador) no mide lo que parece: Chrome
limita `setInterval` a ~1/s y, con la pestaña oculta varios minutos, a ~1/min.
Un corte de API que debería mostrar el aviso a los 12s puede no mostrarlo en 45.
**Why:** Es throttling del navegador, no del código; en la pestaña visible del
usuario los tiempos son los reales.
**Where:** `app.js`, `panel.js`, `conexion.js` (todo lo que dependa de
`setInterval`).
**Learned:** 2026-09-04. Para probarlo sin depender de los timers: disparar un
`change` en el selector (`#mozo` / `#mesa`) corre un ciclo real del poll a
pedido, y para esperar a que las llamadas cierren conviene ceder el turno con
`MessageChannel` en vez de `setTimeout`, que también está estrangulado.

## A anchos de viewport por debajo de 320px (p.ej

What: A anchos de viewport por debajo de 320px (p.ej. pantalla externa de un plegable, ~280px) el texto completo del aviso de conexión envuelve a dos líneas y duplica el alto de la franja reservada (20px→40px), rompiendo la garantía de que el contenido no se corre · Why: se resolvió con una media query bajo 320px que oculta las palabras 'sin actualizar', dejando 'Sin conexión · hace 20 segundos' en una sola línea · Where: styles.css, conexion.js. <!-- id: 308a9d5b-e3ae-4b23-bffe-333ff282a69f-10 -->

## El `<span id="conexion">` original en app.js vivía dentro de `#mis-pedidos`, una sección…

What: El `<span id="conexion">` original en app.js vivía dentro de `#mis-pedidos`, una sección `hidden` hasta que el cliente pide algo, y mostraba 'sin conexión' ya al primer fallo sin indicar desde cuándo · Why: eso hacía que el aviso a veces ni se viera y generara parpadeo con fallos aislados de red — reemplazado por el módulo conexion.js con franja siempre reservada fuera de esa sección · Where: app.js, index.html. <!-- id: 308a9d5b-e3ae-4b23-bffe-333ff282a69f-7 -->

## El ciclo de poll de panel.js (Promise.all de /pedidos + /mesas) ya es todo-o-nada, así qu…

What: El ciclo de poll de panel.js (Promise.all de /pedidos + /mesas) ya es todo-o-nada, así que 'actualización buena' (todas las llamadas del ciclo respondieron) sale gratis sin lógica adicional · Why: — · Where: panel.js. <!-- id: 308a9d5b-e3ae-4b23-bffe-333ff282a69f-8 -->

## Los fallos de un POST (p.ej

What: Los fallos de un POST (p.ej. error al cambiar el estado de un pedido) no pasan por el contador de fallos del poll porque el POST nunca llega a `refrescar()` · Why: mantiene el aviso de conexión exclusivamente ligado al poll periódico, no a acciones puntuales del usuario · Where: panel.js. <!-- id: 308a9d5b-e3ae-4b23-bffe-333ff282a69f-9 -->
