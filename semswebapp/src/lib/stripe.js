// Se importa la variante "pure" a proposito. El punto de entrada normal de
// @stripe/stripe-js inyecta el script de Stripe en cuanto se importa el modulo,
// aunque nunca se llegue a cobrar: eso descarga un script de terceros en todas
// las pantallas, incluso cuando ni siquiera hay clave configurada. Con "/pure"
// el script se pide en la primera llamada a loadStripe y no antes.
import { loadStripe } from "@stripe/stripe-js/pure";

// Clave publicable de Stripe (configurala en Vercel como VITE_STRIPE_PUBLISHABLE_KEY).
// Es publica por diseno: puede viajar al navegador. La clave secreta (sk_...)
// vive solo en el backend y nunca debe llevar el prefijo VITE_.
const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Si no hay clave, queda null y la interfaz de pago con tarjeta se oculta.
export const stripePromise = key ? loadStripe(key) : null;
export const STRIPE_ENABLED = Boolean(key);
