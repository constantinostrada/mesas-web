import { ETIQUETAS, esCerrado } from "./estados.js";

// La API se puede apuntar con ?api=... para probar contra otro puerto sin tocar
// código. Sin eso, el localhost de siempre.
const API = new URL(location.href).searchParams.get("api") ?? "http://localhost:4000";

const $ = (id) => document.getElementById(id);
const pedido = new Map(); // plato_id -> cantidad

const money = (n) => n.toLocaleString("es-AR");
const total = (p) => p.items.reduce((t, i) => t + i.precio_unitario * i.cantidad, 0);

// Los ids de los pedidos que hizo ESTE navegador, por mesa. Sin esto, recargar
// o bloquear el celular perdía toda referencia a lo pedido: la API no tiene
// noción de "cliente" y no hay con qué volver a encontrarlos.
const CLAVE_PEDIDOS = "mesas-web:pedidos";
// La mesa elegida también se guarda: si al reabrir el navegador el select
// volviera a la primera mesa, el cliente no vería sus pedidos aunque estén.
const CLAVE_MESA = "mesas-web:mesa";

// localStorage puede fallar (modo privado en iOS, cuota llena). Que el cliente
// no pueda pedir porque no se pudo guardar un id sería mucho peor que perder la
// lista al recargar, así que todo acceso es tolerante.
function leerGuardados() {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE_PEDIDOS) ?? "{}");
    return crudo && typeof crudo === "object" ? crudo : {};
  } catch {
    return {};
  }
}

function guardar(porMesa) {
  try {
    localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(porMesa));
  } catch {
    /* sin persistencia: la sesión sigue funcionando igual */
  }
}

function recordarPedido(mesa_id, id) {
  const porMesa = leerGuardados();
  const ids = porMesa[mesa_id] ?? [];
  if (!ids.includes(id)) porMesa[mesa_id] = [...ids, id];
  guardar(porMesa);
}

function idsDeMesa(mesa_id) {
  return leerGuardados()[mesa_id] ?? [];
}

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

// El último estado conocido de cada pedido, por id. Si un ciclo del poll falla,
// se repinta desde acá en vez de vaciar la pantalla o taparla con un error.
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
  return `
    <div class="tarjeta${cerrado ? " cerrado" : ""}${listo ? " listo" : ""}">
      <div class="fila">
        <div class="crece"><strong>Pedido ${p.id}</strong></div>
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
  const mios = idsDeMesa(mesa_id)
    .map((id) => conocidos.get(id))
    .filter(Boolean);

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

// La API no filtra pedidos por mesa (`GET /pedidos` sólo acepta ?mozo_id=), así
// que se traen todos y se cruzan con los ids guardados. Con un salón chico
// alcanza; el día que no, el filtro tiene que ir a la API.
async function refrescarPedidos(mesa_id, nombreMozo) {
  const { pedidos } = await traer("/pedidos");
  for (const p of pedidos) conocidos.set(p.id, p);

  if (!purgadas.has(mesa_id)) {
    purgadas.add(mesa_id);
    purgarViejos(mesa_id, new Set(pedidos.map((p) => p.id)));
  }

  pintarMisPedidos(mesa_id, nombreMozo);
}

// Se olvidan los ids que ya no tienen para qué volver: los que la API no
// conoce (su store es en memoria, un reinicio los borra y quedarían colgados
// para siempre) y los pagados, que son una visita terminada.
//
// Corre UNA vez por mesa, al primer ciclo, y no en cada poll: si purgara
// siempre, el pedido que el mozo acaba de marcar pagado se borraría de la
// pantalla en el segundo siguiente, delante del cliente que lo está mirando.
// Cerrado se ve abajo y atenuado hasta la próxima vez que abra la pantalla.
const purgadas = new Set();

function purgarViejos(mesa_id, vivos) {
  const porMesa = leerGuardados();
  const ids = porMesa[mesa_id] ?? [];
  const quedan = ids.filter((id) => vivos.has(id) && conocidos.get(id).estado !== "pagado");
  if (quedan.length === ids.length) return;
  porMesa[mesa_id] = quedan;
  guardar(porMesa);
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

    // Un solo ciclo a la vez: con la API lenta, dos poll solapados pueden
    // repintar en orden invertido y mostrar un estado viejo.
    let enVuelo = false;
    const ciclo = async () => {
      if (enVuelo) return;
      enVuelo = true;
      try {
        await refrescarPedidos($("mesa").value, nombreMozo);
        $("conexion").textContent = "";
      } catch {
        // Se mantiene lo último conocido y se avisa al margen. Un error que
        // tape la lista deja al cliente peor que un dato de hace unos segundos.
        $("conexion").textContent = "sin conexión";
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
        recordarPedido(mesa_id, data.pedido.id);
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
