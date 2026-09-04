# decision

A choice made and the reasoning behind it — the path taken over the alternatives.

## Lo que ve el cliente lo define la MESA, no el navegador

**What:** La pantalla del cliente pide `GET /pedidos?mesa_id=<mesa>` y muestra
todos los pedidos de esa mesa. El filtro por mesa vive en la API (combinable
con `?mozo_id=` en AND; una mesa inexistente da 404, igual que `POST /pedidos`).
**Why:** La API no tiene noción de "cliente", y la primera versión resolvió eso
guardando los ids propios en `localStorage` y cruzándolos contra `GET /pedidos`
entero. Se descartó: una mesa es compartida —si dos comensales piden cada uno
desde su teléfono, los dos tienen que ver lo que va a llegar a la mesa— y con
la mesa como identidad no hay nada que persistir ni que quede colgado cuando el
store en memoria de la API se reinicia. Traer el salón completo para descartar
casi todo tampoco escalaba.
**Where:** `app.js` (`refrescarPedidos`), `mesas-api/src/server.js`
(`GET /pedidos`).
**Learned:** 2026-09-03. El costo aceptado es que los pedidos de una visita
anterior a la misma mesa siguen visibles (atenuados, en "Ya cerrados") hasta
que el store de la API se reinicie: no hay concepto de "cerrar la mesa".

## La mesa elegida es lo único que la pantalla del cliente persiste

**What:** `app.js` guarda la mesa en `localStorage` (`mesas-web:mesa`) y la
restaura al abrir. Nada más se persiste.
**Why:** Con el seguimiento filtrado por mesa en la API, la mesa es la única
llave que hace falta para volver a encontrar los pedidos: si al reabrir el
navegador el `<select>` volviera a la primera mesa, el cliente no vería nada
aunque sus pedidos siguieran abiertos.
**Where:** `app.js` (`leerMesa`, `guardarMesa`).
**Learned:** 2026-09-03. El acceso va siempre en `try/catch`: en modo privado
`localStorage` puede lanzar, y no poder pedir por no haber podido guardar la
mesa sería mucho peor que volver a elegirla.

## Los pedidos cerrados se atenúan y bajan, no se borran en vivo

**What:** `servido`, `pagado` y `cancelado` se pintan en un bloque "Ya cerrados"
abajo y atenuado, nunca se sacan de la pantalla mientras el cliente la tiene
abierta.
**Why:** Un pedido que desaparece de golpe delante de quien lo está mirando es
peor que uno atenuado: con `cancelado` el cliente queda esperando algo que
nadie le va a traer, y con `pagado` parece que se perdió el consumo. Atenuarlos
los saca del foco sin sacarlos de la vista.
**Where:** `app.js` (`pintarMisPedidos`, `esCerrado` en `estados.js`).
**Learned:** 2026-09-03. Con el filtro por mesa en la API ya no hay ninguna
purga de `localStorage` que administrar: la lista se reconstruye en cada poll
desde lo que la API dice de esa mesa.

## Cancelar es su propio endpoint (`POST /pedidos/:id/cancelar`), no un `/estado` más

**What:** La cancelación se expone como `POST /pedidos/:id/cancelar` en
`mesas-api`, aunque `POST /pedidos/:id/estado` con `{"estado":"cancelado"}`
haría lo mismo (la transición ya era legal). El endpoint nuevo responde el
mismo 409 y con la misma redacción que `/estado`
(`No se puede pasar de "<origen>" a "cancelado"`).
**Why:** Quien cancela no está eligiendo el próximo estado del pedido, está
dándolo de baja: no tiene por qué saber que "cancelado" es un estado de la
máquina ni cómo se escribe. Reusar el mensaje de error, en cambio, es
deliberado — para quien llama es la misma regla del dominio rechazando, y dos
textos distintos para lo mismo confunden.
**Where:** `mesas-api/src/server.js`, `mesas-api/README.md`;
`mesas-web/panel.js` (el botón elige ruta según el destino).
**Learned:** 2026-09-03. El botón de cancelar del panel se sigue armando solo
desde `TRANSICIONES` (no hay lista aparte de acciones), pero se rotula
"Cancelar" y no `ETIQUETAS.cancelado` ("Cancelado"): un botón dice lo que hace,
no a qué estado lleva.

## "Se cancela mientras siga en cocina" se deriva de las transiciones, no de una lista

**What:** `esCancelable(estado)` en `mesas-shared/src/estados.js` (replicada en
`mesas-api/src/estados.js`) es `puedePasar(estado, "cancelado")`, no una lista
de estados cancelables. Cancelable en `pedido`, `en_preparacion` y
`listo_para_servir`; no en `servido`, `pagado` ni `cancelado`.
**Why:** Mismo criterio que `esCerrado` en `mesas-web/estados.js`: si la regla
se escribe como lista, un estado nuevo agregado a `TRANSICIONES` queda afuera
por olvido, o uno que no debía se vuelve cancelable. La tabla de transiciones
ya es la fuente de verdad; la función sólo le pone nombre a la regla para que
la API no tenga que leerla a ojo.
**Where:** `mesas-shared/src/estados.js`, `mesas-api/src/estados.js`.
**Learned:** 2026-09-03. El work order pedía "sólo se puede cancelar en estados
previos a `en_camino`", pero `en_camino` NO existe en esta máquina de estados:
el estado en que el plato ya salió de la cocina y llegó a la mesa es `servido`,
y se implementó con ese mapeo (`en_camino` ≡ `servido`). `listo_para_servir` sí
es cancelable: el plato está emplatado pero todavía en la cocina.

## El aviso de conexión cortada: 3 ciclos para aparecer, 1 para irse, en franja reservada

**What:** `conexion.js` es el único lugar donde vive el aviso de "los datos que
estás mirando dejaron de actualizarse", y las dos pantallas lo usan igual:
`crearAvisoDeConexion(nodo)` con `exito()` / `fallo()` por ciclo del poll.
Aparece recién al 3er ciclo fallido consecutivo (≈12s), se va con un único
ciclo bueno, y el tiempo que muestra se cuenta desde la última actualización
buena —no desde que apareció—, redondeado en lenguaje humano ("hace 30
segundos") y con reloj propio de 1s que no depende de la API. El nodo
`#conexion` está siempre en el marcado con alto reservado (`min-height`, una
línea): vacío cuando todo anda bien.
**Why:** Asimétrico a propósito: un fallo aislado es ruido normal de red y
avisar al primero hace parpadear el aviso, pero cuando la conexión vuelve no
hay nada que confirmar. El tiempo se cuenta desde la última actualización buena
porque lo que el usuario necesita saber es la antigüedad del dato que está
mirando, no la del aviso (por eso arranca en ~12s y no en cero). Y el alto va
reservado porque insertar el nodo al vuelo corre la lista justo cuando el mozo
va a tocar un botón.
**Where:** `conexion.js`, `app.js` (`ciclo`), `panel.js` (`refrescar`),
`index.html` / `panel.html` (`#conexion`), `styles.css` (`.conexion`).
**Learned:** 2026-09-04. Tres cosas que no son obvias: si la pantalla nunca
tuvo una carga buena el aviso NO aparece (queda el error de carga inicial, que
dice algo más útil que un "desde hace X" sin referencia); el error puntual de
cambiar un estado va a `#msg` y no toca el contador de fallos del poll, así que
son dos mensajes que se ven a la vez; y debajo de 320px de viewport la frase
completa se iría a dos líneas y crecería la franja, así que una media query
esconde `.detalle` en vez de dejar que el contenido salte.

## La pantalla del cliente (app.js) filtra 'sus pedidos' trayendo GET /pedidos completo y cr…

What: La pantalla del cliente (app.js) filtra 'sus pedidos' trayendo GET /pedidos completo y cruzando con los ids guardados en localStorage, en vez de pedirle a la API que filtre por mesa. · Why: mesas-api no soporta ?mesa_id= en GET /pedidos (sólo ?mozo_id=); la alternativa de mostrar todos los pedidos de la mesa fue descartada porque el intent pedía 'sus pedidos' de esta persona/navegador, no los de otros comensales. · Where: app.js. · Learned: con muchas mesas/pedidos abiertos este filtrado client-side no escala; queda pendiente agregar el filtro server-side en mesas-api. <!-- id: b53ff0d5-1751-4aa2-a3bc-4b1d6c7d280b-0 -->

## app.js persiste en localStorage la mesa elegida (mesas-web:mesa) y los ids de pedidos por…

What: app.js persiste en localStorage la mesa elegida (mesas-web:mesa) y los ids de pedidos por mesa (mesas-web:pedidos), restaurando ambos al cargar. · Why: sin guardar la mesa, el <select> volvía a la primera mesa al reabrir el navegador y los pedidos guardados no se mostraban aunque los ids siguieran ahí. · Where: app.js. · Learned: todo acceso a localStorage debe ser tolerante a fallos (try/catch) porque en modo privado del navegador puede lanzar. <!-- id: b53ff0d5-1751-4aa2-a3bc-4b1d6c7d280b-1 -->

## La purga de ids de localStorage (pedidos en estado 'pagado', o que la API ya no conoce) c…

What: La purga de ids de localStorage (pedidos en estado 'pagado', o que la API ya no conoce) corre una sola vez al cargar la pantalla del cliente, no en cada ciclo de polling. · Why: el store de mesas-api es en memoria (si reinicia, ids quedan colgados) pero purgar 'pagado' en cada ciclo hacía desaparecer la tarjeta de golpe mientras el cliente la estaba mirando, violando el requisito de que un pedido servido/pagado no desaparezca abruptamente. · Where: app.js. · Learned: separar 'cuándo se olvida un pedido' (al recargar) de 'cuándo se repinta' (cada poll) evita que un cambio de estado en vivo borre contenido que el usuario está viendo. <!-- id: b53ff0d5-1751-4aa2-a3bc-4b1d6c7d280b-2 -->

## El mensaje estático "Pedido X enviado" que mostraba la pantalla del cliente al confirmar…

What: El mensaje estático "Pedido X enviado" que mostraba la pantalla del cliente al confirmar un pedido fue eliminado por completo; la lista de pedidos con estado lo reemplaza, y el mozo asignado (que antes se mencionaba una sola vez en ese mensaje y se perdía) ahora es un campo persistente de cada tarjeta de pedido, visible también después de recargar. · Why: — · Where: app.js, index.html. · Learned: cualquier dato que sólo vivía en un mensaje de confirmación efímero desaparecía al recargar; moverlo a la tarjeta persistida en localStorage lo hace sobrevivir junto con el resto del estado del pedido. <!-- id: b53ff0d5-1751-4aa2-a3bc-4b1d6c7d280b-7 -->

## El aviso de 'se cortó la conexión' aparece recién tras 3 ciclos de refresco fallidos cons…

What: El aviso de 'se cortó la conexión' aparece recién tras 3 ciclos de refresco fallidos consecutivos (~12s) y desaparece con un único ciclo exitoso (se reinicia el contador de fallos en cualquier éxito) · Why: un fallo aislado de red es ruido normal y no debe generar parpadeo, pero la recuperación debe notarse rápido — 'lento para aparecer, rápido para irse' · Where: conexion.js. <!-- id: 308a9d5b-e3ae-4b23-bffe-333ff282a69f-1 -->

## En la pantalla del cliente, la carga inicial de datos (si sus tres rutas responden bien)…

What: En la pantalla del cliente, la carga inicial de datos (si sus tres rutas responden bien) cuenta como la primera 'actualización buena' de referencia para el aviso de conexión; en el panel del mozo esa carga inicial NO cuenta como referencia · Why: si la API se cae justo entre la carga inicial del cliente y el primer ciclo del poll, sin esa referencia el cliente quedaba con la carta y '#mis-pedidos' oculto y sin ninguna explicación del corte; el panel en cambio ya muestra su propio error de carga inicial en ese caso, así que no necesita la referencia extra · Where: app.js / conexion.js. <!-- id: 308a9d5b-e3ae-4b23-bffe-333ff282a69f-11 -->

## El tiempo mostrado en el aviso de conexión se cuenta desde la última actualización buena…

What: El tiempo mostrado en el aviso de conexión se cuenta desde la última actualización buena (`ultimaBuena`), no desde que el aviso apareció en pantalla, por lo que arranca en ~10-12 segundos y nunca en cero · Why: reflejar la antigüedad real de los datos que se están mirando, no la del aviso · Where: conexion.js, formateado en lenguaje humano redondeado (segundos de a 5, luego minutos, luego horas). <!-- id: 308a9d5b-e3ae-4b23-bffe-333ff282a69f-2 -->

## ** La pantalla del cliente (`app.js`) trae `GET /pedidos` completo y lo cruza contra los…

What: ** La pantalla del cliente (`app.js`) trae `GET /pedidos` completo y lo cruza contra los ids que guardó en `localStorage` (`mesas-web:pedidos`, un array de ids por `mesa_id`). No pide un filtro a la API. ** · Why: ** `GET /pedidos` en `mesas-api` sólo acepta `?mozo_id=`; no hay filtro por mesa ni endpoint por id. Y la API no tiene noción de "cliente": dos personas en la misma mesa son indistinguibles para ella, así que el recorte "mis pedidos" sólo puede vivir en el navegador que los hizo. Con un salón chico traer todo alcanza; el día que no, el filtro tiene que ir a la API. ** · Where: ** `app.js` (`refrescarPedidos`, `idsDeMesa`). ** · Learned: ** 2026-09-03, al implementar el estado en vivo para el cliente. <!-- id: spine-09bb6f6608d9ab9d -->

## ** `app.js` guarda la mesa en `localStorage` (`mesas-web:mesa`) y la restaura al abrir

What: ** `app.js` guarda la mesa en `localStorage` (`mesas-web:mesa`) y la restaura al abrir. ** · Why: ** Los pedidos se guardan por mesa. Si al reabrir el navegador el `<select>` volviera a la primera mesa, el cliente no vería sus pedidos aunque estuvieran guardados — la persistencia de los ids no sirve de nada sin esto. ** · Where: ** `app.js` (`leerMesa`, `guardarMesa`). ** · Learned: ** 2026-09-03. <!-- id: spine-93cb6b1431c0b212 -->
