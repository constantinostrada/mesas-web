// La API se puede apuntar con ?api=... para probar contra otro puerto sin tocar
// código. Sin eso, el localhost de siempre.
const API = new URL(location.href).searchParams.get("api") ?? "http://localhost:4000";

const $ = (id) => document.getElementById(id);
const pedido = new Map(); // plato_id -> cantidad

const money = (n) => n.toLocaleString("es-AR");

async function traer(ruta) {
  const r = await fetch(`${API}${ruta}`);
  if (!r.ok) throw new Error(`${ruta} respondió ${r.status}`);
  return r.json();
}

function pintarCarta(carta) {
  $("carta").innerHTML = carta
    .map(
      (p) => `
      <div class="tarjeta fila" data-plato="${p.id}">
        <div class="crece">
          <div class="plato">${p.nombre}</div>
          <div class="precio">$${money(p.precio)}</div>
        </div>
        <button data-op="-" aria-label="Quitar uno de ${p.nombre}">–</button>
        <span class="cant" data-cant>0</span>
        <button data-op="+" aria-label="Agregar uno de ${p.nombre}">+</button>
      </div>`,
    )
    .join("");

  $("carta").addEventListener("click", (e) => {
    const boton = e.target.closest("button[data-op]");
    if (!boton) return;
    const fila = boton.closest("[data-plato]");
    const id = fila.dataset.plato;
    const actual = pedido.get(id) ?? 0;
    const siguiente = boton.dataset.op === "+" ? actual + 1 : Math.max(0, actual - 1);
    if (siguiente === 0) pedido.delete(id);
    else pedido.set(id, siguiente);
    fila.querySelector("[data-cant]").textContent = siguiente;
    recalcular(carta);
  });
}

function recalcular(carta) {
  let total = 0;
  for (const [id, cant] of pedido) {
    const plato = carta.find((p) => p.id === id);
    if (plato) total += plato.precio * cant;
  }
  $("total").textContent = money(total);
  $("enviar").disabled = pedido.size === 0;
}

async function main() {
  try {
    const [{ mesas }, { carta }] = await Promise.all([traer("/mesas"), traer("/carta")]);
    $("mesa").innerHTML = mesas
      .map((m) => `<option value="${m.id}">Mesa ${m.numero} · ${m.capacidad} personas</option>`)
      .join("");
    pintarCarta(carta);

    $("enviar").addEventListener("click", async () => {
      $("enviar").disabled = true;
      const items = [...pedido].map(([id, cantidad]) => {
        const plato = carta.find((p) => p.id === id);
        return { plato_id: id, nombre: plato.nombre, cantidad, precio_unitario: plato.precio };
      });
      try {
        const r = await fetch(`${API}/pedidos`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mesa_id: $("mesa").value, items }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
        // Decir a QUÉ mozo fue: el cliente quiere saber quién lo va a atender,
        // y un "pedido enviado" a secas no le dice si pasó algo de verdad.
        const mozo = data.pedido.mozo_id ? `Te atiende ${data.pedido.mozo_id}.` : "Sin mozo asignado todavía.";
        $("msg").className = "aviso";
        $("msg").textContent = `Pedido ${data.pedido.id} enviado. ${mozo}`;
        pedido.clear();
        document.querySelectorAll("[data-cant]").forEach((e) => (e.textContent = "0"));
        recalcular(carta);
      } catch (err) {
        $("msg").className = "aviso error";
        $("msg").textContent = `No se pudo enviar: ${err.message}`;
        $("enviar").disabled = false;
      }
    });
  } catch (err) {
    $("msg").className = "aviso error";
    $("msg").textContent = `No se pudo hablar con la API (${API}). ¿Está corriendo? — ${err.message}`;
  }
}

main();
