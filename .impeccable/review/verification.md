# Map visual redesign verification

- Scope: CollectionMap markup, its exclusive stylesheet, conditional map shell class and stylesheet import. No API, business, calculation, fixture, route or persistence changes; no dependencies added.
- Build: TypeScript + Vite production build passes. Existing >500 kB JavaScript chunk advisory remains (574.78 kB); no bundle restructuring in this presentation task.
- Tests: all 117 existing tests across 17 files pass, including amount validation, exact money, payment retry idempotency, coordinate validation and backend error behavior.
- Browser: route selection updates route query and counts; overdue/soon filters; search; empty recovery; list selection and map marker selection; Enter on client row; recenter; payment modal open/cancel; manual location draft/cancel. No payment submitted and no location saved.
- Scope isolation: navigating to Cartera removes map-page-shell; its original horizontal navigation remains.
- Responsive: 1440×900, 1280×720, 768×1024, 390×844. Full-page evidence includes resting workspace, list and client detail.
- Contrast: soon pin #8c6a2e with white text = 4.98084:1; computed browser colors confirmed. Independent reviewer resolved the sole contrast fix and returned `ship` for that correction and its regression check.
- Limits: physical GPS permission/accuracy and production payment submission were not exercised. Existing source configuration and demo/live selection are unchanged.
