# Messenger Light Restyle — Color Mapping Reference

Goal: convert the app's hardcoded **dark** theme to the light **Messenger-style**
reference design. The design tokens already exist in `tailwind.config.js`:

| Token            | Hex       | Use                                            |
|------------------|-----------|------------------------------------------------|
| `bg-canvas`      | `#e8ebf0` | outer app background (pale blue-gray)          |
| `bg-panel`       | `#ffffff` | white rounded panels / cards                   |
| `bg-fill`        | `#f2f2f7` | input fields, hover fills                      |
| `text-ink`       | `#1d1d1f` | primary text (near-black)                      |
| `text-ink-soft`  | `#8e8e93` | secondary text / timestamps                    |
| `border-hairline`| `#e5e5ea` | borders & dividers                             |
| `bg-brand` / `text-brand` | `#007aff` | primary blue (sent msg, send btn, active) |
| `bg-accent`      | `#5b5fc7` | indigo (selected list item, primary avatars)   |
| `text-online`    | `#34c759` | available / online green                       |
| `bg-alert`       | `#ff3b30` | red badge                                      |
| rounded-`panel` 16px, rounded-`bubble` 18px | | container / bubble radius      |
| shadow-`card`, shadow-`float` | | panel + elevated shadows                    |

## Deterministic token map (safe — applied by script)

These dark surface/border/secondary-text classes map 1:1 and are NEVER correct
on a light design, so they are replaced globally **unless prefixed with `dark:`**:

```
bg-gray-900            -> bg-canvas
bg-gray-800            -> bg-panel
bg-gray-700            -> bg-fill
bg-gray-600            -> bg-fill
hover:bg-gray-800      -> hover:bg-fill
hover:bg-gray-700      -> hover:bg-fill
hover:bg-gray-600      -> hover:bg-hairline
border-gray-800        -> border-hairline
border-gray-700        -> border-hairline
border-gray-600        -> border-hairline
hover:border-gray-600  -> hover:border-gray-300
hover:border-gray-500  -> hover:border-gray-300
divide-gray-800        -> divide-hairline
divide-gray-700        -> divide-hairline
text-gray-300          -> text-ink
text-gray-400          -> text-ink-soft
text-gray-500          -> text-ink-soft
hover:text-gray-300    -> hover:text-ink
placeholder-gray-400   -> placeholder-ink-soft
placeholder-gray-500   -> placeholder-ink-soft
ring-gray-700          -> ring-hairline
```

## Contextual cases (require reasoning — handle per file)

- **`text-white`**: KEEP when it sits on a colored button/badge/avatar
  (`bg-brand`, `bg-accent`, `bg-sky-*`, `bg-blue-*`, `bg-red-*`, `bg-green-*`,
  gradients). CHANGE to `text-ink` when it was primary text on a former
  `bg-gray-800/900` panel (now white) — otherwise it goes invisible.
- **`hover:text-white`** already mapped to `hover:text-ink` by script is correct
  for icon/text rows; if the hover target is a colored button, revert to
  `hover:text-white`.
- **Modal overlays** (`bg-gray-900 bg-opacity-75`, `bg-black/50`): keep a dark
  translucent scrim — change to `bg-black/40` for consistency. Do NOT turn the
  scrim white.
- **`dark:` variants**: leave untouched (dark mode still supported).
- **Skeletons/shimmer** using `bg-gray-700/800`: map to `bg-fill` / `bg-hairline`
  so placeholders read on white.

## Verification
- `npx tsc --noEmit` (or `npm run build`) must pass.
- Visually: page bg pale blue-gray, panels white & rounded, text readable,
  primary actions blue, no white-on-white or black-on-black.
