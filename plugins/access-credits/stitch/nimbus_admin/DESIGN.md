# Design System Specification: High-End Editorial Admin

## 1. Overview & Creative North Star

### Creative North Star: "The Digital Atelier"
This design system moves away from the rigid, industrial feel of traditional admin dashboards toward a "Digital Atelier" aesthetic. It treats agent management—specifically complex tasks like Telegram group orchestration and prompt editing—not as data entry, but as a craft. 

The system breaks the "template" look by leveraging **intentional asymmetry** and **tonal depth**. Instead of boxing every element into a uniform grid, we use expansive breathing room and varying card widths to create a rhythmic flow. This editorial approach ensures that high-priority management tools feel authoritative and premium, while secondary settings recede into the background.

---

## 2. Colors

The palette is rooted in deep blues and slate grays, creating a calm, high-trust environment for enterprise operations.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning content. Boundaries must be defined solely through background color shifts. For example, a card (using `surface-container-lowest`) should sit on a section background (`surface-container-low`) without a stroke. This creates a more organic, high-end feel.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to define depth:
- **`background` (#f7f9fb):** The base canvas.
- **`surface-container-low` (#f2f4f6):** Secondary regions or sidebar backgrounds.
- **`surface-container-lowest` (#ffffff):** The "primary action" layer. Use this for main content cards to make them "pop" against the canvas.
- **`surface-dim` (#d8dadc):** Used for modal backdrops or heavy-duty disabled states.

### The "Glass & Gradient" Rule
For floating elements, such as global notifications or hover-state menus, use **Glassmorphism**. Apply `surface` colors with a 70-80% opacity and a `backdrop-blur` of 12px-20px. 

### Signature Textures
Main CTAs and Hero states should utilize a subtle linear gradient from `primary` (#000000) to `primary-container` (#00174b). This adds a "lithic" weight to buttons that flat colors cannot replicate.

---

## 3. Typography

The typography system pairs **Manrope** (Display/Headlines) with **Inter** (UI/Body) to balance editorial flair with high-performance readability.

- **Display & Headline (Manrope):** Chosen for its geometric precision and modern "tech-humanist" feel. Use these for agent names, group titles, and main headers.
- **Title, Body, & Label (Inter):** A workhorse font for complex settings. Use `body-md` (0.875rem) for most prompt editing fields to maintain density without sacrificing legibility.
- **Hierarchy through Contrast:** Dramatic scale jumps between `headline-lg` (2rem) and `label-sm` (0.6875rem) create a professional, "published" look that guides the user’s eye to what matters most.

---

## 4. Elevation & Depth

We eschew "Material" style drop shadows for **Tonal Layering**.

- **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. The change in hex code provides enough visual distinction to imply a "lift" without visual clutter.
- **Ambient Shadows:** Where floating is required (e.g., a Telegram group selection popover), use a "Soft-Focus" shadow: `0px 12px 32px rgba(25, 28, 30, 0.06)`. The color is a low-opacity tint of `on-surface` (#191c1e).
- **The "Ghost Border" Fallback:** If a border is essential for accessibility in input fields, use `outline-variant` (#c6c6cd) at 20% opacity. 100% opaque borders are strictly forbidden.

---

## 5. Components

### Buttons
- **Primary:** Linear gradient (`primary` to `primary-container`), roundedness `md` (0.375rem). Text: `on-primary`.
- **Secondary:** Surface-only. Use `secondary-container` (#d0e1fb) with `on-secondary-container` (#54647a) text. No border.
- **Tertiary:** Text-only in `primary` (#000000). Use for "Cancel" or "Go Back."

### Cards & Lists
- **The No-Divider Rule:** Forbid the use of horizontal rules. Use `spacing-6` (1.5rem) or `spacing-8` (2rem) of white space to separate list items.
- **Layout:** Use `xl` (0.75rem) roundedness for main container cards to soften the enterprise feel.

### Input Fields (Prompt Editor)
- **Container:** Use `surface-container-highest` (#e0e3e5) for the background of text areas.
- **State:** When active, shift background to `surface-container-lowest` (#ffffff) and apply a subtle "Ghost Border."
- **Label:** Always use `label-md` in `on-surface-variant` (#45464d) for clear context.

### Telegram Group Chips
- **Status Chips:** Active groups should use `on-tertiary-container` (#008cc7) background with `on-tertiary` (#ffffff) text. Inactive groups use `secondary-container`. Use `full` (9999px) roundedness.

---

## 6. Do's and Don'ts

### Do
- **Use Nested Surfaces:** Place your prompt editor (lowest) inside a management card (low) sitting on the dashboard (background).
- **Embrace Asymmetry:** Let the sidebar be significantly narrower than the content area, but give the content area generous 4rem (`spacing-16`) horizontal padding.
- **Prioritize Motion:** Use subtle 200ms ease-in-out transitions for surface color changes on hover.

### Don't
- **Don't use 1px Dividers:** They create visual "noise" that devalues the premium feel.
- **Don't use pure black shadows:** Always tint your shadows with the `on-surface` token.
- **Don't crowd the interface:** If a Telegram management screen feels "busy," increase the `spacing` tokens between cards rather than adding more borders.
- **Don't use standard blue:** Use the `primary-container` (#00174b) deep blue for a more authoritative, "OpenCloud" enterprise tone.