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
  { id: "cold_room", name: "Cámara de frío", watts: 3000 },
  { id: "display_fridge", name: "Exhibidor refrigerado", watts: 800 },
  { id: "island_freezer", name: "Congelador de isla", watts: 600 },
  { id: "hvac_package", name: "Climatización central", watts: 7000 },
  { id: "hvac_split", name: "Split 24.000 BTU", watts: 2200 },
  { id: "oven", name: "Horno eléctrico", watts: 4000 },
  { id: "compressor", name: "Compresor", watts: 2500 },
  { id: "extractor", name: "Extractor / ventilación", watts: 750 },
  { id: "lighting_floor", name: "Iluminación de sala (circuito)", watts: 1500 },
  { id: "pos", name: "Caja / POS", watts: 150 },
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
