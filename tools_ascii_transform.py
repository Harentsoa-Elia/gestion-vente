# -*- coding: utf-8 -*-
"""Conversion ASCII : guillemets typographiques, ellipses, tirets, etc.

Mini-lexer pour echapper correctement selon le contexte (commentaire,
chaine simple/double/triple/template, code, texte JSX).
"""
import io
import os

# Protection de la regex fonctionnelle de normalisation (plage d'accents combinants)
PROTECT = "[" + "\u0300" + "-" + "\u036f" + "]"
PLACEHOLDER = "@@COMBRANGE@@"

ARROW = "\u2192"        # ->
QUOTE_L = "\u2039"      # <
QUOTE_R = "\u203a"      # >
ELLIPSIS = "\u2026"     # ...
EMDASH = "\u2014"       # -
ENDASH = "\u2013"       # -
MIDDOT = "\u00b7"       # -
DEG = "\u00b0"          # no
GUIL_O = "\u00ab"       # <
GUIL_C = "\u00bb"       # >
SGQL = "\u2018"         # '
SGQR = "\u2019"         # '
DBQL = "\u201c"         # <
DBQR = "\u201d"         # >

SPECIALS = (ARROW, QUOTE_L, QUOTE_R, ELLIPSIS, EMDASH, ENDASH, MIDDOT)
QUOTES = (GUIL_O, GUIL_C, DBQL, DBQR, SGQL, SGQR)


def specials_map(ch):
    if ch == ARROW:
        return "->"
    if ch == QUOTE_L:
        return "<"
    if ch == QUOTE_R:
        return ">"
    if ch == ELLIPSIS:
        return "..."
    if ch in (EMDASH, ENDASH, MIDDOT):
        return "-"
    return ch


def ascii_quote(ch, state):
    """Guillemets et apostrophes : echappement selon l'etat."""
    if ch in (GUIL_O, GUIL_C, DBQL, DBQR):
        return '\\"' if state == "double" else '"'
    if ch in (SGQL, SGQR):
        return "\\'" if state == "single" else "'"
    if ch == DEG:
        return "deg"
    return ch


def transform(text, lang):
    text = text.replace(PROTECT, PLACEHOLDER)
    out = []
    i = 0
    n = len(text)
    state = None
    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ""

        if state in (None, "line_comment", "block_comment"):
            if state == "line_comment" and ch == "\n":
                state = None
                out.append(ch)
                i += 1
                continue
            if state == "block_comment" and ch == "*" and nxt == "/":
                out.append("*/")
                i += 2
                state = None
                continue
            if ch == "#" and lang == "py" and state is None:
                state = "line_comment"
                out.append(ch)
                i += 1
                continue
            if ch == "/" and nxt == "/" and lang != "py" and state is None:
                state = "line_comment"
                out.append("//")
                i += 2
                continue
            if ch == "/" and nxt == "*" and lang != "py" and state is None:
                state = "block_comment"
                out.append("/*")
                i += 2
                continue
            if (ch == '"' or ch == "'"):
                if lang == "py" and nxt == ch and text[i:i + 3] == ch * 3:
                    state = "triple_" + ch
                    out.append(ch * 3)
                    i += 3
                    continue
                state = "single" if ch == "'" else "double"
                out.append(ch)
                i += 1
                continue
            if ch == "`" and lang != "py":
                state = "template"
                out.append(ch)
                i += 1
                continue
            if ch in SPECIALS:
                out.append(specials_map(ch))
                i += 1
                continue
            if ch in QUOTES or ch == DEG:
                out.append(ascii_quote(ch, "code"))
                i += 1
                continue
            out.append(ch)
            i += 1
            continue

        if state in ("single", "double", "template"):
            if ch == "\\":
                out.append(text[i:i + 2])
                i += 2
                continue
            if state == "single" and ch == "'":
                out.append(ch)
                i += 1
                state = None
                continue
            if state == "double" and ch == '"':
                out.append(ch)
                i += 1
                state = None
                continue
            if state == "template" and ch == "`":
                out.append(ch)
                i += 1
                state = None
                continue
            if ch in SPECIALS:
                out.append(specials_map(ch))
            elif ch in QUOTES or ch == DEG:
                out.append(ascii_quote(ch, state if state in ("single", "double") else "code"))
            else:
                out.append(ch)
            i += 1
            continue

        if state and state.startswith("triple_"):
            q = state[-1]
            if ch == "\\":
                out.append(text[i:i + 2])
                i += 2
                continue
            if ch == q and text[i:i + 3] == q * 3:
                out.append(q * 3)
                i += 3
                state = None
                continue
            if ch in SPECIALS:
                out.append(specials_map(ch))
            elif ch in QUOTES or ch == DEG:
                out.append(ascii_quote(ch, "code"))
            else:
                out.append(ch)
            i += 1
            continue

    return "".join(out).replace(PLACEHOLDER, PROTECT)


def run(roots, exts):
    changed = []
    for root in roots:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in
                           {"node_modules", ".next", ".git", "venv", "__pycache__", "dist"}]
            for fn in filenames:
                ext = os.path.splitext(fn)[1]
                if ext not in exts:
                    continue
                path = os.path.join(dirpath, fn)
                lang = "py" if ext == ".py" else "js"
                with io.open(path, encoding="utf-8", newline="") as f:
                    text = f.read()
                if not any(c in text for c in (GUIL_O, GUIL_C, ELLIPSIS, EMDASH, ENDASH,
                                               MIDDOT, DEG, ARROW, SGQL, SGQR, DBQL, DBQR,
                                               QUOTE_L, QUOTE_R)):
                    continue
                # n deg recu avant le passage generique : "Lot n deg 42" -> "Lot no 42"
                text = text.replace("n" + DEG, "no").replace("N" + DEG, "No")
                new = transform(text, lang)
                if new != text:
                    with io.open(path, "w", encoding="utf-8", newline="") as f:
                        f.write(new)
                    changed.append(path)
    return changed


if __name__ == "__main__":
    files = run(
        roots=["front-office/src", "backend/app", "backend/alembic", "backend/scripts"],
        exts={".ts", ".tsx", ".js", ".jsx", ".py", ".md", ".txt", ".ini", ".sql", ".yml", ".yaml"},
    )
    print("Fichiers modifies : %d" % len(files))
    for p in files:
        print(" ", p)
