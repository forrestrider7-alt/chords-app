# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server
npm run build     # production build → dist/
npm run preview   # preview production build
```

No test runner, no linter configured.

## Environment

Create `.env` in the project root:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Without these the app runs in **demo mode**: auth and cloud saves are disabled, `isConfigured` is `false`, and save operations are silently skipped. The UI still works fully for editing and previewing.

## Architecture

Single-page React + Vite app. No router. All song data lives in Supabase; the app is stateless between sessions.

### Data flow

```
rawText (textarea) → parseText() → blocks[]
                  → transposeText(offset) → transposed text
                  → SheetRenderer → DOM (chord-over-lyric lines)
```

`rawText` is the source of truth. The transpose `offset` (0–11 semitones) is applied on-the-fly at render time — it is **not** written back into `rawText`. When the user saves, the displayed key (`detectKey(transposeText(rawText, offset))`) is stored as `tone` in Supabase for display purposes only.

### Chord syntax (two forms, both parsed identically)

- `[Am]word` — bracket syntax; chord placed above the character at `word`
- `//Am word` — slash syntax; equivalent
- `{Section name}` or bare keyword (Куплет, Verse, etc.) — section header
- `@Am7 x02010` — custom fingering definition; consumed by the parser, not rendered as a lyric line

### Parser (`src/lib/parser.js`)

`parseText(raw)` → `{ blocks, customShapes }`.

- **lyric block**: `{ type:'lyric', chordRow, lyricRow, hasChords }` — both rows are monospace strings; chords are placed by character position, shifted right if they'd overlap.
- **section block**: `{ type:'section', name }`.
- **gap block**: `{ type:'gap' }` — blank line.

`chordRow`/`lyricRow` use `padEnd` for monospace alignment. Do not change this to pixel-based layout; it must survive copy-paste and print.

### Supabase schema

`songs` table: `id, user_id, title, body, tone, created_at, updated_at`. RLS policy is **shared library** — any authenticated user can read/write/delete any song. The schema SQL is at `supabase_schema.sql`.

### PDF export (`src/lib/pdfExport.js`)

Uses `html2canvas` + `jspdf`. Captures `sheetRef.current` (the `<SheetRenderer>` instance in `App.jsx`). The separate `#print-view` div is used for `window.print()` (CSS `@media print`), not for PDF export.

### Chord DB (`src/lib/chordDb.js`)

~40 built-in chords as `{ name, frets: string[6] }` where each fret is `'x'`, `'0'`, or a digit. Custom `@`-definitions from the song text override these in `SheetRenderer` and `ChordCtor`.

## Key constraints

- **Keep it a single deployable bundle** — no SSR, no API routes. The `vercel.json` is minimal (SPA rewrites only).
- **Monospace rendering is intentional** — `SheetRenderer` uses `IBM Plex Mono`. Chord alignment depends on character-width equality; do not switch to a proportional font for chord/lyric rows.
- **Transpose offset is ephemeral** — never write the transposed text back to `rawText` or to the DB `body` field. Only `tone` (the detected key string) is persisted.
- **`isConfigured` guards all Supabase calls** — always check it before any auth or DB operation to keep demo mode working.
