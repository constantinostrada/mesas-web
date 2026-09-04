# architecture

How the system is put together — layers, boundaries, and how data flows.

## estados.js es el único módulo con el vocabulario de estados (TRANSICIONES, ETIQUETAS, esC…

What: estados.js es el único módulo con el vocabulario de estados (TRANSICIONES, ETIQUETAS, esCerrado); tanto app.js (pantalla cliente) como panel.js (pantalla mozo) lo importan en vez de tener copias propias. · Why: panel.js ya tenía TRANSICIONES/ETIQUETAS duplicadas con un comentario marcando eso como problema; agregar una tercera copia en app.js hubiera hecho más probable que cliente y mozo mostraran etiquetas distintas para el mismo estado. · Where: estados.js, importado por app.js y panel.js. · Learned: esCerrado() se deriva de las transiciones (un estado sin salida es terminal) más 'servido' explícito, para que un estado nuevo agregado a TRANSICIONES no quede afuera de esCerrado por olvido. <!-- id: b53ff0d5-1751-4aa2-a3bc-4b1d6c7d280b-3 -->

## El aviso de conexión perdida vive en un módulo compartido `conexion.js`, con una fábrica…

What: El aviso de conexión perdida vive en un módulo compartido `conexion.js`, con una fábrica `crearAvisoDeConexion(nodo)` que expone `exito()` y `fallo()`, llamados por panel.js/app.js al terminar cada ciclo de poll · Why: mismo precedente que estados.js — un solo vocabulario en vez de dos copias que se desincronizan entre pantallas · Where: conexion.js, importado por panel.js y app.js. <!-- id: 308a9d5b-e3ae-4b23-bffe-333ff282a69f-0 -->

## `conexion.js` mantiene su propio reloj interno (`setInterval` de 1s) para refrescar el te…

What: `conexion.js` mantiene su propio reloj interno (`setInterval` de 1s) para refrescar el texto del tiempo mientras el aviso está visible, desacoplado del ciclo de poll de 4s; así el contador sigue avanzando aunque la API nunca vuelva a responder, y el intervalo se limpia en cuanto el aviso se oculta · Why: el tiempo mostrado no puede depender de que la API responda, ya que es justamente la ausencia de respuesta la que hay que reflejar · Where: conexion.js, dentro de crearAvisoDeConexion(). <!-- id: 308a9d5b-e3ae-4b23-bffe-333ff282a69f-12 -->
