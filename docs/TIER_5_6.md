# Tier 5 and Tier 6 implementation

## Grounded explanation layer

`POST /api/explain` accepts only a 6 Rs stage, a supported language, and an optional short question. It never receives camera frames, profile details, delivery details, or a progression recommendation.

The route:

1. validates the requested stage and language;
2. refuses clearance, diagnosis, and safe-to-play questions before a model call;
3. uses only the matching ICC stage, documented framework limitations, evidence boundary, and symptom list as context;
4. restricts Groq output to a strict JSON schema with the same stage and one allowed citation;
5. validates the result again and falls back to a deterministic cited explanation if anything fails;
6. never writes to the profile, rules engine, database, or stage decision;
7. limits requests per runtime instance to protect the free API allowance.

The Groq path follows the official Chat Completions endpoint and uses `openai/gpt-oss-20b` strict structured output. Without `GROQ_API_KEY`, the same interface remains functional with the grounded fallback.

- Groq Chat Completions: https://console.groq.com/docs/api-reference
- Groq structured outputs: https://console.groq.com/docs/structured-outputs
- Groq supported models: https://console.groq.com/docs/models

## Languages

The player can switch among English, Bengali, Hindi, and Urdu from the header. Urdu sets the document direction to RTL. Core onboarding, home, camera journey, symptom, result, navigation, and AI boundary strings use the selected language. Source citations and clinical source titles remain unchanged to avoid mistranslating evidence.

Automated E2E completes the core player flow in Bengali and confirms a Bengali clearance question receives a Bengali refusal.

## Hardening

- Automated axe checks pass on the onboarding, player, and clinician entry screens.
- Every E2E journey runs at Pixel 7 and desktop Chrome sizes.
- Keyboard focus, skip navigation, semantic headings, reduced motion, and responsive layout are included.
- The privacy page describes local camera processing, optional metrics-only sync, erasure, and the MediaPipe runtime metrics notice.
- Fictional demo personas are stored in `content/demo-personas.json` and marked as fictional.
- The camera screen visibly states that physical Android manual-count validation is pending.
- `npm run check:files` enforces the submission requirement that every file remains under 40 MB.
