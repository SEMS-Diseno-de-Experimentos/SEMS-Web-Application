// Datos de ejemplo del modo demo (VITE_DEMO_MODE=true).
//
// Permiten ver y revisar toda la interfaz sin levantar el backend, que es como
// se trabaja la mayor parte del tiempo. Cuando DEMO_MODE es false ningun
// servicio los toca.

// ---------- Alertas ----------
export const demoAlerts = [
  { id: "al-01", type: "DEMAND", title: "Demanda cerca de la potencia contratada", deviceName: "Medidor principal", message: "87% de los 95 kW contratados. Quedan 12.4 kW de margen.", severity: "HIGH", status: "ACTIVE", createdAt: "Hoy, 18:22" },
  { id: "al-02", type: "ANOMALY", title: "Anomalía de consumo", deviceName: "Cámara de frío 1", message: "Consumo 42% por encima del promedio de los últimos 30 días.", severity: "MEDIUM", status: "ACTIVE", createdAt: "Ayer, 19:40" },
  { id: "al-03", type: "INACTIVITY", title: "Dispositivo inactivo", deviceName: "Horno de panadería", message: "Sin actividad por más de 7 días.", severity: "LOW", status: "ACKNOWLEDGED", createdAt: "Lun, 09:15" },
  { id: "al-04", type: "THRESHOLD", title: "Umbral superado", deviceName: "Exhibidores refrigerados", message: "Encendidos por tiempo prolongado fuera de horario.", severity: "LOW", status: "RESOLVED", createdAt: "Dom, 13:02" },
];

export const demoThresholds = [
  { id: "th-01", deviceName: "Climatización — Sala de ventas", maxKwhPerDay: 20, enabled: true },
  { id: "th-02", deviceName: "Cámara de frío 1", maxKwhPerDay: 30, enabled: true },
  { id: "th-03", deviceName: "Exhibidores refrigerados", maxKwhPerDay: 14, enabled: false },
];

export const demoPreferences = [
  { channel: "EMAIL", label: "Correo electrónico", enabled: true },
  { channel: "PUSH", label: "Notificaciones push", enabled: true },
  { channel: "SMS", label: "Mensaje de texto (SMS)", enabled: false },
];

// ---------- Suscripción y pagos ----------
// Los tres planes son los mismos que siembra el backend en PlanSeeder y los
// que publica la landing: el precio va por locales, no por medidores.
export const demoPlans = [
  { id: "p-basico", name: "Básico", price: 29.9, period: "mes", features: ["1 local incluido", "Hasta 10 medidores por local", "Panel de consumo del local", "Alertas de consumo"] },
  { id: "p-pro", name: "Pro", price: 79.9, period: "mes", recommended: true, features: ["Todo lo de Básico", "5 locales incluidos", "Hasta 50 medidores por local", "Consumo desglosado por zona", "Aviso de demanda antes de superar la potencia contratada", "Reportes de consumo en hora punta"] },
  { id: "p-enterprise", name: "Enterprise", price: 129.9, period: "mes", features: ["Todo lo de Pro", "Locales y medidores ilimitados", "Comparación de rendimiento entre locales", "Análisis de categoría tarifaria", "Soporte prioritario"] },
];

export const demoSubscription = {
  id: "sub-demo-01",
  planId: "p-pro",
  planName: "Pro",
  status: "ACTIVE",
  renewalDate: "15 jul 2026",
  price: 79.9,
  period: "mes",
};

export const demoPaymentMethods = [
  { id: "pm-01", brand: "Visa", last4: "4242", expMonth: 8, expYear: 27, primary: true },
  { id: "pm-02", brand: "Mastercard", last4: "5588", expMonth: 3, expYear: 26, primary: false },
];

export const demoInvoices = [
  { id: "inv-1042", date: "15 jun 2026", amount: 79.9, status: "PAID", description: "Plan Pro · Junio" },
  { id: "inv-1019", date: "15 may 2026", amount: 79.9, status: "PAID", description: "Plan Pro · Mayo" },
  { id: "inv-0987", date: "15 abr 2026", amount: 79.9, status: "PAID", description: "Plan Pro · Abril" },
  { id: "inv-0965", date: "15 mar 2026", amount: 29.9, status: "PAID", description: "Plan Básico · Marzo" },
];