# contradiction

A memory that clashes with newer reality — flagged to be resolved.

## mesas-shared/src/estados.js (y mesas-api en la rama main) no conocen el estado listo_para…

What: mesas-shared/src/estados.js (y mesas-api en la rama main) no conocen el estado listo_para_servir; ese estado sólo existe en la rama sin mergear wo/agregar-estado-listo-para-servir-a-la-maquina-de-d3cdf8e1 de mesas-api. · Why: mesas-shared está pensado como fuente única del contrato pero no se publica como paquete, así que las copias (mesas-api, mesas-web) se desincronizan. · Where: mesas-shared/src/estados.js vs mesas-api/src/estados.js (rama main) vs la rama wo/agregar-estado-listo-para-servir-.... · Learned: con la API de main, marcar 'Listo para servir' devuelve 409 y ese estado nunca llega a mostrarse en el cliente ni en el panel; para probar ese flujo hay que levantar la API desde la rama sin mergear. Se resuelve mergeando esa rama a main. <!-- id: b53ff0d5-1751-4aa2-a3bc-4b1d6c7d280b-6 -->
