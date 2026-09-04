import { ETIQUETAS, esCerrado } from "./estados.js";
import { crearAvisoDeConexion } from "./conexion.js";

// La API se puede apuntar con ?api=... para probar contra otro puerto sin tocar
// código. Sin eso, el localhost de siempre.
const API = new URL(location.href).searchParams.get("api") ?? "http://localhost:4000";

const $ = (id) => document.getElementById(id);
const pedido = new Map(); // plato_id -> cantidad

const money = (n) => n.toLocaleString("es-AR");
const total = (p) => p.items.reduce((t, i) => t + i.precio_unitario * i.cantidad, 0);
// 24h explícito: es-AR devuelve "11:53 a. m." según el navegador, y nadie
// mira la hora de un pedido en formato de 12 horas.
const hora = (ms) =>
  new Date(ms).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

// La mesa elegida se guarda: es lo único que hace falta recordar para que al
// reabrir el navegador el cliente siga viendo sus pedidos. Quién pidió qué lo
// sabe la API por mesa, así que no hay nada más que persistir acá.
const CLAVE_MESA = "mesas-web:mesa";

// localStorage puede fallar (modo privado en iOS, cuota llena). Que el cliente
// no pueda pedir porque no se pudo guardar la mesa sería mucho peor que volver
// a elegirla al recargar, así que el acceso es tolerante.
function leerMesa() {
  try {
    return localStorage.getItem(CLAVE_MESA);
  } catch {
    return null;
  }
}

function guardarMesa(mesa_id) {
  try {
    localStorage.setItem(CLAVE_MESA, mesa_id);
  } catch {
    /* sin persistencia: la sesión sigue funcionando igual */
  }
}

// El último estado conocido de cada pedido, por id. Se acumula y nunca se
// borra, y eso hace dos cosas: si un ciclo del poll falla se repinta desde acá
// en vez de vaciar la pantalla, y el pedido que se acaba de enviar no puede
// desaparecer porque llegue tarde la respuesta de un poll anterior a él.
const conocidos = new Map();

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

function tarjetaPedido(p, nombreMozo) {
  const listo = p.estado === "listo_para_servir";
  const cerrado = esCerrado(p.estado);
  const items = p.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ");
  // Los dos estados que le cambian algo al cliente: "listo" le dice que su
  // plato ya salió, "cancelado" que deje de esperarlo.
  const clase = listo ? " listo" : p.estado === "cancelado" ? " cancelado" : "";
  // A quién preguntarle si algo no cierra. Antes esto se decía una sola vez en
  // el mensaje de "enviado" y se perdía en la recarga siguiente.
  const mozo = p.mozo_id ? `Te atiende ${nombreMozo(p.mozo_id)}` : "Sin mozo asignado todavía";
  // La hora va junto al id: es lo que le deja al cliente distinguir un pedido
  // de otro y medir cuánto lleva esperando; el id sólo sirve para nombrárselo
  // al mozo.
  return `
    <div class="tarjeta${cerrado ? " cerrado" : ""}${listo ? " listo" : ""}">
      <div class="fila">
        <div class="crece">
          <strong>Pedido ${p.id}</strong>
          <span class="nota">${hora(p.creado_en)}</span>
        </div>
        <span class="estado${clase}">${ETIQUETAS[p.estado] ?? p.estado}</span>
      </div>
      <div class="sub" style="margin:6px 0">${items}</div>
      <div class="fila">
        <span class="precio crece">$${money(total(p))}</span>
        <span class="nota">${mozo}</span>
      </div>
    </div>`;
}

function pintarMisPedidos(mesa_id, nombreMozo) {
  // Se pinta desde `conocidos`, no desde la última respuesta: así un ciclo
  // fallido no borra nada de la pantalla.
  const mios = [...conocidos.values()].filter((p) => p.mesa_id === mesa_id);

  $("mis-pedidos").hidden = mios.length === 0;
  if (mios.length === 0) {
    $("activos").innerHTML = "";
    $("cerrados").innerHTML = "";
    return;
  }

  // Más nuevos arriba, como el panel. Y los cerrados abajo: un pedido servido o
  // pagado ya no es lo que el cliente está esperando, pero tampoco puede
  // desaparecer de golpe mientras lo está mirando.
  const orden = (a, b) => b.creado_en - a.creado_en;
  const activos = mios.filter((p) => !esCerrado(p.estado)).sort(orden);
  const cerrados = mios.filter((p) => esCerrado(p.estado)).sort(orden);

  $("activos").innerHTML = activos.map((p) => tarjetaPedido(p, nombreMozo)).join("");
  $("cerrados").innerHTML = cerrados.length
    ? `<p class="sub subtitulo">Ya cerrados</p>${cerrados.map((p) => tarjetaPedido(p, nombreMozo)).join("")}`
    : "";
}

// Los pedidos de LA MESA, no los de este navegador: si dos personas sentadas
// juntas piden cada una desde su teléfono, las dos tienen que ver lo que va a
// llegar a la mesa. Y como la mesa alcanza para encontrarlos, recargar la
// página no pierde nada.
async function refrescarPedidos(mesa_id, nombreMozo) {
  const { pedidos } = await traer(`/pedidos?mesa_id=${encodeURIComponent(mesa_id)}`);
  for (const p of pedidos) conocidos.set(p.id, p);
  pintarMisPedidos(mesa_id, nombreMozo);
}

async function main() {
  try {
    const [{ mesas }, { carta }, { mozos }] = await Promise.all([
      traer("/mesas"),
      traer("/carta"),
      traer("/mozos"),
    ]);
    // El id del mozo no le dice nada a nadie: el cliente quiere el nombre.
    const nombreMozo = (id) => mozos.find((m) => m.id === id)?.nombre ?? id;

    $("mesa").innerHTML = mesas
      .map((m) => `<option value="${m.id}">Mesa ${m.numero} · ${m.capacidad} personas</option>`)
      .join("");
    const guardada = leerMesa();
    if (guardada && mesas.some((m) => m.id === guardada)) $("mesa").value = guardada;

    pintarCarta(carta);

    // Mismo aviso y mismo texto que el panel del mozo: que lo esté mirando el
    // cliente o el mozo no cambia lo que pasó ni cómo se cuenta. La carga que
    // se acaba de hacer cuenta como la primera actualización buena —sus tres
    // rutas respondieron—, así que si la API se cae antes del primer ciclo del
    // poll el aviso igual tiene desde cuándo contar.
    const conexion = crearAvisoDeConexion($("conexion"), Date.now());

    // Un solo ciclo a la vez: con la API lenta, dos poll solapados pueden
    // repintar en orden invertido y mostrar un estado viejo.
    let enVuelo = false;
    const ciclo = async () => {
      if (enVuelo) return;
      enVuelo = true;
      try {
        await refrescarPedidos($("mesa").value, nombreMozo);
        conexion.exito();
      } catch {
        // Se mantiene lo último conocido y se avisa al margen. Un error que
        // tape la lista deja al cliente peor que un dato de hace unos segundos.
        // El aviso recién sale a los 3 ciclos fallidos: un fallo suelto es
        // ruido de red y hacerlo parpadear sería peor que no decir nada.
        conexion.fallo();
      } finally {
        enVuelo = false;
      }
    };

    $("mesa").addEventListener("change", () => {
      guardarMesa($("mesa").value);
      pintarMisPedidos($("mesa").value, nombreMozo);
      ciclo();
    });

    $("enviar").addEventListener("click", async () => {
      $("enviar").disabled = true;
      const items = [...pedido].map(([id, cantidad]) => {
        const plato = carta.find((p) => p.id === id);
        return { plato_id: id, nombre: plato.nombre, cantidad, precio_unitario: plato.precio };
      });
      const mesa_id = $("mesa").value;
      try {
        const r = await fetch(`${API}/pedidos`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mesa_id, items }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
        // Se muestra con la respuesta del POST y no esperando el próximo poll:
        // cuatro segundos sin ver el pedido que acabás de mandar se sienten
        // como que no salió.
        conocidos.set(data.pedido.id, data.pedido);
        // Sin mensaje de "enviado": el pedido aparece en la lista de arriba con
        // su estado, que es más de lo que decía el aviso y no se pierde.
        $("msg").className = "aviso";
        $("msg").textContent = "";
        pintarMisPedidos(mesa_id, nombreMozo);
        pedido.clear();
        document.querySelectorAll("[data-cant]").forEach((e) => (e.textContent = "0"));
        recalcular(carta);
      } catch (err) {
        $("msg").className = "aviso error";
        $("msg").textContent = `No se pudo enviar: ${err.message}`;
        $("enviar").disabled = false;
      }
    });

    // Mismo intervalo que el panel del mozo: sin websockets, 4s alcanzan para
    // que el cliente vea el cambio antes de preguntarse si pasó algo.
    await ciclo();
    setInterval(ciclo, 4000);
  } catch (err) {
    $("msg").className = "aviso error";
    $("msg").textContent = `No se pudo hablar con la API (${API}). ¿Está corriendo? — ${err.message}`;
  }
}

main();
