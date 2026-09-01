const API = new URL(location.href).searchParams.get("api") ?? "http://localhost:4000";
const $ = (id) => document.getElementById(id);
const money = (n) => n.toLocaleString("es-AR");

// Copia del contrato de mesas-shared, igual que en la API. Duplicada hasta que
// ese repo se publique como paquete: hoy un estado nuevo hay que agregarlo en
// los tres lados y nada avisa si falta uno.
const TRANSICIONES = {
  pedido: ["en_preparacion", "cancelado"],
  en_preparacion: ["servido", "cancelado"],
  servido: ["pagado"],
  pagado: [],
  cancelado: [],
};
const ETIQUETAS = {
  pedido: "Pedido",
  en_preparacion: "En preparación",
  servido: "Servido",
  pagado: "Pagado",
  cancelado: "Cancelado",
};

/** Mientras el pedido siga en cocina, o sea antes de `servido`. */
const puedeCancelarse = (estado) => (TRANSICIONES[estado] ?? []).includes("cancelado");

const total = (p) => p.items.reduce((t, i) => t + i.precio_unitario * i.cantidad, 0);

async function traer(ruta) {
  const r = await fetch(`${API}${ruta}`);
  if (!r.ok) throw new Error(`${ruta} respondió ${r.status}`);
  return r.json();
}

function pintar(todos, mesas) {
  // Un pedido cancelado no es trabajo del mozo: sacarlo de la pantalla es el
  // punto de poder cancelar. El filtro va acá y no en GET /pedidos porque ese
  // endpoint es genérico — la cocina o el cliente sí van a querer verlos.
  const pedidos = todos.filter((p) => p.estado !== "cancelado");
  if (pedidos.length === 0) {
    $("pedidos").innerHTML = `<p class="aviso">Todavía no hay pedidos para este mozo.</p>`;
    return;
  }
  const numero = (mesa_id) => mesas.find((m) => m.id === mesa_id)?.numero ?? "?";
  $("pedidos").innerHTML = pedidos
    .map((p) => {
      // Sólo los botones de las transiciones LEGALES. Mostrar todos y que la
      // API rechace convierte una regla del dominio en un error del usuario.
      const acciones = (TRANSICIONES[p.estado] ?? [])
        .filter((e) => e !== "cancelado") // cancelar tiene su propio botón y su propia ruta
        .map((e) => `<button data-id="${p.id}" data-a="${e}">${ETIQUETAS[e]}</button>`)
        .join(" ");
      const cancelar = puedeCancelarse(p.estado)
        ? `<button data-id="${p.id}" data-cancelar>Cancelar</button>`
        : "";
      const items = p.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ");
      return `
        <div class="tarjeta">
          <div class="fila">
            <div class="crece"><strong>Mesa ${numero(p.mesa_id)}</strong> · ${p.id}</div>
            <span class="estado">${ETIQUETAS[p.estado]}</span>
          </div>
          <div class="sub" style="margin:6px 0">${items}</div>
          <div class="fila">
            <span class="precio crece">$${money(total(p))}</span>
            ${cancelar}
            ${acciones}
          </div>
        </div>`;
    })
    .join("");
}

async function refrescar() {
  const mozo_id = $("mozo").value;
  const [{ pedidos }, { mesas }] = await Promise.all([
    traer(`/pedidos?mozo_id=${encodeURIComponent(mozo_id)}`),
    traer("/mesas"),
  ]);
  pintar(pedidos, mesas);
}

async function main() {
  try {
    const { mozos } = await traer("/mozos");
    $("mozo").innerHTML = mozos
      .map((m) => `<option value="${m.id}">${m.nombre}${m.activo ? "" : " (inactivo)"}</option>`)
      .join("");
    $("mozo").addEventListener("change", refrescar);

    $("pedidos").addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-a], button[data-cancelar]");
      if (!b) return;
      b.disabled = true;
      const esCancelar = b.hasAttribute("data-cancelar");
      try {
        const r = await fetch(
          `${API}/pedidos/${b.dataset.id}/${esCancelar ? "cancelar" : "estado"}`,
          esCancelar
            ? { method: "POST" }
            : {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ estado: b.dataset.a }),
              },
        );
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
        await refrescar();
      } catch (err) {
        $("msg").className = "aviso error";
        $("msg").textContent = err.message;
        b.disabled = false;
      }
    });

    await refrescar();
    // Sin websockets: el mozo necesita ver los pedidos nuevos sin recargar, y
    // un poll cada 4s es suficiente para un salón.
    setInterval(() => refrescar().catch(() => {}), 4000);
  } catch (err) {
    $("msg").className = "aviso error";
    $("msg").textContent = `No se pudo hablar con la API (${API}). ¿Está corriendo? — ${err.message}`;
  }
}

main();
