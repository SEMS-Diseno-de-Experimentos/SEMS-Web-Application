import { api, DEMO_MODE, delay, tokenStore } from "@/lib/api";
import { demoUser } from "@/lib/demo";

// Rol por defecto al registrarse desde la web: personal del establecimiento.
// Tiene que ser uno de los que el backend siembra (ADMIN o STAFF); el antiguo
// RESIDENT desaparecio al cambiar el segmento y hacia fallar el alta.
const DEFAULT_ROLE = "STAFF";

/**
 * Forma real de la respuesta del modulo de identidad en /auth/login y
 * /auth/register: `{ token, userId, emailAddress, roles, segment }`.
 */

/** @returns {import("../types").UserSegment | undefined} */
function normSegment(s) {
  const u = String(s ?? "").toUpperCase();
  return u === "RETAIL_CHAIN" || u === "INDEPENDENT" ? u : undefined;
}

// Si la cuenta no tiene nombre (altas anteriores a guardarlo), se muestra la
// parte local del correo para no dejar el saludo vacio.
function displayNameFromEmail(email) {
  const local = (email || "").split("@")[0] || "Usuario";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/** @returns {import("../types").User} */
function mapUser(res) {
  return {
    id: res.userId,
    email: res.emailAddress,
    // El nombre lo guarda el backend: antes se inventaba a partir del correo y
    // el que el usuario escribia en el alta solo vivia en este navegador.
    fullName: res.fullName || displayNameFromEmail(res.emailAddress),
    role: res.roles?.[0] ?? DEFAULT_ROLE,
    segment: normSegment(res.segment),
  };
}

/**
 * Reconstruye el usuario desde el payload del JWT.
 *
 * No valida la firma, y no debe hacerlo: la firma la valida el backend en cada
 * peticion. Aqui solo se leen los datos para pintar el nombre y el rol.
 *
 * @returns {import("../types").User | null}
 */
function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      id: payload.userId ?? payload.sub ?? "",
      email: payload.email ?? payload.emailAddress ?? "",
      fullName: displayNameFromEmail(payload.email ?? payload.emailAddress ?? ""),
      role: payload.roles?.[0] ?? DEFAULT_ROLE,
    };
  } catch {
    return null;
  }
}

/** @returns {Promise<import("../types").AuthResponse>} */
export async function login(email, password) {
  if (DEMO_MODE) {
    await delay();
    return { token: "demo-token", user: { ...demoUser, email: email || demoUser.email } };
  }
  const { data } = await api.post("/api/v1/auth/login", {
    emailAddress: email,
    password,
  });
  return { token: data.token, user: mapUser(data) };
}

/**
 * Login con Google: el frontend obtiene un ID token (GIS) y el backend lo
 * verifica contra Google.
 *
 * @returns {Promise<import("../types").AuthResponse>}
 */
export async function loginWithGoogle(idToken) {
  if (DEMO_MODE) {
    await delay();
    return { token: "demo-token", user: demoUser };
  }
  const { data } = await api.post("/api/v1/auth/google", { idToken });
  return { token: data.token, user: mapUser(data) };
}

/** @returns {Promise<import("../types").AuthResponse>} */
export async function register(fullName, email, password, segment) {
  if (DEMO_MODE) {
    await delay();
    return { token: "demo-token", user: { ...demoUser, fullName, email, segment } };
  }
  // El alta ya devuelve token y perfil, asi que no hace falta encadenar un
  // login detras: era una segunda vuelta al servidor para pedir lo que la
  // primera acababa de responder.
  const { data } = await api.post("/api/v1/auth/register", {
    emailAddress: email,
    password,
    role: DEFAULT_ROLE,
    fullName,
    segment,
  });
  return { token: data.token, user: mapUser(data) };
}

/** @returns {Promise<import("../types").User>} */
export async function getMe() {
  if (DEMO_MODE) {
    await delay(200);
    return demoUser;
  }
  const token = tokenStore.get();
  if (!token) throw new Error("No hay sesión válida");
  try {
    // El perfil se pide al backend: el token lleva el correo y los roles, pero
    // no el nombre ni el segmento, y son justo los que cambian.
    const { data } = await api.get("/api/v1/users/me");
    return mapUser(data);
  } catch {
    // Si la peticion falla (sin red, backend caido) se tira del token para no
    // echar al usuario de una sesion que sigue siendo valida.
    const user = decodeToken(token);
    if (!user) throw new Error("No hay sesión válida");
    return user;
  }
}

/**
 * Guarda el nombre y el segmento del propio usuario.
 *
 * @returns {Promise<import("../types").User>}
 */
export async function updateProfile({ fullName, segment }) {
  if (DEMO_MODE) {
    await delay(300);
    return { ...demoUser, fullName, segment };
  }
  const { data } = await api.put("/api/v1/users/me", { fullName, segment });
  return mapUser(data);
}

// --- Recuperacion de cuenta y verificacion (RF-NOT-03 / RF-AUTH-01) ---

/**
 * Inicia la recuperacion de contrasena.
 *
 * El backend responde igual exista o no el correo: si respondiera distinto,
 * cualquiera podria averiguar que direcciones estan registradas.
 */
export async function forgotPassword(email) {
  if (DEMO_MODE) { await delay(400); return; }
  await api.post("/api/v1/auth/forgot-password", { emailAddress: email });
}

// Establece una nueva contrasena usando el token del correo.
export async function resetPassword(token, newPassword) {
  if (DEMO_MODE) { await delay(400); return; }
  await api.post("/api/v1/auth/reset-password", { token, newPassword });
}

// Verifica (activa) la cuenta con el token del correo. El backend espera el
// token en el cuerpo de un POST; con GET responde 405 y la cuenta nunca se
// activa. Devuelve una sesion, que aqui no se usa: el usuario entra a mano.
export async function verifyAccount(token) {
  if (DEMO_MODE) { await delay(400); return; }
  await api.post("/api/v1/auth/verify", { token });
}
