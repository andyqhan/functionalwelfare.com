# Self-hosted Cardo (subset)

These `.woff2` files are subsets of the **full** Cardo (David Perry, v1.04 —
`Cardo104s.ttf` / `Cardob101.ttf` / `Cardoi99.ttf`, from the original release,
*not* the Google Fonts build). The full font is the only version that ships true
small caps (`smcp`) and oldstyle figures (`onum`); Google's build strips both.

Only the **regular** face carries OpenType features — and only these: `smcp`
(small caps), `onum` (oldstyle figures), `pnum` (proportional), `sups`/`subs`
(real super/subscripts, used for footnote markers), plus `ccmp`/`liga`. Notably
it has **no `c2sc`** (caps→small-caps) and no `lnum`/`tnum` (lining is the
default; there are no tabular figures). The **bold** face has *no* features at
all; **italic** has only `onum`/`pnum`/`liga`. Consequences in the CSS: small
caps inside bold/italic drop to the regular face (`.sc`/`.ca` rules in
`global.css`), and acronym small caps lower-case the run before applying `smcp`
since `c2sc` is unavailable.

We subset to Latin + the punctuation/symbols the paper actually uses, so each
face is ~40–50 KB instead of 0.6–1.1 MB. CJK in model-output examples and emoji
fall back to system fonts — Cardo has no glyphs for them.

## Regenerate

Needs `fonttools` + `brotli` (`pip install fonttools brotli`). Point at the
original TTFs, then:

```bash
# U+2070-2079 / U+2080-2089 are the superscript/subscript digit blocks: the
# footnote markers render the literal superior glyphs (¹²³…), because Cardo's
# `sups` feature can't be triggered for a bare-digit run (no DFLT script — see
# below), so we pull the characters in directly via the cmap instead.
UNICODES="U+0020-007E,U+00A0-00FF,U+0100-017F,U+0300-036F,U+2010-2027,U+2030-2033,U+2039-203A,U+2044,U+2070-2079,U+2080-2089,U+20AC,U+2122,U+2190-2193,U+2212"

# Regular keeps smcp (true small caps) + oldstyle figures. (sups/subs/lnum/tnum
# are listed for intent but unreachable/absent — the super/subscript glyphs come
# in through the unicode ranges above, not the features.)
pyftsubset Cardo104s.ttf --output-file=cardo-regular.woff2 --flavor=woff2 \
  --layout-features+=smcp,sups,subs,onum,lnum,pnum,tnum --unicodes="$UNICODES"

# Bold/italic have no usable smcp; drop the unreachable small-cap glyphs.
pyftsubset Cardob101.ttf --output-file=cardo-bold.woff2 --flavor=woff2 \
  --layout-features+=onum,lnum,pnum,tnum --unicodes="$UNICODES"
pyftsubset Cardoi99.ttf  --output-file=cardo-italic.woff2 --flavor=woff2 \
  --layout-features+=onum,lnum,pnum,tnum --unicodes="$UNICODES"
```

If the `.tex` introduces new characters (the convert summary / a missing glyph
in the rendered page will tell you), extend `$UNICODES` and re-run. The exact
in-use character set can be recomputed by scanning `src/generated/**/*.json`.

`@font-face` declarations live in `src/styles/global.css`; the three faces are
preloaded in `src/layouts/PaperLayout.astro`.
