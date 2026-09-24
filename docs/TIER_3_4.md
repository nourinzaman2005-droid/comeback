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

This local adapter is for an end-to-end competition demonstration. It does not pretend to be remote multi-device sync.

## Supabase deployment

The free Supabase backend is ready but cannot be deployed until a project URL, anon key, and user authentication are available.

1. Create a free Supabase project.
2. Run `supabase/migrations/202609250001_initial.sql` with the Supabase CLI or SQL editor.
3. Deploy `supabase/functions/red-flag-alert`.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel.
5. Provide the signed-in Supabase access token to `flushSyncQueue` from the future auth session.
6. Optionally set `CLINICIAN_ALERT_WEBHOOK_URL` for a metadata-only alert webhook. The function sends a test identifier and symptom count, not the symptom text or video.

Row-level security ensures a player can access her own records and an accepted linked clinician can access linked records. Database triggers reject stage skipping, approval when symptoms are present, and direct player stage changes. Only metrics and symptom codes sync. The schema has no video field.

## Verification

- Unit tests cover stage order and static security requirements.
- Mobile E2E covers real onboarding, symptom-free check-in, clinician approval, player-stage update, symptom hold, approval prevention, and offline reload.
- Live remote sync still requires the free Supabase project credentials described above.
