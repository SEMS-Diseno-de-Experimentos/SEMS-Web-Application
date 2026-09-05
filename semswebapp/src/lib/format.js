// Formateadores para soles (PEN) y energia.

export const soles = (n) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(n);

export const kwh = (n) =>
  `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(n)} kWh`;

export const pct = (n) => `${Math.round(n)}%`;
