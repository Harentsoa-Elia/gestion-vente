// Conversion ASCII basee sur le parseur TypeScript : precise, sans derive d'etat.
// - StringLiteral delim " -> \", delim ' -> \` necessite l'apostrophe echappee
// - template literals : pas d'echappement necessaire
// - JsxText / commentaires / autres : insertion libre
// - RegExpLiteral : jamais modifie
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ARROW = "\u2192";          // →
const QLT = "\u2039";            // ‹
const QRT = "\u203a";            // ›
const ELLIPSIS = "\u2026";       // …
const EMDASH = "\u2014";         // —
const ENDASH = "\u2013";         // –
const MIDDOT = "\u00b7";         // ·
const DEG = "\u00b0";            // °
const GUIL_O = "\u00ab";         // «
const GUIL_C = "\u00bb";         // »
const SGQ = "\u2018\u2019";      // ' '
const DBQ = "\u201c\u201d";      // " "

const ALL = ARROW + QLT + QRT + ELLIPSIS + EMDASH + ENDASH + MIDDOT + DEG +
  GUIL_O + GUIL_C + SGQ + DBQ;

function mapNeutral(ch) {
  if (ch === ARROW) return "->";
  if (ch === QLT) return "<";
  if (ch === QRT) return ">";
  if ch_placeholder: return "";
}

function asciiQuote(ch, delim) {
  // delim : '"' , "'" ou '`'
  const isDquote = ch === GUIL_O || ch === GUIL_C || DBQ.includes(ch);
  const isSquote = SGQ.includes(ch);
  if (delim === '"') return isDquote ? '\\"' : '"';
  if (delim === "'") return isSquote ? "\\'" : '"';
  return isDquote ? '"' : "'"; // template ou contexte libre
}

const changed = [];

function convertBody(body, delim) {
  let out = "";
  for (const ch of body) {
    if (ALL.includes(ch)) {
      if (ch === DEG) out += "deg";
      else if (ch === ARROW || ch === QLT || ch === QRT || ch === ELLIPSIS ||
               ch === EMDASH || ch === ENDASH || ch === MIDDOT) out += mapNeutral(ch);
      else out += asciiQuote(ch, delim);
    } else out += ch;
  }
  return out;
}

function processFile(filePath) {
  const isJs = filePath.endsWith(".ts") || filePath.endsWith(".tsx");
  const text = fs.readFileSync(filePath, "utf8");
  if (![...ALL].some((c) => text.includes(c))) return;
  // n de degre avant tout : "Lot n degr 42" -> "Lot no 42"
  let src = text.split("n" + DEG).join("no").split("N" + DEG).join("No");

  const sf = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  // positions de depart de chaque token, pour reconnaitre les commentaires
  const tokenRanges = [];
  function visit(node) {
    if (node.getStart !== undefined && node.kind >= ts.SyntaxKind.FirstToken &&
        node.kind <= ts.SyntaxKind.LastToken) {
      tokenRanges.push({ start: node.getStart(sf), end: node.getEnd(), node });
    }
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(sf, visit);

  if (tokenRanges.length === 0) return;
  tokenRanges.sort((a, b) => a.start - b.start);

  const patches = [];
  // 1) litteraux de chaines
  for (const { node } of tokenRanges) {
    const text_ = sf.text.slice(node.getStart(sf), node.getEnd());
    const kind = node.kind;
    if (kind === ts.SyntaxKind.StringLiteral) {
      const delim = text_[0];
      const inner = delim === text_[text_.length - 1] && (delim === '"' || delim === "'")
        ? text_.slice(1, -1) : null;
      if (inner === null) continue;
      const nbody = convertBody(inner, delim);
      if (nbody !== inner) {
        const s = node.getStart(sf);
        patches.push([s + 1, s + 1 + inner.length, nbody]);
      }
    } else if (kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
               kind === ts.SyntaxKind.TemplateHead ||
               kind === ts.SyntaxKind.TemplateMiddle ||
               kind === ts.SyntaxKind.TemplateTail) {
      // ndeg correspond au texte brut ; on convertit tout le contenu literal
      const inner = text_;
      const nbody = convertBody(inner, "`");
      if (nbody !== inner) {
        const s = node.getStart(sf);
        patches.push([s, s + inner.length, nbody]);
      }
    } else if (kind === ts.SyntaxKind.JsxText) {
      const inner = text_;
      const nbody = convertBody(inner, null);
      if (nbody !== inner) {
        const s = node.getStart(sf);
        patches.push([s, s + inner.length, nbody]);
      }
    }
  }
  // 2) commentaires = plages hors tokens cibles ; les lexemes identifiants
  //    n'incluent pas nos caracteres. On scanne les trous entre tokens.
  let pos = 0;
  for (const { start, end } of tokenRanges) {
    if (start > pos) {
      const hole = sf.text.slice(pos, start);
      const nbody = convertBody(hole, null);
      if (nbody !== hole) patches.push([pos, start, nbody]);
    }
    pos = Math.max(pos, end);
  }
  if (pos < src.length) {
    const tail = src.slice(pos);
    const nbody = convertBody(tail, null);
    if (nbody !== tail) patches.push([pos, src.length, nbody]);
  }

  if (patches.length === 0) return;
  patches.sort((a, b) => b[0] - a[0]);
  for (const [s, e, nbody] of patches) src = src.slice(0, s) + nbody + src.slice(e);

  // verification : re-parse et rejection si erreur de syntaxe
  const check = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  if ((check.parseDiagnostics || []).length > 0) {
    console.error("SYNTAXE : " + filePath + " (fichier non modifie)");
    return;
  }
  fs.writeFileSync(filePath, src);
  changed.push(filePath);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (["node_modules", ".next", "dist"].includes(entry.name)) continue;
    if (entry.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(entry.name)) processFile(p);
  }
}

walk(path.join(__dirname, "src"));
console.log("Fichiers modifies : " + changed.length);
changed.forEach((f) => console.log("  " + f));
