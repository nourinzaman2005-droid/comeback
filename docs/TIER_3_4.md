# Tier 3 and Tier 4 implementation

## Player journey

The root route is the player-only authentication portal. It supports:

- email/password sign in;
- player registration with consent, delivery details, cricket role, language, and selection of a verified clinician;
- a fictional Nourin demo sign-in for a repeatable presentation.

The player can view the cited 6 Rs roadmap, complete a camera-guided movement check, answer the complete symptom screen, save the result, and wait for clinician review. Profile, check-ins, decisions, and the sync queue are stored in IndexedDB. The service worker runtime-caches visited app resources so the journey reloads offline.

## Clinician journey

Open `/clinician` for the separate clinician-only authentication portal. A player session cannot open a clinician dashboard, and a clinician session cannot open a player dashboard. Clinician account activation requires an exact match against the fictional verified ICC directory. The dashboard provides:

- linked-player list;
- recent movement observations;
- highlighted symptom reports;
- approve or hold decisions;
- disabled approval whenever the latest check-in reports a symptom;
- immediate stage updates and player notifications;
- private in-app conversation with each linked player.

Local development uses the same Express API with in-memory storage, while the hosted deployment uses PostgreSQL. IndexedDB keeps the visited player journey available offline and queues failed profile or check-in writes for retry. Raw camera media is never queued or uploaded.

## Render and PostgreSQL deployment

The repository contains a Render Blueprint that provisions the Node API and a PostgreSQL database without placing credentials in Git.

Use the exact checklist in `docs/RENDER_SETUP.md`. It covers Blueprint creation, the generated PostgreSQL connection, Groq secret entry, GitHub Pages configuration, and live verification.

The competition deployment uses bcrypt password hashes, signed 12-hour sessions, and server-side role and clinician-link checks. The API rejects player-ID mismatches, unrelated clinician access, clinician approval when symptoms are present, and stage skipping. PostgreSQL stores accounts, profiles, movement metrics, symptom codes, decisions, messages, and notifications; the schema has no camera-media field. The seeded registry is fictional and must be replaced by authoritative clinician verification before real-world use.

## Verification

- Unit tests cover stage order and static security requirements.
- Mobile and desktop E2E cover registration, separate role login, clinician linkage, symptom-free check-in, clinician approval, player-stage update, symptom hold, approval prevention, chat, notifications, logout, accessibility, and offline reload.
- API integration tests cover authentication boundaries, profile sync, clinician queues, chat, notifications, one-stage approval, player refresh, and symptom-based approval blocking.
- Live remote sync requires creating the Render Blueprint described above.
