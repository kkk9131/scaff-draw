# Codex SDD Flow

Run the Codex CLI prompts in the following order:

1. `/sdd-steering` — Understand the product context, stakeholders, and goals.
2. `/sdd-requirements` — Define functional and non-functional requirements plus acceptance criteria.
   Update `.sdd/description.md` with the latest problem and feature context before you run this prompt.
   Run `/sdd-highway` here if you want the CLI to fast-track `/sdd-design`, `/sdd-tasks`, and `/sdd-implement` for you. Skip steps 3-5 when you take this route.
3. `/sdd-design` — Plan the implementation approach, architecture, and trade-offs.
4. `/sdd-tasks` — Break the design into actionable tasks with clear ownership.
5. `/sdd-implement` — Implement and test the solution according to the agreed tasks.
6. `/sdd-archive` — Capture outcomes, lessons learned, and next steps.

Need to refresh the prompts or this guide later? Re-run `npx spec-driven-codex init` (to keep existing prompt customisations) or use `npx spec-driven-codex upgrade` to force-install the latest templates.
