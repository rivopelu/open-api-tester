# Max API Studio Design System

The product adapts Bitech's modern, minimal, professional system to the existing dark purple editor.

## Color

- Canvas: `#11111b`
- Surface: `#1e1e2e`
- Raised surface: `#24273a`
- Subtle surface: `#181825`
- Primary: `#89b4fa`
- Primary strong: `#74a7f5`
- Purple: `#cba6f7`
- Teal: `#94e2d5`
- Text: `#cdd6f4`
- Secondary text: `#a6adc8`
- Muted text: `#7f849c`
- Border: `#313244`
- Success: `#a6e3a1`
- Warning: `#f9e2af`
- Error: `#f38ba8`

## Typography

- Headlines: Sora, weights 600-700.
- Body and controls: Manrope, weights 400-700.
- Code, endpoint paths, and measurements: JetBrains Mono.
- Use `Typography` variants rather than one-off font sizing in new UI.

## Shape And Depth

- Controls: 0px radius (flat design language, square corners throughout).
- Cards and larger surfaces: 0px radius.
- Prefer tonal surface separation; use soft offset shadows only for raised elements.
- Focus rings use primary blue and remain visible on every dark surface.

## Grid Panels

Seamless bordered grid using `GridPanel` + `GridCell` (from `src/components/ui/GridPanel.tsx`).

### Technique

```
Container: border-l + border-t  (outer frame)
GridCell:  border-r + border-b  (internal grid lines)
```

Container is a `grid` with no background. Each GridCell carries `bg-surface`, `border-r`, and `border-b`. The result:

- **Outer frame**: container's `border-l` + `border-t` plus the last row's `border-b` and last column's `border-r` close the rectangle.
- **Internal dividers**: `border-r` on each cell in a row + `border-b` on each cell in a column form seamless grid lines with no double borders.
- **Empty slots in last row are invisible**: no GridCell = no border, no background. The page `bg-base` shows through — no "extra colored block" at the end.
- **No gap-px / no bg-base hack**: border-based dividers avoid the common pitfall where `gap-px` plus a container background paints empty grid slots a different color.

### Rules

1. **Every direct child of GridPanel must be a GridCell.** Never put a bare `<div>` inside GridPanel — it won't get border or background.
2. **Column count must match item count** (or be fewer). If you have 2 stats, use `grid-cols-2`, not `grid-cols-4`. Empty columns create an open frame edge (no right border on the last filled cell, but no container border to close it).
3. **Last-row spanning**: for empty-state or full-width content, add `sm:col-span-2 lg:col-span-4` (etc.) on the GridCell so it fills the row and gets its own borders correctly.
4. **Hover state on grid cells**: use `hover:bg-card` (raised surface) not `hover:bg-mantle` (not in the theme palette).

### Common mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Bare `<div>` inside GridPanel | No border, wrong background | Wrap in `<GridCell>` |
| `grid-cols-4` with 2 items | Long horizontal line (open frame) | Match column count to items, or use fewer columns |
| `gap-px` + `bg-border`/`bg-base` on grid | Empty slots colored differently | Use border-based technique instead |
| `[&>*]:bg-surface` on grid container | Wrapper div gets painted, doubles up | Use explicit GridCell wrapper instead |

## Spacing

Use a 4px base with primary steps `4, 8, 12, 16, 24, 32, 48, 64`.

## Components

- Buttons: primary, secondary, outline, ghost, danger; sizes sm, md, lg.
- Cards: standard, elevated, featured; padding none, sm, md, lg.
- Inputs: labels, helper text, errors, disabled and focus states.
- Tags remain compact and informational; avoid decorative pill overload.
- Icons should come from one outline icon system. Text glyphs are acceptable only for literal code or method content.

## Motion

Use short 150-220ms transitions. Motion communicates state and hierarchy; it never blocks editor work. Respect `prefers-reduced-motion`.
