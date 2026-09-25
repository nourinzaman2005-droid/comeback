# ComeBack demo video script

Target length: 2 minutes 45 seconds. Hard limit: 3 minutes.

## 0:00-0:20 - Human story

Visual: Nourin on camera, followed by the title screen.

Narration:

> The ICC says no player should have to choose between motherhood and representing her country. In 2026 it published a Return to Play Post-Pregnancy framework. But a PDF cannot guide every check-in, movement, symptom, and care-team decision. We built ComeBack to make that journey practical.

On-screen source: ICC launch release, 22 June 2026.

## 0:20-0:42 - Personal roadmap

Visual: Open the live GitHub Pages app. Choose "Try the 2-minute player demo." Show the Today screen and open the 6 Rs roadmap.

Narration:

> The player immediately sees her current stage, one clear next action, and the exact guideline source. The full roadmap explains Ready, Review, Restore, Recondition, Return, and Refine in plain language.

## 0:42-1:16 - Camera-assisted check

Visual: Open the movement check, show the framing guide, allow camera access, and demonstrate a slow single-leg squat or balance hold. Do not rush the movement.

Narration:

> A locally hosted MediaPipe model runs in a Web Worker on the phone. It can describe reps, hold time, asymmetry, squat depth, and a frontal-plane knee-angle indicator. Camera frames stay in memory and are never saved or uploaded. These are observations for a clinician, not a diagnosis or an automated pass.

## 1:16-1:35 - Symptom gate

Visual: Continue to the symptom check. Choose "None of these today" for the main path, then save the check-in.

Narration:

> After movement, the player completes a symptom check. Any reported symptom creates a hold and blocks approval. A symptom-free result still waits for the clinician.

On-screen source: Goom, Donnelly and Brockwell, 2019, pp. 13-14.

## 1:35-2:03 - Clinician approval

Visual: Open the clinician dashboard on a laptop or second browser. Select Nourin, show the metrics and symptom status, add a short note, and approve. Return to the player screen and show the stage update.

Narration:

> The clinician sees derived metrics and symptoms, adds a note, and makes the decision. The server allows only one stage at a time and rejects approval when symptoms are present. ComeBack never medically clears a player on its own.

## 2:03-2:27 - Inclusion and resilience

Visual: Switch the player UI to Bengali, briefly show Urdu RTL, then turn the browser offline and reload a previously visited screen.

Narration:

> ComeBack supports English, Bengali, Hindi, and right-to-left Urdu. The core journey works offline, so unstable connectivity does not remove access. The prototype is installable and requires only a phone.

## 2:27-2:45 - Scale and closing

Visual: Show the final pitch slide with team names and the live URL.

Narration:

> We would begin with clinical review and one ICC Member-board usability pilot, then measure clarity, completion, accessibility, and clinician response. ComeBack gives every mother a plan, a voice, and a care team for the journey back.

## Recording checklist

- Record at 1080p and export below 40 MB.
- Keep the final cut below 3 minutes.
- Use fictional demo data only.
- Do not show browser tokens, environment variables, dashboards, or real health records.
- Keep the safety boundary visible: camera observes, AI explains, clinician approves.
- Include source captions for the ICC quote and clinical symptom guidance.
- Use the live GitHub Pages URL for the player view.
- Use the live Render path only after its health check reports PostgreSQL.
