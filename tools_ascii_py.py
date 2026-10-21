# -*- coding: utf-8 -*-
"""Conversion ASCII basee sur le tokenizeur Python.

Regles d'echappement :
- triple (docstrings) : toujours echappe (backslash-quote valide partout, evite
- triple (docstrings) : toujours echappe (backslash-quote valide partout,
  evite les sequences de guillemets adjacents au delimiteur) ;
- delim " simple : \" pour les guillemets, ' direct ;
- delim ' simple : guillemets directs, \' pour l'apostrophe typographique ;
- raw strings (r"...") : insertion brute, pas d'anti-slash.
- f-strings py3.12+ : les segments FSTRING_MIDDLE sont traites avec le
  delimiteur reconnu du FSTRING_START correspondant.
"""
import io
import os
import re
import sys
import tokenize

ARROW = "\u2192"
QLT = "\u2039"
QRT = "\u203a"
ELLIPSIS = "\u2026"
EMDASH = "\u2014"
ENDASH = "\u2013"
MIDDOT = "\u00b7"
DEG = "\u00b0"
GUIL_O = "\u00ab"
GUIL_C = "\u00bb"
SGQ = ("\u2018", "\u2019")
DBQ = ("\u201c", "\u201d")

ALL = set(ARROW + QLT + QRT + ELLIPSIS + EMDASH + ENDASH + MIDDOT + DEG +
          GUIL_O + GUIL_C + "".join(SGQ) + "".join(DBQ))

FSTRING_START = getattr(tokenize, "FSTRING_START", None)
FSTRING_MIDDLE = getattr(tokenize, "FSTRING_MIDDLE", None)
FSTRING_END = getattr(tokenize, "FSTRING_END", None)

PREFIX_RE = re.compile(r"^([a-zA-Z]*)")


def map_q(ch, delim, triple, raw):
    """Guillemets typographiques enorme/double -> ASCII."""
    if raw:
        return '"' if ch in (GUIL_O, GUIL_C) or ch in DBQ else "'"
    if triple:
        return '\\"' if (ch in (GUIL_O, GUIL_C) or ch in DBQ) else "\\'"
    if delim == '"':
        return '\\"' if (ch in (GUIL_O, GUIL_C) or ch in DBQ) else "'"
    # delim "'" ou None
    if ch in (GUIL_O, GUIL_C) or ch in DBQ:
        return '"'
    return "\\'" if ch in SGQ else "'"


def map_neutral(ch):
    if ch == ARROW:
        return "->"
    if ch == QLT:
        return "<"
    if ch == QRT:
        return ">"
    if ch == ELLIPSIS:
        return "..."
    if ch in (EMDASH, ENDASH, MIDDOT):
        return "-"
    if ch == DEG:
        return "deg"
    return ch


def analyze_string(tok_sval):
    """STRING du pre-3.12 (ou sans interpolation) : (delim, triple, raw, body_start, body_end)."""
    m = PREFIX_RE.match(tok_sval)
    prefix = m.group(1).lower()
    raw = "r" in prefix
    i = m.end()
    delim = None
    triple = False
    if i < len(tok_sval) and tok_sval[i] in "\"'":
        delim = tok_sval[i]
        if tok_sval[i:i + 3] == delim * 3:
            triple = True
    if delim is None:
        return None
    body_start = i + (3 if triple else 1)
    body_end = len(tok_sval) - (3 if triple else 1)
    if triple:
        # verifie que la fin est bien le delimiteur triple
        if not tok_sval.endswith(delim * 3):
            body_end = len(tok_sval)
    return (delim, triple, raw, body_start, body_end)


def convert_body(body, delim, triple, raw):
    out = []
    for ch in body:
        if ch in ALL:
            if ch == DEG:
                out.append("deg")
            elif ch in (ARROW, QLT, QRT, ELLIPSIS, EMDASH, ENDASH, MIDDOT):
                out.append(map_neutral(ch))
            else:
                out.append(map_q(ch, delim, triple, raw))
        else:
            out.append(ch)
    return "".join(out)


def process(path):
    with io.open(path, encoding="utf-8", newline="") as f:
        text = f.read()
    if not any(c in text for c in ALL):
        return None
    text = text.replace("n" + DEG, "no").replace("N" + DEG, "No")
    patches = []
    reader = io.StringIO(text).readline
    fstring_delim = None       # delimiteur de la f-string courante (py3.12+)
    fstring_triple = False
    try:
        for tok in tokenize.generate_tokens(reader):
            ttype, sval, start, end, _ = tok
            if FSTRING_START is not None and ttype == FSTRING_START:
                ch = sval[-1]
                fstring_delim = ch if ch in "\"'" else None
                fstring_triple = fstring_delim is not None and sval.endswith(ch * 3)
                continue
            if FSTRING_END is not None and ttype == FSTRING_END:
                fstring_delim = None
                continue
            if FSTRING_MIDDLE is not None and ttype == FSTRING_MIDDLE:
                if any(c in sval for c in ALL):
                    body = convert_body(sval, fstring_delim, fstring_triple, False)
                    # FSTRING_MIDDLE : le texte source du token correspond a sval
                    # tel quel (les accolades doublees sont preservees par le
                    # tokenizeur) : ok pour un patch direct.
                    patches.append((start, end, body))
                continue
            if ttype == tokenize.STRING:
                an = analyze_string(sval)
                if an is None:
                    continue
                delim, triple, raw, bs, be = an
                body = convert_body(sval[bs:be], delim, triple, raw)
                new = sval[:bs] + body + sval[be:]
                if new != sval:
                    patches.append((start, end, new))
                continue
            if ttype == tokenize.COMMENT:
                new = convert_body(sval, None, True, True)
                if new != sval:
                    patches.append((start, end, new))
                continue
    except tokenize.TokenError as e:
        print("TOKEN ERROR %s : %s" % (path, e), file=sys.stderr)
        return None
    # base non modifiee : pas de patch ; verifie
    if not patches:
        return None
    offsets = [0]
    for line in text.splitlines(keepends=True):
        offsets.append(offsets[-1] + len(line))
    regions = sorted(
        (offsets[srow - 1] + scol, offsets[erow - 1] + ecol, new)
        for (srow, scol), (erow, ecol), new in patches
    )
    out = []
    pos = 0
    for a, b, new in regions:
        out.append(text[pos:a])
        out.append(new)
        pos = b
    out.append(text[pos:])
    with io.open(path, "w", encoding="utf-8", newline="") as f:
        f.write("".join(out))
    return path


if __name__ == "__main__":
    changed = []
    for root in sys.argv[1:]:
        if os.path.isfile(root) and root.endswith(".py"):
            r = process(root)
            if r:
                changed.append(r)
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in {"venv", "__pycache__"}]
            for fn in filenames:
                if fn.endswith(".py"):
                    r = process(os.path.join(dirpath, fn))
                    if r:
                        changed.append(r)
    print("Fichiers modifies : %d" % len(changed))
    for p in changed:
        print(" ", p)
