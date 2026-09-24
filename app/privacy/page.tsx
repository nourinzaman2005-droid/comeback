import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="policy-shell">
      <article className="policy-card">
        <Link href="/"><ArrowLeft size={17} /> Back to ComeBack</Link>
        <span className="policy-icon"><LockKeyhole size={27} /></span>
        <p className="eyebrow">Privacy and consent</p>
        <h1>Your camera is not your medical record.</h1>
        <p>
          ComeBack is a prototype care companion. It is not a medical device,
          diagnostic service, or emergency service.
        </p>
        <h2>What stays on your device</h2>
        <p>
          Raw camera frames are processed in memory by the locally hosted
          MediaPipe model. ComeBack does not save or upload photos, camera
          frames, audio, or video.
        </p>
        <h2>What can be stored or shared</h2>
        <p>
          Your profile, consent time, movement observations, symptom codes,
          and clinician decisions are stored in IndexedDB for the local demo.
          When the optional Supabase service is configured, only those fields
          enter the encrypted sync queue.
        </p>
        <h2>Third-party runtime notice</h2>
        <p>
          MediaPipe documentation states that input processing occurs on the
          device. Google may receive performance and utilisation metrics from
          MediaPipe technology. ComeBack does not use those metrics to identify
          a player or make a clinical decision.
        </p>
        <h2>Your choices</h2>
        <p>
          You can decline camera access, use the rest of the journey without a
          recording, erase local demo data from Profile, and stop at any time.
        </p>
        <div className="policy-boundary"><ShieldCheck size={19} /><span>Stage progression always requires a linked clinician decision. AI explanations and camera observations cannot approve it.</span></div>
      </article>
    </main>
  );
}
