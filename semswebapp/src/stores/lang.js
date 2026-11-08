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
  // El idioma por defecto de la solucion es el ingles, como la landing y la
  // API; el espanol es la alternativa. Quien ya eligio uno conserva su
  // eleccion, que es lo que guarda localStorage.
  const saved = localStorage.getItem(LANG_KEY);
  const lang = ref(saved === "en" || saved === "es" ? saved : "en");

  // El atributo lang del documento se ponia solo al cambiar de idioma, asi que
  // hasta el primer cambio la pagina se anunciaba en el idioma escrito en
  // index.html. Quien lee con lector de pantalla se lleva la pronunciacion del
  // idioma equivocado.
  document.documentElement.lang = lang.value;

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
