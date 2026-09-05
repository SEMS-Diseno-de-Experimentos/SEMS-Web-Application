/**
 * Tipos del modulo de alertas.
 *
 * @module types/alerts
 */

/** @typedef {"ACTIVE" | "ACKNOWLEDGED" | "RESOLVED"} AlertStatus */
/** @typedef {"LOW" | "MEDIUM" | "HIGH"} AlertSeverity */
/** @typedef {"THRESHOLD" | "ANOMALY" | "INACTIVITY"} AlertType */
/** @typedef {"EMAIL" | "SMS" | "PUSH"} NotificationChannel */

/**
 * @typedef {object} Alert
 * @property {string} id
 * @property {AlertType} type
 * @property {string} title
 * @property {string} deviceName
 * @property {string} message
 * @property {AlertSeverity} severity
 * @property {AlertStatus} status
 * @property {string} createdAt
 */

/**
 * @typedef {object} Threshold
 * @property {string} id
 * @property {string} deviceName
 * @property {number} maxKwhPerDay
 * @property {boolean} enabled
 */

/**
 * @typedef {object} NotificationPreference
 * @property {NotificationChannel} channel
 * @property {string} label
 * @property {boolean} enabled
 */

export {};
