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

See `docs/TEAM_TASKS.md` for contributor ownership, `docs/TIER_3_4.md` for the optional free Supabase deployment, and `CLAUDE.md` for project decisions and safety rules.
