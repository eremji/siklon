// Permet à Node d'exécuter les scripts TypeScript qui importent src/lib sans extension
// (style du projet) : un import relatif introuvable est retenté avec « .ts ».
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (erreur) {
      if (erreur?.code !== "ERR_MODULE_NOT_FOUND" || !/^\.\.?\//.test(specifier) || /\.[cm]?[jt]s$/.test(specifier)) {
        throw erreur;
      }
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});
