// El aviso de "los datos que estás mirando dejaron de actualizarse", compartido
// por las dos pantallas. Vive en un módulo y no copiado en cada una por lo
// mismo que `estados.js`: el texto y los umbrales tienen que ser idénticos para
// el cliente y para el mozo, y dos copias se desincronizan solas.

// Tres ciclos de poll (≈12s) antes de avisar. Un fallo aislado es ruido normal
// de red: avisar al primero haría parpadear el aviso todo el tiempo.
const FALLOS_PARA_AVISAR = 3;

// Redondeado y en lenguaje humano: nadie mide el corte en segundos exactos, y
// un número que cambia cada segundo se lee como ruido. De a 5 segundos alcanza
// para ver que el corte sigue creciendo.
function haceCuanto(ms) {
  const segundos = Math.round(ms / 5000) * 5;
  if (segundos < 60) return `hace ${Math.max(segundos, 5)} segundos`;
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return minutos === 1 ? "hace 1 minuto" : `hace ${minutos} minutos`;
  const horas = Math.round(minutos / 60);
  return horas === 1 ? "hace 1 hora" : `hace ${horas} horas`;
}

// `nodo` es la franja que el layout ya tiene reservada arriba de la lista: se
// llena y se vacía, nunca se crea ni se saca, así que el contenido de abajo no
// se mueve cuando el aviso aparece o desaparece.
//
// `ultimaBuena` arranca en null salvo que la pantalla ya venga de una carga
// buena y quiera contarla como referencia: sin eso, una API que se cae entre la
// carga inicial y el primer ciclo del poll deja la pantalla vacía y muda.
export function crearAvisoDeConexion(nodo, ultimaBuenaInicial = null) {
  // null mientras la pantalla no logró ninguna carga buena. Sin esa referencia
  // no hay "desde hace" que mostrar, así que el aviso no aparece y queda el
  // mensaje de error de carga inicial, que dice algo más útil.
  let ultimaBuena = ultimaBuenaInicial;
  let fallos = 0;
  let reloj = null;

  const escribir = () => {
    // El tiempo se cuenta desde la última actualización buena y no desde que
    // apareció el aviso: cuando aparece ya hubo ≈12s sin datos frescos y eso
    // es justo lo que el usuario necesita saber.
    const tiempo = haceCuanto(Date.now() - ultimaBuena);
    // El tramo que cambia va aparte y con aria-live="off": el lector de
    // pantalla anuncia el corte una vez, no el reloj cada 5 segundos.
    // `.detalle` se esconde en pantallas ultra-angostas (menos de 320px, como
    // la pantalla externa de un plegable): ahí la frase completa se iría a dos
    // líneas y la franja crecería, corriendo la lista de lugar.
    nodo.innerHTML =
      `<span class="error">Sin conexión</span> ` +
      `<span class="nota" aria-live="off">· <span class="detalle">sin actualizar </span>${tiempo}</span>`;
  };

  const ocultar = () => {
    clearInterval(reloj);
    reloj = null;
    nodo.textContent = "";
  };

  return {
    // Un ciclo en el que TODAS las llamadas respondieron bien.
    exito() {
      ultimaBuena = Date.now();
      fallos = 0;
      // Se va ante un único ciclo bueno, sin esperar confirmación: lento para
      // aparecer, rápido para irse.
      if (reloj !== null) ocultar();
    },
    // Un ciclo en el que falló al menos una llamada.
    fallo() {
      fallos += 1;
      if (fallos < FALLOS_PARA_AVISAR || ultimaBuena === null || reloj !== null) return;
      escribir();
      // Reloj propio: el tiempo sigue creciendo aunque la API no vuelva a
      // responder nunca, que es exactamente el caso en que hace falta.
      reloj = setInterval(escribir, 1000);
    },
  };
}
