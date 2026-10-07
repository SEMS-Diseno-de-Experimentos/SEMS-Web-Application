// Perfil del hogar y metas de consumo. Se guardan localmente por usuario
// (el backend aun no expone estos datos; migrarlo despues es directo).

/**
 * @typedef {object} HomeProfile
 * @property {string} housingType  "HOUSE" | "APARTMENT" | "ROOM"
 * @property {number} rooms
 * @property {string} location
 */

/**
 * @typedef {object} Goals
 * @property {number} monthlyKwh
 * @property {Record<string, number>} perDevice  deviceId -> meta kWh
 */

const profileKey = (userId) => `sems-home-${userId}`;
const goalsKey = (userId) => `sems-goals-${userId}`;

/** @returns {HomeProfile} */
export function getHomeProfile(userId) {
  try {
    const raw = localStorage.getItem(profileKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {
    /* dato corrupto: caemos al perfil por defecto */
  }
  return { housingType: "HOUSE", rooms: 3, location: "" };
}

export function saveHomeProfile(userId, p) {
  localStorage.setItem(profileKey(userId), JSON.stringify(p));
}

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
  localStorage.setItem(goalsKey(userId), JSON.stringify(g));
}
