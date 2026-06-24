---
name: Nocturnal Clarity
colors:
  surface: '#10141a'
  surface-dim: '#10141a'
  surface-bright: '#353940'
  surface-container-lowest: '#0a0e14'
  surface-container-low: '#181c22'
  surface-container: '#1c2026'
  surface-container-high: '#262a31'
  surface-container-highest: '#31353c'
  on-surface: '#dfe2eb'
  on-surface-variant: '#d0c5af'
  inverse-surface: '#dfe2eb'
  inverse-on-surface: '#2d3137'
  outline: '#99907c'
  outline-variant: '#4d4635'
  surface-tint: '#e9c349'
  primary: '#f2ca50'
  on-primary: '#3c2f00'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#735c00'
  secondary: '#cac2e2'
  on-secondary: '#322d46'
  secondary-container: '#49435e'
  on-secondary-container: '#b9b1d1'
  tertiary: '#caced8'
  on-tertiary: '#2c3138'
  tertiary-container: '#aeb3bc'
  on-tertiary-container: '#40454d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#e7deff'
  secondary-fixed-dim: '#cac2e2'
  on-secondary-fixed: '#1d1830'
  on-secondary-fixed-variant: '#49435e'
  tertiary-fixed: '#dee2ec'
  tertiary-fixed-dim: '#c2c7d0'
  on-tertiary-fixed: '#171c23'
  on-tertiary-fixed-variant: '#42474f'
  background: '#10141a'
  on-background: '#dfe2eb'
  surface-variant: '#31353c'
typography:
  headline-xl:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0.01em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-padding-mobile: 24px
  container-padding-desktop: 64px
  gutter: 16px
  section-gap: 80px
  stack-sm: 12px
  stack-md: 24px
---

## Brand & Style
The brand personality is rooted in "Quiet Mysticism"—a sophisticated blend of introspective depth and editorial precision. It targets individuals seeking profound relationship insights through a lens of modern ritual and psychological clarity. 

The design style is **Editorial Minimalism** with **Glassmorphic** nuances. It prioritizes a vast sense of "meditative space" through generous margins and a restricted palette. Every interaction should feel intentional, avoiding rapid transitions or high-frequency feedback loops. The emotional response is one of grounded reflection: the UI acts as a silent, high-end sanctuary rather than a typical utility app.

## Colors
The palette is anchored by a "Deep Ink" background, providing a canvas of total stillness. 

- **Primary (Muted Gold):** Used sparingly for moments of insight, navigation icons, and delicate accents. It signifies value and wisdom.
- **Secondary (Lavender):** Used for soft interactive states, selection indicators, and reflective prompts. It provides a cooling, calming contrast to the gold.
- **Neutral/Surface:** The background is a solid #0A0E14. Sub-surfaces use #1A1F26 with very low opacity to maintain a sense of deep space.
- **Typography:** Headlines utilize off-white (#F5F5F5) for high legibility without harsh glare, while secondary text uses a muted slate to recede.

## Typography
The typography strategy relies on the tension between the classic, literary feel of **Playfair Display** and the functional, modern clarity of **Inter**.

- **Headlines:** Always set in Playfair Display. Large headings should use slightly tighter letter-spacing to feel more cohesive and "editorial."
- **Body Text:** Set in Inter with generous line-height (1.5x+) to ensure a comfortable, unhurried reading experience.
- **Labels:** Small labels and "ritual steps" are set in Inter Medium with increased letter-spacing and uppercase styling to denote a sense of ceremony and structure.

## Layout & Spacing
The layout philosophy is "Centric and Expansive." It uses a fixed grid for content to ensure the eye is never forced to travel too far across the screen, surrounded by a vacuum of deep ink space.

- **Desktop:** 12-column grid, max-width 1100px, centered. Gutters are 24px.
- **Mobile:** Single column with heavy side margins (24px) to emphasize the verticality of the "ritual."
- **Rhythm:** We use an 8px base unit but prioritize "Section Gaps" of 80px or more between major content blocks to prevent the UI from feeling cluttered or "app-like."

## Elevation & Depth
Depth is created through **Tonal Layers** and **Soft Luminescence** rather than traditional shadows.

1.  **Base:** The Deep Ink (#0A0E14) is the infinite floor.
2.  **Surface:** Containers use a subtle gradient from #1A1F26 to #0A0E14, or a semi-transparent blur (10-20px backdrop filter) to simulate a "veil."
3.  **Accents:** Instead of shadows, "elevated" elements may have a 1px border using #D4AF37 at 15% opacity. 
4.  **Glow:** For active ritual elements, a very faint, large-radius outer glow in Lavender (#BDB5D5 at 5% opacity) can be used to suggest a soft light source.

## Shapes
The shape language is "Softly Architectural." We avoid aggressive rounding to maintain a high-end, serious tone.

- **Standard Elements:** Small 4px (0.25rem) radius for buttons and input fields.
- **Cards/Modules:** 8px (0.5rem) radius to gently distinguish sections without appearing bubbly.
- **Divider Lines:** 1px width, often using a "fading" gradient at both ends to emerge and disappear into the background.

## Components
- **Buttons:** Primary buttons are ghost-style with a 1px Gold border and Gold text. On hover/active, they fill with a very subtle Gold wash (10% opacity). No heavy fills.
- **Chips/Tags:** Used for "Emotional State" selection. Small, lowercase Inter text with a Lavender bottom-border only.
- **Lists:** Items are separated by expansive vertical space and a 1px faded divider. Bullet points are replaced by small, 4px Gold diamonds.
- **Input Fields:** Bottom-border only (1px Lavender). Labels sit above the line in uppercase Inter (Label-md).
- **Cards:** Minimalist containers. No background fill by default; defined only by a 1px border or a subtle change in tonal depth.
- **Ritual Progress:** A thin, horizontal Lavender line at the top of the viewport, moving slowly to indicate progress through a clarity session.
- **Reflective Modals:** Center-aligned, utilizing backdrop blur (Glassmorphism) to dim the background ritual while focusing on a singular question.