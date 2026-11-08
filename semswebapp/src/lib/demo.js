// Datos de ejemplo del modo demo (VITE_DEMO_MODE=true).
//
// Permiten ver y revisar toda la interfaz sin levantar el backend, que es como
// se trabaja la mayor parte del tiempo. Cuando DEMO_MODE es false ningun
// servicio los toca.

export const demoUser = {
  id: "u-001",
  email: "demo@energix.pe",
  fullName: "Alexis Encalada",
  role: "STAFF",
};

// Equipos de un establecimiento comercial, no de una vivienda: el segmento
// del producto son locales de 200 a 2.000 m2 con cargo por potencia.
// Cada equipo demo lleva su local y, salvo el ultimo, su zona: el dominio
// exige el local y deja la zona opcional, y los filtros de la vista de
// dispositivos se apoyan en ambos.
export const demoDevices = [
  { deviceId: "d-01", externalDeviceCode: "COLD-001", userId: "u-001", siteId: "site-demo-01", zoneId: "zone-demo-02", deviceName: "Cámara de frío 1", deviceType: "COLD_ROOM", brand: "Bohn", model: "MGM-040", connectionProtocol: "WIFI", status: "ACTIVE", registeredAt: "2026-06-01T10:00:00Z", updatedAt: "2026-06-01T10:00:00Z" },
  { deviceId: "d-02", externalDeviceCode: "COLD-002", userId: "u-001", siteId: "site-demo-01", zoneId: "zone-demo-02", deviceName: "Cámara de frío 2", deviceType: "COLD_ROOM", brand: "Bohn", model: "MGM-040", connectionProtocol: "WIFI", status: "ACTIVE", registeredAt: "2026-06-01T10:05:00Z", updatedAt: "2026-06-01T10:05:00Z" },
  { deviceId: "d-03", externalDeviceCode: "HVAC-003", userId: "u-001", siteId: "site-demo-01", zoneId: "zone-demo-01", deviceName: "Climatización — Sala de ventas", deviceType: "HVAC", brand: "Carrier", model: "38QUS", connectionProtocol: "WIFI", status: "ACTIVE", registeredAt: "2026-06-01T10:10:00Z", updatedAt: "2026-06-01T10:10:00Z" },
  { deviceId: "d-04", externalDeviceCode: "DISP-004", userId: "u-001", siteId: "site-demo-01", zoneId: "zone-demo-01", deviceName: "Exhibidores refrigerados", deviceType: "DISPLAY_FRIDGE", brand: "Metalfrio", model: "VN-50", connectionProtocol: "WIFI", status: "ACTIVE", registeredAt: "2026-06-01T10:15:00Z", updatedAt: "2026-06-01T10:15:00Z" },
  { deviceId: "d-05", externalDeviceCode: "LIGHT-005", userId: "u-001", siteId: "site-demo-01", zoneId: "zone-demo-01", deviceName: "Iluminación de sala", deviceType: "LIGHTING", brand: "Philips", model: "CoreLine", connectionProtocol: "BLUETOOTH", status: "ACTIVE", registeredAt: "2026-06-01T10:20:00Z", updatedAt: "2026-06-01T10:20:00Z" },
  { deviceId: "d-06", externalDeviceCode: "OVEN-006", userId: "u-001", siteId: "site-demo-02", deviceName: "Horno de panadería", deviceType: "OVEN", brand: "Nova", model: "Max2000", connectionProtocol: "WIFI", status: "MAINTENANCE", registeredAt: "2026-06-01T10:25:00Z", updatedAt: "2026-06-01T10:25:00Z" },
];

/**
 * Lecturas crudas, con la forma que devuelve el backend.
 *
 * El panel, el reporte y el monitoreo parten de aqui, asi que el modo demo
 * necesita estas y no solo el agregado por dia: sin ellas el panel se queda
 * en cero y muestra error de conexion.
 *
 * Reparte los 2.480 kWh mensuales del local de Miraflores entre los seis
 * equipos segun demoConsumption, con dos lecturas al dia por equipo: una
 * fuera de punta y otra dentro, valorizadas a los precios de MT2.
 */
export function demoRawReadings(days = 30) {
  const PRECIO_PUNTA = 0.281;
  const PRECIO_FUERA = 0.2395;
  // kWh al dia por equipo: 2.480 kWh / 30 dias repartidos por su porcentaje.
  const porEquipo = demoConsumption.map((c) => ({
    deviceId: c.deviceId,
    kwhDia: +((2480 / 30) * (c.pct / 100)).toFixed(2),
  }));

  const out = [];
  const hoy = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    const fecha = d.toISOString().slice(0, 10);
    // Variacion diaria suave, igual para todos los equipos del dia.
    const factor = 1 + Math.sin(i / 2) * 0.11;
    for (const e of porEquipo) {
      // Un tercio del consumo cae en la ventana de punta (18:00-23:00).
      const punta = +(e.kwhDia * factor * 0.33).toFixed(3);
      const fuera = +(e.kwhDia * factor * 0.67).toFixed(3);
      out.push({
        timestamp: `${fecha}T10:30:00Z`,
        device_id: e.deviceId,
        energy_kwh: fuera,
        estimated_cost: +(fuera * PRECIO_FUERA).toFixed(3),
      });
      out.push({
        timestamp: `${fecha}T19:30:00Z`,
        device_id: e.deviceId,
        energy_kwh: punta,
        estimated_cost: +(punta * PRECIO_PUNTA).toFixed(3),
      });
    }
  }
  return out;
}

export function demoReadings(days = 14) {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Unos 83 kWh al dia: los 2.480 kWh mensuales del local de Miraflores
    // repartidos, valorizados a la tarifa media de MT2.
    const kwh = +(83 + Math.sin(i / 2) * 9 + Math.random() * 11).toFixed(1);
    out.push({
      date: d.toISOString().slice(0, 10),
      kwh,
      cost: +(kwh * 0.35).toFixed(2),
    });
  }
  return out;
}

// Reparto coherente con demoZoneConsumption: las camaras de frio pesan mas
// que nada, que es justo lo que dijeron las entrevistas del segmento.
export const demoConsumption = [
  { deviceId: "d-01", deviceName: "Cámara de frío 1", kwh: 744.0, cost: 260.4, pct: 30 },
  { deviceId: "d-02", deviceName: "Cámara de frío 2", kwh: 620.0, cost: 217.0, pct: 25 },
  { deviceId: "d-03", deviceName: "Climatización — Sala de ventas", kwh: 496.0, cost: 173.6, pct: 20 },
  { deviceId: "d-04", deviceName: "Exhibidores refrigerados", kwh: 322.4, cost: 112.8, pct: 13 },
  { deviceId: "d-05", deviceName: "Iluminación de sala", kwh: 198.4, cost: 69.4, pct: 8 },
  { deviceId: "d-06", deviceName: "Horno de panadería", kwh: 99.2, cost: 34.7, pct: 4 },
];

export const demoMeters = [
  { meterId: "m-01", name: "Medidor principal EOS", active: true, lastReadingKwh: 1842.6 },
];

// Los tres hallazgos que produce el motor del backend: concentracion por
// zona, desplazamiento de hora punta y pico de demanda. Los textos imitan a
// los reales para que el modo demo muestre el producto comercial, no el
// residencial del que partio la plantilla.
export const demoRecommendations = [
  { id: "r-01", title: "Escalona el arranque tras un corte", detail: "La demanda máxima del local llegó al 89% de los 95 kW contratados. Arrancar las cámaras de frío y la climatización con 10 minutos de diferencia evita que el pico fije el cargo del mes.", estimatedSaving: 262.8, applied: false },
  { id: "r-02", title: "Revisa las cámaras de frío", detail: "Esa zona concentra el 55% del consumo del local. Es la primera donde conviene revisar sellos, deshielo y temperatura de consigna.", estimatedSaving: 118.4, applied: false },
  { id: "r-03", title: "Desplaza carga fuera de hora punta", detail: "El 31% del consumo cae entre las 18:00 y las 23:00, que se factura a S/ 0.2810 el kWh frente a S/ 0.2395 fuera de punta.", estimatedSaving: 74.6, applied: true },
];

export const demoAnomalies = [
  { id: "a-01", deviceName: "Cámaras de frío", description: "Consumo diario 42% por encima de su promedio de los últimos 30 días.", severity: "HIGH", detectedAt: "Ayer, cierre del día", resolved: false },
  { id: "a-02", deviceName: "Climatización — Sala de ventas", description: "Encendida durante 5 h fuera del horario de atención del local.", severity: "MEDIUM", detectedAt: "Mar, 02:40", resolved: false },
  { id: "a-03", deviceName: "Medidor principal", description: "Pico de 88 kW, el más alto del periodo.", severity: "LOW", detectedAt: "Lun, 11:05", resolved: true },
];

// Coherente con demoZoneConsumption: 2.480 kWh en 30 dias en el local de
// Miraflores, tarifa MT2, con cargo por potencia sobre 95 kW contratados.
export const demoBillPrediction = {
  projectedCost: 1246.8,
  projectedKwh: 2480,
  confidence: 0.86,
  closingDate: "fin de mes",
};

export const demoRankings = demoConsumption
  .slice(0, 5)
  .map((c, i) => ({ rank: i + 1, deviceName: c.deviceName, kwh: c.kwh, cost: c.cost }));

export const demoSummary = {
  currentMonthCost: 231.6,
  savingAmount: 86.4,
  savingPct: 21,
  projectedCost: 318.4,
  totalKwh: 297,
  activeDevices: demoDevices.filter((d) => d.status === "ACTIVE").length,
  unreadAlerts: demoAnomalies.filter((a) => !a.resolved).length,
};

// ---------- Organizacion, locales y zonas ----------
export const demoOrganization = {
  organizationId: "org-demo-01",
  legalName: "Comercial Los Andes S.A.C.",
  tradeName: "Market Los Andes",
  taxId: "20512345678",
  businessType: "SUPERMARKET",
  status: "ACTIVE",
};

export const demoSites = [
  {
    siteId: "site-demo-01", organizationId: "org-demo-01", siteCode: "LIM-001",
    name: "Miraflores", address: "Av. Larco 345", district: "Miraflores",
    floorAreaM2: 620, contractedPowerKw: 95, tariffCategory: "MT2",
    chargesForDemand: true, excludesSundaysFromPeak: false, status: "ACTIVE",
  },
  {
    siteId: "site-demo-02", organizationId: "org-demo-01", siteCode: "LIM-002",
    name: "San Isidro", address: "Av. Camino Real 1200", district: "San Isidro",
    floorAreaM2: 410, contractedPowerKw: 60, tariffCategory: "BT5B",
    chargesForDemand: false, excludesSundaysFromPeak: false, status: "ACTIVE",
  },
];

export const demoZones = [
  { zoneId: "zone-demo-01", siteId: "site-demo-01", name: "Sala de ventas", zoneType: "SALES_FLOOR", operatesOffHours: false, status: "ACTIVE" },
  { zoneId: "zone-demo-02", siteId: "site-demo-01", name: "Cámaras de frío", zoneType: "COLD_STORAGE", operatesOffHours: true, status: "ACTIVE" },
  { zoneId: "zone-demo-03", siteId: "site-demo-02", name: "Almacén", zoneType: "WAREHOUSE", operatesOffHours: false, status: "ACTIVE" },
];

// Reparto por zona del local de Miraflores (US26) y comparacion entre los dos
// locales (US39). Los numeros cuadran con demoZones y demoSites.
export const demoZoneConsumption = {
  siteId: "site-demo-01",
  siteName: "Miraflores",
  days: 30,
  totalKwh: 2480,
  currency: "PEN",
  zones: [
    { zoneId: "zone-demo-02", zoneName: "Cámaras de frío", zoneType: "COLD_STORAGE", meterCount: 2, kwh: 1364, sharePercent: 55, estimatedEnergyCost: 505.2 },
    { zoneId: "zone-demo-01", zoneName: "Sala de ventas", zoneType: "SALES_FLOOR", meterCount: 1, kwh: 868, sharePercent: 35, estimatedEnergyCost: 286.4 },
  ],
  unassigned: { zoneId: null, zoneName: null, zoneType: null, meterCount: 1, kwh: 248, sharePercent: 10, estimatedEnergyCost: 81.8 },
};

export const demoSiteComparison = {
  organizationId: "org-demo-01",
  days: 30,
  totalKwh: 3720,
  currency: "PEN",
  sites: [
    { siteId: "site-demo-01", siteCode: "LIM-001", siteName: "Miraflores", contractedPowerKw: 95, tariffCategory: "MT2", meterCount: 4, kwh: 2480, sharePercent: 66.7, estimatedEnergyCost: 873.4, kwhPerContractedKw: 26.1, peakDemandKw: 78.4 },
    { siteId: "site-demo-02", siteCode: "LIM-002", siteName: "San Isidro", contractedPowerKw: 60, tariffCategory: "BT5B", meterCount: 2, kwh: 1240, sharePercent: 33.3, estimatedEnergyCost: 441.9, kwhPerContractedKw: 20.7, peakDemandKw: 41.2 },
  ],
};

// Potencia que el local esta tomando ahora mismo (US24). La ocupacion sale de
// dividir entre la potencia contratada de demoSites: 71.3 de 95 kW.
export const demoCurrentConsumption = {
  siteId: "site-demo-01",
  siteName: "Miraflores",
  meterCount: 4,
  powerKw: 71.3,
  contractedPowerKw: 95,
  occupancyPercent: 75.1,
  measuredAt: new Date().toISOString(),
};

export const demoMembers = [
  { membershipId: "mem-01", userId: "u-01", email: "alexis@sems.pe", role: "ORG_ADMIN", siteId: null, status: "ACTIVE" },
  { membershipId: "mem-02", userId: "u-02", email: "valeria@sems.pe", role: "SUPERVISOR", siteId: "site-demo-01", status: "ACTIVE" },
  { membershipId: "mem-03", userId: "u-03", email: "jorge@sems.pe", role: "OPERATOR", siteId: null, status: "ACTIVE" },
];
