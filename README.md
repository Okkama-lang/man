# Okkama reference

The Okkama standard library reference as a static site: **https://okkama-lang.github.io/man/**

The pages are generated from `okkama man`, so this is not a second documentation implementation: the doc
comments in the std sources are the source of truth. The interface is English. No analytics, remote fonts,
CDN, backend or external services.

The language itself lives in [Okkama-lang/okkama](https://github.com/Okkama-lang/okkama); the main site is
[okkama-lang.github.io](https://okkama-lang.github.io/).

## Rebuild for a release

Prerequisites: Node.js 18+, Python 3.9+ for the checks, and Okkama installed with its standard library.
Build with the released toolchain, so the site matches the version people download.

```sh
npm ci
OKKAMA_BIN=~/.local/bin/okkama npm run build   # cleans dist/ and source/markdown/ first
npm test                                        # every link, anchor and search target
git add -A && git commit -m "Reference for Okkama X.Y.Z" && git push
```

The generator runs the Okkama binary (`OKKAMA_BIN`, or `okkama` on `PATH`) once for the index and once per
module with an explicit `std/` prefix. It does not execute examples. A CLI failure aborts the build; never
commit an incomplete build. The current export comes from Okkama 0.6.3: 499 modules, 12,341 search entries.
Module versions are distinct from the binary version.

`okkama man` prints warnings for unresolved documentation links on stderr; they do not stop the build.

## Publishing

`dist/` is committed. A push to `main` runs `.github/workflows/pages.yml`, which repeats the checks and
deploys `dist/` to GitHub Pages. All links inside `dist/` are relative, so the site works under `/man/`
and straight from disk.

## Local preview

```sh
npm run preview   # http://127.0.0.1:8766
```

Or open `dist/index.html` directly: search and navigation work without a server. Clipboard access may be
restricted under `file:`; the Copy button then selects the code.

## Contents

- `build.mjs`: CLI export and HTML generation with pinned Marked.
- `source/app.js`, `source/style.css`: interaction and responsive styles.
- `source/manifest.json`: build metadata (version, counts, time).
- `check.py`: checks every HTML link, duplicate anchors, all search destinations and export counts.
- `dist/`: the published site.
- `source/markdown/`, `source/index.md`: the raw Markdown export, regenerated on every build and not committed.

## Features

Nested module tree (including modules which are also directory parents); search across module names,
declarations and actions; unique anchors for overloads; internal API badges; Okkama syntax colours; code copy;
responsive menu; keyboard search shortcut `/` and Escape to close.

Raw HTML in doc comments is rendered as text for safety. HTTP(S), mailto, anchor and explicit relative
Markdown links are supported; arbitrary URL schemes are not. Type names in the text are not yet resolved
across modules. The complete search index is loaded once (about 1–2 MB); there is no fuzzy search yet.
