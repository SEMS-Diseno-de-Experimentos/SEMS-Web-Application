import { defineStore } from "pinia";
import { ref, watch } from "vue";

const THEME_KEY = "sems-theme";

/**
 * Tema claro / oscuro.
 *
 * La clase "dark" en <html> la leen a la vez Tailwind (por el @custom-variant
 * de main.css) y PrimeVue (por darkModeSelector en main.js), asi que un solo
 * interruptor cambia toda la interfaz.
 *
 * El valor inicial ya lo aplico el script inline de index.html, antes del
 * primer render; aqui solo se sincroniza el estado.
 */
export const useThemeStore = defineStore("theme", () => {
  const stored = localStorage.getItem(THEME_KEY);
  const theme = ref(stored === "dark" || stored === "light" ? stored : "light");

  watch(
    theme,
    (value) => {
      document.documentElement.classList.toggle("dark", value === "dark");
      localStorage.setItem(THEME_KEY, value);
    },
    { immediate: true }
  );

  function toggle() {
    theme.value = theme.value === "dark" ? "light" : "dark";
  }

  return { theme, toggle };
});
