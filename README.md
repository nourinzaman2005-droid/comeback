# ComeBack

ComeBack is a local-first, clinician-connected digital companion for the ICC Return to Play Post-Pregnancy Guidelines. It is designed to make a player's return journey understandable, measurable, and easy to share with her clinician.

The prototype is not a medical device and never medically clears a player. Stage progression requires clinician approval. Raw camera video stays on the player's device.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for the player app and `http://localhost:3000/clinician` for the clinician dashboard. The two-minute demo and same-device clinician approval work without external credentials through IndexedDB.

## Checks

```bash
npm run lint
npm test
npm run build
```

The production frontend is deployed to GitHub Pages at
`https://nourinzaman2005-droid.github.io/comeback/`. The Render Blueprint in
`render.yaml` provisions the Node API and PostgreSQL database. See
`docs/TEAM_TASKS.md` for contributor ownership, `docs/TIER_3_4.md` for deployment
instructions, and `CLAUDE.md` for project decisions and safety rules.

The cited Groq explanation layer and localisation guardrails are documented in `docs/TIER_5_6.md`. A Groq key is optional because the safe grounded fallback remains functional without one.
