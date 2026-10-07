import { api, DEMO_MODE, delay, tokenStore } from "@/lib/api";
import { demoUser } from "@/lib/demo";

// Rol por defecto al registrarse desde la web (usuario normal del hogar).
const DEFAULT_ROLE = "STAFF";

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
    const id = payload.userId ?? payload.sub ?? payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ?? "";
    const email = payload.email ?? payload.emailAddress ?? payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ?? "";
    const role = payload.roles?.[0] ?? payload.role ?? payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ?? "RESIDENT";
    return {
      id,
      email,
      fullName: displayNameFromEmail(email),
      role,
    };
  } catch {
    return null;
  }
}

export async function login(email, password) {
  try {
    const { data } = await api.post("/api/v1/auth/login", {
      emailAddress: email,
      password,
    });
    return { token: data.token, user: mapUser(data) };
  } catch (e) {
    if (e.response?.status === 401 || e.response?.status === 400 || e.response?.status === 404) {
      throw new Error("El correo no existe o la contraseña es incorrecta.");
    }
    throw e;
  }
}

/**
 * Login con Google: el frontend obtiene un ID token (GIS) y el backend lo
 * verifica contra Google.
 *
 * @returns {Promise<import("../types").AuthResponse>}
 */
export async function loginWithGoogle(idToken) {
  const { data } = await api.post("/api/v1/auth/google", { idToken });
  return { token: data.token, user: mapUser(data) };
}

export async function register(fullName, email, password, segment) {
  try {
    await api.post("/api/v1/auth/register", {
      emailAddress: email,
      password,
      role: DEFAULT_ROLE,
      segment,
    });
    const res = await login(email, password);
    return fullName ? { ...res, user: { ...res.user, fullName } } : res;
  } catch (e) {
    if (e.response?.status === 409) {
      throw new Error("¡YA EXISTE UN EMAIL ASÍ! Por favor, usa otro.");
    }
    if (e.response?.status === 400) {
      throw new Error("Verifica tu correo y que la contraseña tenga al menos 8 caracteres.");
    }
    throw e;
  }
}

export async function getMe() {
  const token = tokenStore.get();
  if (!token) throw new Error("No hay sesión válida");
  const user = decodeToken(token);
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
  await api.post("/api/v1/auth/forgot-password", { emailAddress: email });
}

// Establece una nueva contrasena usando el token del correo.
export async function resetPassword(token, newPassword) {
  await api.post("/api/v1/auth/reset-password", { token, newPassword });
}

// Verifica (activa) la cuenta con el token del correo.
export async function verifyAccount(token) {
  await api.get("/api/v1/auth/verify", { params: { token } });
}
