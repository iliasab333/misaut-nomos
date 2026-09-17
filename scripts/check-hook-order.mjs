#!/usr/bin/env node
// Garde-fou : aucun hook React ne doit être appelé APRÈS un `return` de
// premier niveau dans un composant.
//
// Pourquoi ce script existe. La tab bar native cachait la barre sur les
// écrans d'authentification avec un `return null` posé au MILIEU du
// composant, avant deux hooks. Un chargement direct de /connexion marchait
// (le premier rendu s'arrêtait avant les hooks, React n'avait rien à
// comparer). Mais en y arrivant DEPUIS l'app — l'onglet Favoris qui
// redirige vers la connexion, « Se connecter » depuis Compte — le
// composant était déjà monté avec sa liste complète ; le rendu suivant en
// fournissait moins, React levait « Rendered fewer hooks than expected »
// et démontait TOUT l'arbre.
//
// Résultat pour l'utilisateur : écran blanc. Pas de message, pas
// d'ErrorBoundary (elle est À L'INTÉRIEUR de l'arbre démonté), rien dans
// l'interface. Connexion, inscription, mot de passe oublié, bienvenue,
// création de fiche pro et édition de profil devenaient inatteignables
// depuis l'intérieur de l'app.
//
// Aucun test ne l'attrapait, et une revue de code non plus : la ligne
// fautive est un `return null` parfaitement banal. C'est une propriété
// structurelle du fichier, donc c'est un script qui doit la vérifier.
//
// La profondeur est suivie caractère par caractère (chaînes et
// commentaires ignorés) : un `return` dans un callback — useEffect, map,
// arrow inline — est à une profondeur > 0 et ne compte pas.
//
// Usage : npm run check:hooks   (exit 1 si violation)

import fs from 'node:fs';

const HOOK = /\buse[A-Z]\w*\s*\(/y;
const RET = /\breturn\b/y;

function scan(src, file) {
  const out = [];
  const re = /^(?:export default |export )?function\s+([A-Z]\w*)\s*\(/gm;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    // Trouver l'accolade du CORPS, pas celle des paramètres.
    //
    // `indexOf('{')` tombait sur la déstructuration des props —
    // `function Header({ title, right })` — et le contrôle analysait donc
    // la liste d'arguments au lieu de la fonction. Autrement dit il ne
    // voyait RIEN dans la grande majorité des composants, qui prennent
    // tous leurs props déstructurés. Un garde-fou vert sur un fichier
    // fautif est pire que pas de garde-fou : il donne la certitude à la
    // place de la vérification. (Trouvé en le vérifiant sur
    // NativeAppHeader, qui a bien un `return` au-dessus de ses hooks et
    // que ce script déclarait sain.)
    let depthParen = 0;
    let i = -1;
    for (let k = m.index; k < src.length; k++) {
      const c = src[k];
      if (c === '(') depthParen++;
      else if (c === ')') { depthParen--; if (depthParen === 0) { i = src.indexOf('{', k); break; } }
    }
    if (i < 0) continue;
    let d = 0, end = src.length;
    for (let k = i; k < src.length; k++) {
      const c = src[k];
      if (c === '{') d++;
      else if (c === '}') { d--; if (d === 0) { end = k; break; } }
    }
    let depth = 0, retLine = 0, inLine = false, inBlock = false, str = null;
    let line = src.slice(0, i).split('\n').length;
    for (let k = i + 1; k < end; k++) {
      const c = src[k], n2 = src.slice(k, k + 2);
      if (c === '\n') { line++; inLine = false; continue; }
      if (inLine) continue;
      if (inBlock) { if (n2 === '*/') { inBlock = false; k++; } continue; }
      if (str) { if (c === '\\') k++; else if (c === str) str = null; continue; }
      if (n2 === '//') { inLine = true; k++; continue; }
      if (n2 === '/*') { inBlock = true; k++; continue; }
      if (c === '"' || c === "'" || c === '`') { str = c; continue; }
      if (c === '{' || c === '(' || c === '[') { depth++; continue; }
      if (c === '}' || c === ')' || c === ']') { depth--; continue; }
      if (depth !== 0) continue;
      RET.lastIndex = k;
      if (RET.test(src) && /[\s;{(]/.test(src[k - 1] || ' ')) { if (!retLine) retLine = line; continue; }
      HOOK.lastIndex = k;
      if (HOOK.test(src) && /[\s;=({,.[]/.test(src[k - 1] || ' ') && retLine) {
        const code = src.slice(k, src.indexOf('\n', k)).trim().slice(0, 80);
        out.push({ file, name, retLine, hookLine: line, code });
        break;
      }
    }
  }
  return out;
}

let bad = 0;
for (const f of process.argv.slice(2)) {
  for (const v of scan(fs.readFileSync(f, 'utf8'), f)) {
    console.log(`  ⚠ ${v.file}  ${v.name}()`);
    console.log(`      return de premier niveau ligne ${v.retLine}, puis hook ligne ${v.hookLine} : ${v.code}`);
    bad++;
  }
}
console.log(bad ? `\n${bad} violation(s) — React démontera l'arbre sur ces écrans` : '\n✓ aucun hook après un return de premier niveau');
process.exit(bad ? 1 : 0);
