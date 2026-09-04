import { TRANSICIONES, ETIQUETAS } from "./estados.js";
const API = new URL(location.href).searchParams.get("api") ?? "http://localhost:4000";
const $ = (id) => document.getElementById(id);
const money = (n) => n.toLocaleString("es-AR");

const total = (p) => p.items.reduce((t, i) => t + i.precio_unitario * i.cantidad, 0);

async function traer(ruta) {
  const r = await fetch(`${API}${ruta}`);
  if (!r.ok) throw new Error(`${ruta} respondió ${r.status}`);
  return r.json();
}

// La acción que el mozo va a querer tocar en cada estado. Se resalta una sola
// por tarjeta: si todos los botones pesan igual, ninguno guía.
const ACCION_PRINCIPAL = {
  pedido: "en_preparacion",
  en_preparacion: "listo_para_servir",
  listo_para_servir: "servido",
  servido: "pagado",
};

function pintar(todos, mesas) {
  // Un pedido cancelado ya no es trabajo del mozo, así que sale de la pantalla
  // en el primer poll posterior a la cancelación, sin que tenga que recargar.
  // Se filtra acá y no en `GET /pedidos` porque la pantalla del cliente sí
  // tiene que mostrarlo: es cómo se entera de que su plato no viene.
  const pedidos = todos.filter((p) => p.estado !== "cancelado");
  if (pedidos.length === 0) {
    $("pedidos").innerHTML = `<p class="aviso">Todavía no hay pedidos para este mozo.</p>`;
    return;
  }
  const numero = (mesa_id) => mesas.find((m) => m.id === mesa_id)?.numero ?? "?";
  $("pedidos").innerHTML = pedidos
    .map((p) => {
      // El plato ya está en la cocina esperando: es el único estado que el mozo
      // tiene que cazar de un vistazo, porque es el único que le pide caminar.
      const listo = p.estado === "listo_para_servir";
      // Sólo los botones de las transiciones LEGALES. Mostrar todos y que la
      // API rechace convierte una regla del dominio en un error del usuario.
      const acciones = (TRANSICIONES[p.estado] ?? [])
        .map((e) => {
          const clase = e === ACCION_PRINCIPAL[p.estado] ? ' class="primario"' : "";
          // El botón dice lo que hace, no a qué estado lleva: "Cancelar", no
          // "Cancelado". Los demás coinciden con su etiqueta y no hace falta.
          const rotulo = e === "cancelado" ? "Cancelar" : ETIQUETAS[e];
          return `<button${clase} data-id="${p.id}" data-a="${e}">${rotulo}</button>`;
        })
        .join(" ");
      const items = p.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ");
      // La campana además del color: el panel se mira de reojo y con la pantalla
      // al sol, donde el verde y el gris se parecen más de lo que uno cree.
      const etiqueta = listo ? `🔔 ${ETIQUETAS[p.estado]}` : ETIQUETAS[p.estado];
      return `
        <div class="tarjeta${listo ? " listo" : ""}">
          <div class="fila">
            <div class="crece"><strong>Mesa ${numero(p.mesa_id)}</strong> · ${p.id}</div>
            <span class="estado${listo ? " listo" : ""}">${etiqueta}</span>
          </div>
          <div class="sub" style="margin:6px 0">${items}</div>
          <div class="fila">
            <span class="precio crece">$${money(total(p))}</span>
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
      const b = e.target.closest("button[data-a]");
      if (!b) return;
      const destino = b.dataset.a;
      // Cancelar va por su propio endpoint y sin destino: no es un cambio de
      // estado más, es dar el pedido de baja.
      const accion = destino === "cancelado" ? "cancelar" : "estado";
      b.disabled = true;
      try {
        const r = await fetch(`${API}/pedidos/${b.dataset.id}/${accion}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          // Quién toca el botón es quien está mirando el panel: el mozo del
          // selector. La API lo exige para poder decir después quién cambió
          // el estado y cuándo.
          body: JSON.stringify(
            destino === "cancelado" ? {} : { estado: destino, mozo_id: $("mozo").value },
          ),
        });
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
