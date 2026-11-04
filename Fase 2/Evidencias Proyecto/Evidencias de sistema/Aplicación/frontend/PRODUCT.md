# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Four audiences, all confirmed by the user:

- **Electrical engineers / technicians**: review power quality (THD, power factor, short circuit, compensation) in the field or at the office, several times a day.
- **Control-room operators**: keep the app open on a large screen for a whole shift, watch live alerts and react to incidents.
- **Management / client (INDUC TECH)**: open it occasionally to check overall status, KPIs and standards compliance; need to understand it quickly without being experts.
- **Capstone evaluators**: the app is presented in a demo/defense; it must look professional and explain itself.

## Product Purpose

PowerGuardian Pro is an intelligent monitoring and diagnostics system for electrical power quality in industry and mining. It ingests three-phase measurements per equipment unit, detects anomalies against configured thresholds, raises incidents, and derives engineering analyses (powers, harmonics, compensation, short circuit). Success: a user knows within seconds whether every unit is healthy and, if not, what is wrong and where to look next.

## Positioning

Live three-phase measurements are turned into standards-referenced diagnosis (IEC 61000, IEEE 519, IEC 60909, NFPA 70E) and an actionable compensation result, in one place, per equipment unit, in real time.

## Operating Context

- Data arrives live: an embedded simulator in the backend generates one measurement per active unit per second and pushes it over SSE; real devices can POST measurements too.
- Sessions use a JWT that expires (currently 30 minutes); expiry returns the user to login.
- Equipment units are selected per screen and the selection is shared across tabs.

## Capabilities and Constraints

- Stack: React 19 + Vite + TypeScript, Recharts for charts, Tailwind v4 available, FastAPI backend.
- Routes that must keep working: login, Panel Principal (dashboard), Parametros Electricos, Analisis Armonicos / THD, Forma de Onda Trifasica (canvas oscilloscope + simulator scenario control), Tendencias Electricas, Compensacion Activa, Cortocircuito / Proteccion, Equipos, Incidencias.
- Behaviors that must keep working: live updates on every screen, the persistent status field on the dashboard (the 5 s pop-up was removed by user request), clickable dashboard cards that navigate to the detail tab, editable installation parameters, incident acknowledge/resolve.
- Analyses for harmonics spectrum, short circuit and arc flash are simplified estimates and must stay labeled as such.

## Brand Commitments

- Name "PowerGuardian Pro" and "INDUC TECH" stay visible as identity.
- Status semantics stay green / yellow / red for ok / warning / critical in readings and alerts.
- Standards references (IEC 61000, IEEE 519, IEC 60909, NFPA 70E) stay visible in the interface.
- Light and dark mode, with a clickable toggle in the top-right corner (user request).

## Evidence on Hand

- Client prototype: `../prototipo/prototipo.html` (content and calculations source, not a visual authority).
- No logo file, customer list, testimonials or certifications exist in the repo; none may be invented.

## Product Principles

1. Status first: the healthiest path to "is everything OK?" is one glance.
2. Every number has its unit, its limit and its standard next to it.
3. Live, not refreshed: values move as measurements arrive.
4. Readable on a control-room screen across the room and on a laptop in the field.
5. Explain itself to a non-expert without slowing down the expert.

## Accessibility & Inclusion

The user explicitly rejected tiny labels (8-9 px). Status must not rely on color alone (pair color with text/icon). Long-shift use: comfortable in both light and dark themes.

## Anti-references (confirmed by user)

- Neon / "gamer" look: glows and near-black backgrounds with fluorescent accents (the current design).
- Overloaded screens where many cards and numbers compete with no clear first read.
- Generic admin-template look without industrial product character.
