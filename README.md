# mesas-web

Las dos pantallas del salón, en HTML plano: la del **cliente**, que pide desde
la mesa, y la del **mozo**, que ve lo suyo y mueve los pedidos.

Sin build ni dependencias. Se abre con cualquier servidor estático:

```bash
python3 -m http.server 5173      # y abrir http://localhost:5173
```

Necesita `mesas-api` corriendo en `localhost:4000` (configurable con
`?api=` en la URL).

## Pantallas

- `index.html` — el cliente elige mesa, arma el pedido y sigue su estado
- `panel.html` — el mozo ve sus pedidos y cambia el estado

Las dos refrescan solas cada 4s (poll, sin websockets) y comparten el
vocabulario de estados en `estados.js`. La del cliente guarda los ids de sus
pedidos en `localStorage` para no perderlos al recargar.

Mobile-first: el cliente pide desde el teléfono, sentado. Las acciones van
abajo, al alcance del pulgar.
