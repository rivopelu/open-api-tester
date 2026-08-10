# Modern API Studio Design System

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

- Controls: 8px radius.
- Cards and larger surfaces: 12px radius.
- Prefer tonal surface separation; use soft offset shadows only for raised elements.
- Focus rings use primary blue and remain visible on every dark surface.

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
