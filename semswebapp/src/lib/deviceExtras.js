// Datos extra del dispositivo (ubicacion y perfil de consumo) guardados
// localmente por dispositivo. El backend aun no expone estos campos.

/**
 * @typedef {object} ConsumptionProfile
 * @property {string} id
 * @property {string} name
 * @property {number} watts  potencia nominal de referencia
 */

/**
 * Perfiles de consumo predefinidos (RF-ANL-01): potencia nominal por modelo.
 * @type {ConsumptionProfile[]}
 */
export const CONSUMPTION_PROFILES = [
  { id: "none", name: "Sin perfil", watts: 0 },
  { id: "fridge_a", name: "Refrigeradora clase A", watts: 150 },
  { id: "fridge_std", name: "Refrigeradora estándar", watts: 350 },
  { id: "ac", name: "Aire acondicionado", watts: 1200 },
  { id: "water_heater", name: "Terma eléctrica", watts: 1500 },
  { id: "washer", name: "Lavadora", watts: 500 },
  { id: "microwave", name: "Microondas", watts: 1000 },
  { id: "tv", name: "Televisor LED", watts: 100 },
  { id: "computer", name: "Laptop / PC", watts: 120 },
  { id: "lighting", name: "Iluminación", watts: 60 },
];

/** @returns {ConsumptionProfile} */
export function profileById(id) {
  return CONSUMPTION_PROFILES.find((p) => p.id === id) ?? CONSUMPTION_PROFILES[0];
}

/**
 * @typedef {object} DeviceExtras
 * @property {string} location
 * @property {string} profileId
 */

const key = (deviceId) => `sems-devx-${deviceId}`;

/** @returns {DeviceExtras} */
export function getDeviceExtras(deviceId) {
  try {
    const raw = localStorage.getItem(key(deviceId));
    if (raw) return JSON.parse(raw);
  } catch {
    /* dato corrupto: caemos a los valores por defecto */
  }
  return { location: "", profileId: "none" };
}

export function saveDeviceExtras(deviceId, extras) {
  if (!deviceId) return;
  localStorage.setItem(key(deviceId), JSON.stringify(extras));
}
