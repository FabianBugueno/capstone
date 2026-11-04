---
name: PowerGuardian Pro
description: Power-quality monitoring for industry and mining, set as a utility statement on clean paper.
colors:
  paper: "#f6f7f4"
  panel: "#eef1f0"
  sheet: "#ffffff"
  sheet-alt: "#fafbf9"
  ink: "#16202b"
  ink-2: "#44515e"
  ink-3: "#5b6875"
  rule: "#d3dae0"
  rule-strong: "#b8c2cc"
  deep-sky: "#0369a1"
  deep-sky-deep: "#075985"
  deep-sky-wash: "#e6f0f7"
  teal: "#0f766e"
  ok: "#1e7b46"
  ok-wash: "#e7f3ec"
  warn: "#8a5f00"
  warn-wash: "#fbf1dc"
  danger: "#c0392b"
  danger-wash: "#fbe9e6"
  phase-1: "#1f5fa8"
  phase-2: "#6d4fc2"
  phase-3: "#0f766e"
  rail: "#1f2937"
  rail-line: "#334155"
  rail-text: "#e5e7eb"
  rail-muted: "#a3acb9"
  rail-hover: "#2b3647"
  paper-dark: "#0e1620"
  panel-dark: "#121c27"
  sheet-dark: "#16202b"
  sheet-alt-dark: "#131c26"
  ink-dark: "#e6edf3"
  ink-2-dark: "#b3c0cd"
  ink-3-dark: "#8d9cad"
  rule-dark: "#263443"
  rule-strong-dark: "#34465a"
  sky-dark: "#5aa9e6"
  sky-wash-dark: "#16304a"
  ok-dark: "#4cc38a"
  ok-wash-dark: "#12302a"
  warn-dark: "#e0a526"
  warn-wash-dark: "#352a12"
  danger-dark: "#f07167"
  danger-wash-dark: "#3a1c1f"
  phase-1-dark: "#6aa8ec"
  phase-2-dark: "#a993ec"
  phase-3-dark: "#4fb8ae"
typography:
  display:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  title:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title-sheet:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.45
  body:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  label:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.45
  caption:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.45
rounded:
  hist: "1px"
  badge: "4px"
  control: "6px"
  tile: "8px"
  sheet: "10px"
  full: "50%"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.deep-sky}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.control}"
    padding: "11px"
  button-primary-hover:
    backgroundColor: "{colors.deep-sky-deep}"
  button-status:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-icon:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    size: "40px"
  input-field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  input-inline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.badge}"
    padding: "5px 8px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.rail-text}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  nav-item-hover:
    backgroundColor: "{colors.rail-hover}"
  nav-item-active:
    backgroundColor: "{colors.deep-sky}"
    textColor: "{colors.sheet}"
  chip-ok:
    backgroundColor: "{colors.ok-wash}"
    textColor: "{colors.ok}"
    rounded: "{rounded.badge}"
    padding: "3px 9px"
  chip-warn:
    backgroundColor: "{colors.warn-wash}"
    textColor: "{colors.warn}"
    rounded: "{rounded.badge}"
    padding: "3px 9px"
  chip-err:
    backgroundColor: "{colors.danger-wash}"
    textColor: "{colors.danger}"
    rounded: "{rounded.badge}"
    padding: "3px 9px"
  chip-info:
    backgroundColor: "{colors.deep-sky-wash}"
    textColor: "{colors.deep-sky}"
    rounded: "{rounded.badge}"
    padding: "3px 9px"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "18px 20px"
  status-field-ok:
    backgroundColor: "{colors.ok-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "14px 18px"
  status-field-warn:
    backgroundColor: "{colors.warn-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "14px 18px"
  status-field-err:
    backgroundColor: "{colors.danger-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "14px 18px"
---

# Design System: PowerGuardian Pro

## Overview

**Creative North Star: "The Utility Statement"**

Every equipment unit reads like a printed utility bill: the current reading set large, its limit written beside it in words, and its recent history drawn as a strip of bars under a ruled limit line. The sheets sit on a clean paper ground with a faint millimetre grid, and the navigation is a dark slate rail that holds the brand and the grouped routes. The interface is dense but ordered. One status sentence comes first, then the readings, then the analysis tabs.

Status is flat colored fields, never light. Green, amber and red appear as washes and solid tags, and each one always carries a word, so color is never the only signal. Numbers are tabular everywhere, so live values tick in place without jitter. Depth is soft paper layering: low ambient shadows under sheets and a translucent top bar. There are no gradients, glows or colored side borders. This rejects the neon control-room look the product replaced, the near-black ground with fluorescent accents, and the generic admin template.

Light and dark are two printings of the same statement. Dark mode swaps the paper for ink-blue (`paper-dark`) and lifts the status hues for contrast. The slate rail and its deep-sky active item stay the same in both themes.

**Key Characteristics:**
- Paper ground, white or ink-blue sheets, one 1px rule value for every divider.
- Dark slate rail with a single deep-sky active state.
- Bill-style history strip with a limit band under every headline reading.
- Flat status fields, each paired with a word chip in a fixed-height slot.
- Public Sans with tabular numerals throughout; hierarchy by scale and weight, not color.
- Motion confirms that data arrived and is fully disabled under reduced motion.

## Colors

A cool paper-and-ink palette with one deep-sky accent and three flat status hues; the hex values are the canonical source and live as CSS custom properties per theme.

### Primary
- **Deep Sky** (`deep-sky`): the only interactive accent. Used for the active rail item, the login submit button, focus outlines, the caret, info chips and clickable-sheet hover borders. In dark theme content uses `sky-dark`, while the rail active item keeps `deep-sky`.
- **Deep Sky Deep** (`deep-sky-deep`): hover state of the primary button.
- **Deep Sky Wash** (`deep-sky-wash`): info chip and alert fill, hover fill for clickable KPI cells and gauges.

### Secondary
- **Phase Blue, Phase Violet, Phase Teal** (`phase-1`, `phase-2`, `phase-3`): the three-phase line colors L1, L2 and L3 in trend charts, the oscilloscope and the login waveform. They are reserved for phases and are never used for status.

### Tertiary
- **Status Green** (`ok`, `ok-wash`): within limit, active, live.
- **Status Amber** (`warn`, `warn-wash`): the warning band, labeled "Atención".
- **Status Red** (`danger`, `danger-wash`): over or under a limit, labeled "Fuera de límite", and critical incidents.

### Neutral
- **Paper** (`paper`): the page ground and inline field fill, carrying the millimetre-grid texture.
- **Sheet** (`sheet`, `sheet-alt`): cards, KPI strip, login form, table row hover.
- **Ink** (`ink`, `ink-2`, `ink-3`): primary text and values, labels, units and secondary text.
- **Rule** (`rule`, `rule-strong`): every 1px divider, sheet border and table header underline.
- **Slate Rail** (`rail`, `rail-line`, `rail-text`, `rail-muted`, `rail-hover`): navigation rail and the login brand panel. The rail is `#1F2937` in both themes by user request.

### Named Rules
**The Word With Every Color Rule.** Every color-coded value carries a word: "Atención" for amber, "Fuera de límite" for red, or a limit sentence such as "dentro de límite". The word sits in a fixed-height slot, so a chip that appears or disappears never moves the layout.

**The Red Means Out Rule.** Red is used only for a value outside its limit or a critical incident. Amber is used only for the warning band. A value is never shown amber when it is out of limit.

**The Phase Is Not Status Rule.** Phase colors identify L1, L2 and L3 only. Never use them to signal health.

## Typography

**Display Font:** Public Sans Variable (with system-ui, Segoe UI, sans-serif)
**Body Font:** Public Sans Variable
**Label/Mono Font:** Public Sans with `font-variant-numeric: tabular-nums` set on the whole document; there is no separate mono face.

**Character:** One sober civic sans in many weights (400 to 800). It reads like a printed statement: large confident numbers, small plain labels.

### Hierarchy
- **Display** (700, 34px, 1.1, -0.02em): headline reading values in the readings sheet; the unit follows at 15px/500 in `ink-3`. Login brand title also uses 34px at 800.
- **Headline** (700, 30px, 1.05, -0.02em): KPI strip values, 26px on mobile.
- **Title** (700, 20px, -0.01em): top bar page title, 17px with ellipsis on mobile. Login form heading is 22px/700.
- **Sheet Title** (700, 15px): card titles.
- **Body** (400, 14px, 1.45): base text, table cells, status sentence, nav items at 500.
- **Label** (600, 13px): reading labels, KPI labels, gauge labels, form labels, top bar subtitle and clock.
- **Caption** (700, 12px): chips, table headers, limit lines, rail group labels at 600.

### Named Rules
**The Tabular Everything Rule.** All numerals are tabular. Live values must update without changing width.

**The Twelve Pixel Floor Rule.** Running text and labels stay at 12px or larger. The user rejected 8 to 9px labels.

## Layout

The app is a full-height flex shell: a 248px slate rail on the left and a main column with a 68px top bar over a scrolling content area. Content padding is 24px top and 28px sides on desktop, 16px on mobile. Sheets stack in a single column with a 12px gap on the dashboard. Paired sheets use 2-column and 3-column grids with a 16px gap, and the readings sheet is a 3-column grid of cells divided by 1px rules, not separate boxes.

The KPI strip is one sheet divided by vertical rules into four cells. Below 1100px the 3-column grids become 2 columns. Below 820px all grids become one column, KPI cells wrap two per row, the rail becomes an off-canvas drawer opened by a menu button with a dark veil, and the top bar hides the subtitle and the standards badge. The login is a two-column grid (brand panel 320 to 440px, form area) that stacks below 760px.

Rhythm is 6, 12, 16, 20 and 28px. Sheet padding is 18px by 20px. Reading rows have a fixed minimum height of 40px.

## Elevation & Depth

Depth is soft paper layering. Sheets rest on the paper with a low two-layer ambient shadow. The top bar is translucent (`sheet` at 88% with `backdrop-filter: saturate(1.4) blur(10px)`) over a 1px rule. The page ground and login form area carry a faint 24px millimetre grid (`#94a3b8` at 12% opacity), and the login brand panel a 28px white grid at 5%. There are no gradients and no glows.

### Shadow Vocabulary
- **Sheet rest** (`box-shadow: 0 1px 2px rgba(22,32,43,.06), 0 4px 14px rgba(22,32,43,.05)`; dark `0 1px 2px rgba(0,0,0,.3), 0 4px 14px rgba(0,0,0,.2)`): every sheet, KPI strip, status field and login form.
- **Sheet lifted** (`box-shadow: 0 2px 4px rgba(22,32,43,.08), 0 10px 24px rgba(22,32,43,.1)`; dark `0 2px 4px rgba(0,0,0,.35), 0 10px 24px rgba(0,0,0,.3)`): hover on clickable sheets, together with a 2px rise and a deep-sky border.
- **Top bar** (`box-shadow: 0 1px 0 var(--border), 0 6px 18px rgba(22,32,43,.04)`): translucent bar edge.
- **Drawer** (`box-shadow: 8px 0 32px rgba(0,0,0,.35)`): mobile rail only, when open.

### Named Rules
**The Paper Not Light Rule.** Depth comes from soft shadow and texture only. Never use gradients, glows or colored halos.

## Shapes

Corners are gently rounded and fixed by role: 10px for sheets and status fields, 8px for icon buttons and tiles, 6px for controls, nav items and tags, 4px for chips and inline fields, and 1px on the tops of history bars. Dots are full circles. Every divider and border uses a single 1px weight, solid except for limit lines, which are 1px dashed. Icons are an authored set on a 24px grid with a 1.75px round-capped stroke, drawn at 18px.

## Components

### Buttons
- **Shape:** gently rounded (6px); icon buttons 8px, 40px square.
- **Primary:** deep-sky fill, white 700 text, full width on the login form (11px padding). Hover goes to `deep-sky-deep`. A press scales to 0.98.
- **Status action:** sheet fill with a 1px border in the field's status hue; hover fills with that hue and white text.
- **Icon (theme toggle, menu):** 40px, sheet fill, 1px rule border; hover to paper fill and strong rule. The theme icon turns in (rotate -90deg and scale 0.6 to rest, 0.45s) on each switch.
- **In-content controls:** minimum 34px height and 6px radius; press scales to 0.97; disabled at 55% opacity.
- **Focus:** 2px deep-sky outline at 2px offset; on the rail, 2px white outline inset.

### Chips
- **Style:** 12px/700 text in the status hue on its wash, 1px border in the current text color, 4px radius, 3px by 9px padding.
- **State:** ok, warn, err and info variants. The live chip holds a green dot with an expanding ripple. Inside data rows the chip is 11px with 1px by 7px padding and shows only for warn ("Atención") and err ("Fuera de límite").

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** `sheet`.
- **Shadow Strategy:** Sheet rest; Sheet lifted on clickable hover (see Elevation).
- **Border:** 1px `rule`.
- **Internal Padding:** 18px by 20px.

### Inputs / Fields
- **Style:** login fields use a sheet fill, 1px `rule-strong` border, 6px radius and 10px by 12px padding. Inline toolbar fields (equipment selector, installation parameters) use a paper fill, 1px `rule` border, 4px radius, 13px text.
- **Focus:** border shifts to deep-sky with a 3px deep-sky ring at 22% mix on the login. Other controls use the 2px deep-sky outline.

### Navigation
- **Rail:** 248px slate panel. Brand block at the top (name 18px/800 white, tagline, version with a live dot, "INDUC TECH"). Group labels are 12px/600 muted. Items are 14px/500 with an 18px icon, 8px by 10px padding and 6px radius. Hover fills `rail-hover`. The active item is filled deep-sky with white 650 text and fades in from the hover color. Logout is a 1px-outlined button in the footer.
- **Top bar:** page title and subtitle at the left. At the right: status badge, standards badge, live tabular clock, and the theme toggle at the far right.
- **Mobile:** the rail slides in from the left (0.25s) over a dark veil.

### Status Field
The persistent status mechanism of the dashboard. It is a full-width flat field in the unit's status wash with a 1px border in the hue at 35% mix. A solid tag ("Normal", "Atención", "Crítico") sits at the left in white 800 text (ink-blue text in dark theme). Two lines follow: a bold unit sentence and an always-present "Ahora:" line naming the out-of-limit readings. A "Ver incidencias" action sits at the right. Both lines are single-line with ellipsis, so the field height never changes. It is announced with `aria-live="polite"`. There is no timed pop-up.

### Reading with History Strip (signature)
Each headline reading cell shows a 13px label, a 34px tabular value with its unit, a 12px limit line in status color that ends with a word ("dentro de límite", "fuera de límite", "sin dato"), and a 44px history strip. The strip is a row of bars with 2px gaps in neutral ink at 35%, with the newest bar in solid ink. Bars outside the limit fill red. A range limit draws a green band at 9% between two 1px dashed lines; a single limit draws one dashed line. The newest bar grows up from 20% height when it arrives, and the value ticks in (0.6s fade, lift and blur).

### Data Row
A 40px fixed-height row: label at the left, an optional word chip, the right-aligned tabular value in status color, and a fixed 34px unit column. Rows are divided by 1px rules.

### KPI Strip
One sheet split by rules into four cells. Each cell has an optional 40px tinted icon tile, a 30px value, a 13px label and an optional red sub-line. Clickable cells fill deep-sky wash on hover.

### Gauges and Charts
Gauges are a 240-degree arc with a 6px round-capped stroke over a `rule` track, with the value in the arc color. Only `stroke-dashoffset` animates (0.7s), so the arc never deforms. Live trend lines are 2px phase or accent lines with no dots and no per-point animation. They use fixed Y scales, a green limit band at 6%, and dashed reference lines labeled in a right gutter.

## Do's and Don'ts

### Do:
- **Do** pair every status color with a word, in a fixed-height slot.
- **Do** use red only for out-of-limit values and critical incidents, and amber only for the warning band.
- **Do** put the limit and its standard next to every headline number, with a history strip under it.
- **Do** divide sheets with the single 1px rule instead of nesting boxes.
- **Do** keep all numerals tabular and all text at 12px or larger.
- **Do** animate only transform, opacity, filter and stroke-dashoffset, with the `cubic-bezier(0.16, 1, 0.3, 1)` ease, and switch every animation off under `prefers-reduced-motion`.
- **Do** keep live charts on fixed Y scales with no per-point animation.
- **Do** keep the theme color transition limited to the moment of switching (0.3s, removed after 350ms).

### Don't:
- **Don't** use gradients, glows, neon accents or near-black grounds with fluorescent color.
- **Don't** use colored side borders on alerts or cards; status is a flat field.
- **Don't** use timed pop-ups or toasts for status; the persistent status field is the mechanism.
- **Don't** use phase colors to signal status.
- **Don't** let a chip, badge or message change a row's height.
