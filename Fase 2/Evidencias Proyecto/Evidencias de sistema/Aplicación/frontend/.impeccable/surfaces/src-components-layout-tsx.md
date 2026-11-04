---
version: 1
slug: "src-components-layout-tsx"
primary_target: "src/components/Layout.tsx"
related_targets: ["src/pages/Dashboard.tsx","src/index.css"]
---

# App shell and all working screens (Operate)

Scope: the whole authenticated app (Layout shell + every page) and Login. Visitor mode: Operate.
Audience: engineers, control-room operators, management/client, Capstone evaluators (see PRODUCT.md).
Task: know at a glance whether each unit is healthy, then drill into the right analysis tab.
Constraints: keep every route, every data point and every behavior; nothing shown today may be removed (user confirmed). Light and dark themes with a toggle top-right (user request).
User adjustment to the roll: keep the Boleta direction but use the canon card's dark slate rail and deep-sky accent instead of the light blue rail (user confirmed).

## Direction contract

THESIS: Each equipment unit reads like a utility statement: the current reading, its recent history and its limit, set on clean paper. Refuses the neon control-room dashboard with glowing tiles.

OWN-WORLD: Paper ground (#F6F7F4 light, #0E1620 dark), white or ink-blue sheets, one 1px rule value, dark slate navigation rail (#1F2937) with deep-sky accent (#0369A1), flat status fields (green/amber/red) with text labels, Public Sans with tabular numerals, no gradients, glows or colored side borders.

STORY: The user sees the unit's status sentence first, then each headline reading with its limit and history, then drills into the tab that explains it.

FIRST VIEWPORT: Left rail: brand, grouped navigation, logout. Top bar: page title and subtitle, live clock, standards badge, theme toggle at the far right. Dashboard: KPI strip (units, active, measurements, alerts), unit selector, readings sheet where each reading carries a bill-style history strip with its limit line, then gauges, then latest-readings table.

FORM: assigned direction 3 of 7 (utility statement), seed:42065de237970a22. Signature move: bill-style history bars under every headline reading, bars out of limit filled in the status color, limit as a ruled line. Raises: scale-only hierarchy (specimen), flat color fields (guide map), stamped incident states (ticket wallet), one 1px rule system (centre rail), focus reveals limit and standard (streaming wall).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
