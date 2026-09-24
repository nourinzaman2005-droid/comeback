# Tier 3 and Tier 4 implementation

## Player journey

The root route supports two entry paths:

- `Try the 2-minute demo` seeds the Nourin persona for a repeatable presentation.
- `Set up my journey` collects consent, delivery date, delivery type, cricket role, and language.

The player can view the cited 6 Rs roadmap, complete a camera-guided movement check, answer the complete symptom screen, save the result, and wait for clinician review. Profile, check-ins, decisions, and the sync queue are stored in IndexedDB. The service worker runtime-caches visited app resources so the journey reloads offline.

## Clinician journey

Open `/clinician` in another tab on the same origin. The local demo adapter shares IndexedDB updates through `BroadcastChannel` and a window event. The dashboard provides:

- linked-player list;
- recent movement observations;
- highlighted symptom reports;
- approve or hold decisions;
- disabled approval whenever the latest check-in reports a symptom;
- immediate stage updates in the player tab.

This local adapter remains available for a resilient end-to-end competition demonstration. When the Render API URL is configured, the same actions also sync through PostgreSQL so a player and clinician can use separate devices.

## Render and PostgreSQL deployment

The repository contains a Render Blueprint that provisions the Node API and a PostgreSQL database without placing credentials in Git.

1. Open `https://render.com/deploy?repo=https://github.com/nourinzaman2005-droid/comeback` while signed in to Render.
2. Create the Blueprint resources from `render.yaml`.
3. Confirm the API health check at `https://comeback-api-nourin.onrender.com/health` reports `database: postgres`.
4. If Render assigns a different service URL, update `NEXT_PUBLIC_API_URL` in `.github/workflows/pages.yml` and push the change.
5. Optionally set `GROQ_API_KEY` for free-tier generated explanations. The cited deterministic fallback works without it.
6. Optionally set `RED_FLAG_WEBHOOK_URL`. The API sends the player identifier, test identifier, symptom codes, and time; it never sends camera media.

The competition deployment uses signed, expiring demo sessions and server-side role checks. The API rejects player-ID mismatches, clinician approval when symptoms are present, and stage skipping. PostgreSQL stores only profiles, movement metrics, symptom codes, and clinician decisions; the schema has no camera-media field. Demo sessions must be replaced by production identity and clinician-link verification before handling real health data.

## Verification

- Unit tests cover stage order and static security requirements.
- Mobile E2E covers real onboarding, symptom-free check-in, clinician approval, player-stage update, symptom hold, approval prevention, and offline reload.
- API integration tests cover profile sync, clinician queues, one-stage approval, player refresh, and symptom-based approval blocking.
- Live remote sync requires creating the Render Blueprint described above.
