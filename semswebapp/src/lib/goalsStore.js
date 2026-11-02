// Metas de consumo del usuario, por mes y por dispositivo.
//
// Siguen guardandose en el navegador porque el backend todavia no las expone, y
// por eso no viajan entre equipos. El resto del perfil que vivia aqui —tipo de
// establecimiento, numero de zonas, ubicacion— se retiro: eran copias locales
// de datos que ya existen en la organizacion y en el local, y al divergir
// dejaban al usuario con dos verdades sobre lo mismo.

/**
 * @typedef {object} Goals
 * @property {number} monthlyKwh
 * @property {Record<string, number>} perDevice  deviceId -> meta kWh
 */

const goalsKey = (userId) => `sems-goals-${userId}`;

/** @returns {Goals} */
export function getGoals(userId) {
  try {
    const raw = localStorage.getItem(goalsKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {
    /* dato corrupto: caemos a metas vacias */
  }
  return { monthlyKwh: 0, perDevice: {} };
}

export function saveGoals(userId, g) {
  try {
    localStorage.setItem(goalsKey(userId), JSON.stringify(g));
  } catch {
    // En modo privado localStorage puede lanzar; la meta es una comodidad, no
    // un dato critico, asi que fallar en silencio es preferible a romper la
    // pantalla.
  }
}
