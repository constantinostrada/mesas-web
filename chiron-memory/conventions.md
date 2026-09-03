# convention

A rule the codebase follows — naming, patterns, and where things live.

## `estados.js` es la única copia del vocabulario de estados en este repo
**What:** `TRANSICIONES`, `ETIQUETAS` y `esCerrado` viven en `estados.js`, en la
raíz. `panel.js` y `app.js` los importan; ninguna pantalla define los suyos.
**Why:** El contrato ya está duplicado entre repos (`mesas-shared`, `mesas-api`,
`mesas-web`) hasta que `mesas-shared` se publique como paquete. Duplicarlo
*dentro* de este repo agrega una tercera copia y garantiza que las dos
pantallas terminen llamando distinto a lo mismo: el work order pide
explícitamente que el cliente vea las mismas etiquetas que el mozo.
**Where:** `estados.js`, importado por `panel.js` y `app.js`.
**Learned:** 2026-09-03, al agregar el estado en vivo a la pantalla del cliente.

## Polling cada 4s con setInterval, sin websockets, en las dos pantallas
**What:** Cliente y panel refrescan con `setInterval(..., 4000)` y una guarda
de un ciclo a la vez (`enVuelo`). Si un ciclo falla no se repinta: se mantiene
el último estado conocido y se avisa al margen ("sin conexión"), sin tapar la
lista.
**Why:** 4s alcanza para un salón y evita la infraestructura de websockets.
Sin la guarda, dos ciclos solapados con la API lenta pueden repintar en orden
invertido y mostrar un estado viejo. Y un error que tape la lista deja al
cliente peor que un dato de hace unos segundos.
**Where:** `app.js` (`ciclo`), `panel.js` (`refrescar`).
**Learned:** 2026-09-03.
