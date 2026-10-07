import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";

/**
 * El enunciado pide verificar el codigo contra los estandares del lenguaje:
 * ESLint para JavaScript y la Vue Style Guide para los componentes.
 */
export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        location: "readonly",
        crypto: "readonly",
        atob: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        URLSearchParams: "readonly",
        Intl: "readonly",
        Promise: "readonly",
        Map: "readonly",
        Set: "readonly",
        Date: "readonly",
        JSON: "readonly",
        Math: "readonly",
        Number: "readonly",
        String: "readonly",
        Boolean: "readonly",
        Array: "readonly",
        Object: "readonly",
        Error: "readonly",
        isNaN: "readonly",
        console: "readonly",
      },
    },
    rules: {
      // Las vistas se llaman igual que su ruta y terminan en View; exigir dos
      // palabras obligaria a renombrarlas sin ganar legibilidad.
      "vue/multi-word-component-names": "off",
    },
  },
];
