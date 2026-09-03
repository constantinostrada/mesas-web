/**
 * El vocabulario de estados que muestran las dos pantallas.
 *
 * Copia del contrato de mesas-shared, igual que en la API. Duplicada entre
 * repos hasta que ese repo se publique como paquete — pero DENTRO de este repo
 * vive una sola vez: el panel y la pantalla del cliente tienen que decirle
 * "En preparación" a lo mismo, y con una tabla por pantalla eso se desincroniza
 * en cuanto alguien toca una sola.
 */
export const TRANSICIONES = {
  pedido: ["en_preparacion", "cancelado"],
  en_preparacion: ["listo_para_servir", "cancelado"],
  listo_para_servir: ["servido", "cancelado"],
  servido: ["pagado"],
  pagado: [],
  cancelado: [],
};

export const ETIQUETAS = {
  pedido: "Pedido",
  en_preparacion: "En preparación",
  listo_para_servir: "Listo para servir",
  servido: "Servido",
  pagado: "Pagado",
  cancelado: "Cancelado",
};

/**
 * Un pedido está cerrado cuando ya no hay nada que esperar: se sirvió, se pagó
 * o se canceló. Se deriva de las transiciones —un estado sin salida es final—
 * salvo "servido", que todavía puede pasar a "pagado" pero para el cliente ya
 * llegó a la mesa. Derivarlo evita que un estado nuevo quede fuera por olvido.
 */
export const esCerrado = (estado) =>
  estado === "servido" || (TRANSICIONES[estado] ?? []).length === 0;
