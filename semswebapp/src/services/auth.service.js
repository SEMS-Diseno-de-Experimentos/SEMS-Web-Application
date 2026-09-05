import { api, DEMO_MODE, delay, tokenStore } from "@/lib/api";
import { demoUser } from "@/lib/demo";

// Rol por defecto al registrarse desde la web (usuario normal del hogar).
const DEFAULT_ROLE = "RESIDENT";

/**
 * Forma real de la respuesta del modulo de identidad en /auth/login y
 * /auth/register: `{ token, userId, emailAddress, roles, segment }`.
 */

/** @returns {import("../types").UserSegment | undefined} */
function normSegment(s) {
  const u = String(s ?? "").toUpperCase();
  return u === "HOMEOWNER" || u === "TENANT" ? u : undefined;
}

// El modulo de identidad no guarda nombre, asi que armamos uno para mostrar a
// partir del correo.
function displayNameFromEmail(email) {
  const local = (email || "").split("@")[0] || "Usuario";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/** @returns {import("../types").User} */
function mapUser(res) {
  return {
    id: res.userId,
    email: res.emailAddress,
    fullName: displayNameFromEmail(res.emailAddress),
    role: res.roles?.[0] ?? "RESIDENT",
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
      role: payload.roles?.[0] ?? "RESIDENT",
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
  // El backend registra con emailAddress + password + role + segment.
  await api.post("/api/v1/auth/register", {
    emailAddress: email,
    password,
    role: DEFAULT_ROLE,
    segment,
  });
  // Tras registrar, iniciamos sesion para obtener el token.
  const res = await login(email, password);
  // El nombre lo escribio el usuario (el backend no lo guarda); el segmento lo
  // trae el login.
  return fullName ? { ...res, user: { ...res.user, fullName } } : res;
}

/** @returns {Promise<import("../types").User>} */
export async function getMe() {
  if (DEMO_MODE) {
    await delay(200);
    return demoUser;
  }
  // Reconstruimos el usuario desde el JWT guardado (evita depender de /users/me).
  const token = tokenStore.get();
  const user = token ? decodeToken(token) : null;
  if (!user) throw new Error("No hay sesión válida");
  return user;
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

// Verifica (activa) la cuenta con el token del correo.
export async function verifyAccount(token) {
  if (DEMO_MODE) { await delay(400); return; }
  await api.get("/api/v1/auth/verify", { params: { token } });
}
