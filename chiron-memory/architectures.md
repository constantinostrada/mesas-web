# architecture

How the system is put together — layers, boundaries, and how data flows.

## estados.js es el único módulo con el vocabulario de estados (TRANSICIONES, ETIQUETAS, esC…

What: estados.js es el único módulo con el vocabulario de estados (TRANSICIONES, ETIQUETAS, esCerrado); tanto app.js (pantalla cliente) como panel.js (pantalla mozo) lo importan en vez de tener copias propias. · Why: panel.js ya tenía TRANSICIONES/ETIQUETAS duplicadas con un comentario marcando eso como problema; agregar una tercera copia en app.js hubiera hecho más probable que cliente y mozo mostraran etiquetas distintas para el mismo estado. · Where: estados.js, importado por app.js y panel.js. · Learned: esCerrado() se deriva de las transiciones (un estado sin salida es terminal) más 'servido' explícito, para que un estado nuevo agregado a TRANSICIONES no quede afuera de esCerrado por olvido. <!-- id: b53ff0d5-1751-4aa2-a3bc-4b1d6c7d280b-3 -->
