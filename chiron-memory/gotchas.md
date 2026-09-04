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
