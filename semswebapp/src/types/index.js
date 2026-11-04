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

/** @typedef {"RETAIL_CHAIN" | "INDEPENDENT"} UserSegment Los dos segmentos objetivo: cadena de retail o establecimiento independiente. */

/** @typedef {"ADMIN" | "STAFF"} UserRole Administrador de la plataforma o personal del establecimiento. */

/** @typedef {"SUPERMARKET"|"CONVENIENCE_STORE"|"DEPARTMENT_STORE"|"RESTAURANT"|"WAREHOUSE"|"OTHER"} BusinessType */

/** @typedef {"BT5B"|"BT3"|"BT4"|"MT2"|"MT3"} TariffCategory Pliego tarifario de OSINERGMIN. */

/** @typedef {"SALES_FLOOR"|"COLD_STORAGE"|"WAREHOUSE"|"KITCHEN"|"OFFICES"|"HVAC"|"PARKING"|"OTHER"} ZoneType */

/**
 * @typedef {object} Organization
 * @property {string} organizationId
 * @property {string} legalName  razon social
 * @property {string} tradeName  nombre comercial
 * @property {string} taxId      RUC
 * @property {BusinessType} businessType
 * @property {string} status
 */

/**
 * @typedef {object} Site
 * @property {string} siteId
 * @property {string} organizationId
 * @property {string} siteCode  codigo interno de la sede
 * @property {string} name
 * @property {string} address
 * @property {string} district
 * @property {number|null} floorAreaM2
 * @property {number} contractedPowerKw  potencia contratada
 * @property {TariffCategory} tariffCategory
 * @property {boolean} chargesForDemand   lo calcula el backend desde la tarifa
 * @property {boolean} excludesSundaysFromPeak
 * @property {string} status
 */

/** @typedef {"ORG_ADMIN"|"SUPERVISOR"|"OPERATOR"} MembershipRole */

/**
 * @typedef {object} Membership
 * @property {string} membershipId
 * @property {string} userId
 * @property {string|null} email  nulo si la cuenta ya no existe
 * @property {MembershipRole} role
 * @property {string|null} siteId  solo para SUPERVISOR y OPERATOR
 * @property {string} status
 */

/**
 * @typedef {object} Zone
 * @property {string} zoneId
 * @property {string} siteId
 * @property {string} name
 * @property {ZoneType} zoneType
 * @property {boolean} operatesOffHours
 * @property {string} status
 */

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
 * @property {string} deviceType  equipo comercial: p.ej. "COLD_ROOM", "HVAC", "OVEN"
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
 * @property {number | null} savingAmount null cuando no hay periodo anterior con el que comparar.
 * @property {number | null} savingPct null cuando no hay periodo anterior con el que comparar.
 * @property {number | null} projectedCost null cuando todavia no hay lecturas.
 * @property {number} totalKwh
 * @property {number} activeDevices
 * @property {number} unreadAlerts
 */

/**
 * @typedef {object} ZoneShare
 * @property {string | null} zoneId null en el consumo de medidores sin zona asignada.
 * @property {string | null} zoneName
 * @property {string | null} zoneType
 * @property {number} meterCount
 * @property {number} kwh
 * @property {number} sharePercent
 * @property {number | null} estimatedEnergyCost null si el local no tiene tarifa reconocida.
 */

/**
 * @typedef {object} ZoneConsumption
 * @property {string} siteId
 * @property {string} siteName
 * @property {number} days
 * @property {number} totalKwh
 * @property {string} currency
 * @property {ZoneShare[]} zones
 * @property {ZoneShare} unassigned
 */

/**
 * @typedef {object} SiteShare
 * @property {string} siteId
 * @property {string} siteCode
 * @property {string} siteName
 * @property {number | null} contractedPowerKw
 * @property {string | null} tariffCategory
 * @property {number} meterCount
 * @property {number} kwh
 * @property {number} sharePercent
 * @property {number | null} estimatedEnergyCost
 * @property {number | null} kwhPerContractedKw Consumo por kW contratado: lo comparable entre locales de distinto tamano.
 * @property {number} peakDemandKw
 */

/**
 * @typedef {object} SiteComparison
 * @property {string} organizationId
 * @property {number} days
 * @property {number} totalKwh
 * @property {string} currency
 * @property {SiteShare[]} sites
 */

/**
 * Potencia que el local esta tomando ahora mismo (US24).
 *
 * @typedef {object} CurrentConsumption
 * @property {string} siteId
 * @property {string} siteName
 * @property {number} meterCount        Medidores del local, hayan reportado o no
 * @property {number} powerKw           Suma de la ultima potencia de cada medidor
 * @property {number|null} contractedPowerKw
 * @property {number|null} occupancyPercent  powerKw sobre la contratada; nulo si no hay contratada
 * @property {string|null} measuredAt   Instante de la lectura mas reciente; nulo si ninguno reporto
 */

export {};
