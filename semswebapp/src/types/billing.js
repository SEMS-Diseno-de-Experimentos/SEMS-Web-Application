/**
 * Tipos de suscripciones y pagos.
 *
 * @module types/billing
 */

/** @typedef {"ACTIVE" | "TRIAL" | "CANCELED" | "PAST_DUE"} SubscriptionStatus */
/** @typedef {"PAID" | "PENDING" | "FAILED"} InvoiceStatus */

/**
 * @typedef {object} SubscriptionPlan
 * @property {string} id
 * @property {string} name
 * @property {number} price  soles
 * @property {"mes" | "año"} period
 * @property {string[]} features
 * @property {boolean} [recommended]
 */

/**
 * @typedef {object} Subscription
 * @property {string} id
 * @property {string} planId
 * @property {string} planName
 * @property {SubscriptionStatus} status
 * @property {string} renewalDate
 * @property {number} price
 * @property {string} period
 */

/**
 * @typedef {object} PaymentMethod
 * @property {string} id
 * @property {string} brand  Visa, Mastercard
 * @property {string} last4
 * @property {number} expMonth
 * @property {number} expYear
 * @property {boolean} primary
 */

/**
 * @typedef {object} Invoice
 * @property {string} id
 * @property {string} date
 * @property {number} amount
 * @property {InvoiceStatus} status
 * @property {string} description
 */

export {};
