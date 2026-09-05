import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { tokenStore } from "@/lib/api";
import * as authService from "@/services/auth.service";

const USER_KEY = "sems-user";

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Dato corrupto en localStorage: preferimos empezar sin sesion antes que
    // reventar el arranque de la aplicacion.
    return null;
  }
}

/**
 * Sesion del usuario.
 *
 * Sustituye al AuthContext de React. Pinia da el mismo estado compartido sin
 * necesidad de envolver la aplicacion en un proveedor, y cualquier componente
 * lo consume con `useAuthStore()`.
 */
export const useAuthStore = defineStore("auth", () => {
  const user = ref(readStoredUser());
  const loading = ref(false);

  const isAuthenticated = computed(() => Boolean(tokenStore.get()));

  function persist(token, u) {
    tokenStore.set(token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    user.value = u;
  }

  /**
   * Si hay token pero no usuario en memoria, recupera el perfil.
   * Se llama una vez al arrancar la aplicacion.
   */
  async function restore() {
    if (!tokenStore.get() || user.value) return;
    try {
      const u = await authService.getMe();
      user.value = u;
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      // Token invalido o expirado: se queda sin sesion y el guard de rutas
      // lo mandara al login.
    }
  }

  async function login(email, password) {
    loading.value = true;
    try {
      const res = await authService.login(email, password);
      persist(res.token, res.user);
    } finally {
      loading.value = false;
    }
  }

  async function loginWithGoogle(idToken) {
    loading.value = true;
    try {
      const res = await authService.loginWithGoogle(idToken);
      persist(res.token, res.user);
    } finally {
      loading.value = false;
    }
  }

  async function register(fullName, email, password, segment) {
    loading.value = true;
    try {
      const res = await authService.register(fullName, email, password, segment);
      persist(res.token, res.user);
    } finally {
      loading.value = false;
    }
  }

  /** Actualiza datos del perfil en memoria y en localStorage (nombre, segmento). */
  function updateProfile(patch) {
    if (!user.value) return;
    const next = { ...user.value, ...patch };
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    user.value = next;
  }

  function logout() {
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    user.value = null;
    // Redireccion dura a proposito: garantiza volver al login sin depender del
    // router y ademas limpia todo el estado en memoria (incluida la cache de
    // vue-query, que si no conservaria datos del usuario anterior).
    window.location.replace("/login");
  }

  return {
    user,
    loading,
    isAuthenticated,
    restore,
    login,
    loginWithGoogle,
    register,
    updateProfile,
    logout,
  };
});
