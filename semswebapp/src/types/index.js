/**
 * Tipos de dominio de SEMS, alineados con el backend.
 *
 * El enunciado pide JavaScript como lenguaje de programacion, asi que no hay
 * interfaces de TypeScript. Se documentan como `@typedef` de JSDoc: no existen
 * en tiempo de ejecucion, pero el editor sigue autocompletando y, sobre todo,
 * el contrato con el backend queda escrito en un solo sitio en vez de disperso
 * por las vistas.
 *
 * @module types
 */

// ----------------------------------------------------------------- identidad

/** @typedef {"HOMEOWNER" | "TENANT"} UserSegment Propietario de vivienda o estudiante/inquilino. */

/** @typedef {"ADMIN" | "RESIDENT" | "GUEST"} UserRole */

/**
 * @typedef {object} User
 * @property {string} id
 * @property {string} email
 * @property {string} fullName
 * @property {UserRole} role
 * @property {UserSegment} [segment]
 */

/**
 * @typedef {object} AuthResponse
 * @property {string} token
 * @property {User} user
 */

// --------------------------------------------------------------- dispositivos

/** @typedef {"ACTIVE" | "INACTIVE" | "MAINTENANCE"} DeviceStatus */

/**
 * @typedef {object} Device
 * @property {string} deviceId
 * @property {string} externalDeviceCode
 * @property {string} userId
 * @property {string} deviceName
 * @property {string} deviceType  p.ej. "meter", "AIR_CONDITIONER", "SENSOR"
 * @property {string} brand
 * @property {string} model
 * @property {string} connectionProtocol  "WIFI" | "BLUETOOTH"
 * @property {DeviceStatus} status
 * @property {string} [registeredAt]
 * @property {string} [updatedAt]
 */

/**
 * @typedef {object} CreateDevicePayload
 * @property {string} deviceName
 * @property {string} deviceType
 * @property {string} brand
 * @property {string} model
 * @property {string} connectionProtocol
 * @property {string} externalDeviceCode
 * @property {string} userId
 */

// -------------------------------------------------------------------- energia

/**
 * @typedef {object} EnergyReading
 * @property {string} date  YYYY-MM-DD
 * @property {number} kwh
 * @property {number} cost  en soles
 */

/**
 * @typedef {object} DeviceConsumption
 * @property {string} deviceId
 * @property {string} deviceName
 * @property {number} kwh
 * @property {number} cost
 * @property {number} pct  % del total
 */

/**
 * @typedef {object} EnergyMeter
 * @property {string} meterId
 * @property {string} name
 * @property {boolean} active
 * @property {number} lastReadingKwh
 */

// ------------------------------------------------------------------ analitica

/**
 * @typedef {object} Recommendation
 * @property {string} id
 * @property {string} title
 * @property {string} detail
 * @property {number} estimatedSaving  soles/mes
 * @property {boolean} applied
 */

/**
 * @typedef {object} Anomaly
 * @property {string} id
 * @property {string} deviceName
 * @property {string} description
 * @property {"LOW" | "MEDIUM" | "HIGH"} severity
 * @property {string} detectedAt
 * @property {boolean} resolved
 */

/**
 * @typedef {object} BillPrediction
 * @property {number} projectedCost  soles
 * @property {number} projectedKwh
 * @property {number} confidence  0..1
 * @property {string} closingDate
 */

/**
 * @typedef {object} ConsumptionRanking
 * @property {number} rank
 * @property {string} deviceName
 * @property {number} kwh
 * @property {number} cost
 */

/**
 * Resumen del dashboard. Se arma en el cliente juntando varios servicios.
 *
 * @typedef {object} DashboardSummary
 * @property {number} currentMonthCost
 * @property {number} savingAmount
 * @property {number} savingPct
 * @property {number} projectedCost
 * @property {number} totalKwh
 * @property {number} activeDevices
 * @property {number} unreadAlerts
 */

export {};
