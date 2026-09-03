# contradiction

A memory that clashes with newer reality — flagged to be resolved.

## `mesas-shared` no conoce `listo_para_servir`
**What:** `mesas-shared/src/estados.js` sigue con la máquina
`pedido → en_preparacion → servido → pagado`. El estado `listo_para_servir` ya
está en `mesas-web` (mergeado) y en `mesas-api` sólo en la rama
`wo/agregar-estado-listo-para-servir-a-la-maquina-de-d3cdf8e1`, sin mergear a
`main`.
**Why importa:** Es exactamente el costo que anticipa el comentario de las
copias del contrato: un estado nuevo hay que agregarlo en tres lados y nada
avisa si falta uno. Con la API de `main`, el botón "Listo para servir" del
panel recibe 409 y el cliente nunca ve ese estado.
**Where:** `mesas-shared/src/estados.js`, `mesas-api/src/estados.js`,
`estados.js` de este repo.
**Learned:** 2026-09-03. Para probar el flujo completo hubo que levantar la API
desde esa rama. A resolver mergeando la rama de `mesas-api` y actualizando
`mesas-shared`.
