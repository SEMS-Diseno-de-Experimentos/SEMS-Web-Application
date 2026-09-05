import { defineStore } from "pinia";
import { ref } from "vue";

const LANG_KEY = "sems-lang";

/**
 * Idioma de la interfaz (espanol / ingles).
 *
 * No hay diccionario externo: se traduce en linea con `t("Hola", "Hello")`.
 * Con dos idiomas y textos que viven pegados a su pantalla, un archivo de
 * traducciones separado costaria mas de mantener de lo que ahorra.
 */
export const useLangStore = defineStore("lang", () => {
  const saved = localStorage.getItem(LANG_KEY);
  const lang = ref(saved === "en" || saved === "es" ? saved : "es");

  function setLang(l) {
    lang.value = l;
    localStorage.setItem(LANG_KEY, l);
    document.documentElement.lang = l;
  }

  function toggle() {
    setLang(lang.value === "es" ? "en" : "es");
  }

  /**
   * Traduce en linea.
   * @param {string} es texto en espanol
   * @param {string} en texto en ingles
   */
  function t(es, en) {
    return lang.value === "en" ? en : es;
  }

  return { lang, setLang, toggle, t };
});
