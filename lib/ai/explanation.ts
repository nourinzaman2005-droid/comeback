import guideline from "../../content/guidelines/icc-2026.json";
import testGuideline from "../../content/guidelines/tests.json";
import type { Stage } from "../data/types";

export const LANGUAGES = ["en", "bn", "hi", "ur"] as const;
export type Language = (typeof LANGUAGES)[number];

export type StageExplanation = {
  stage: Stage;
  summary: string;
  nextStep: string;
  safetyNote: string;
  citations: string[];
  source: "groq" | "grounded-fallback" | "guardrail";
};

const refusalPatterns = [
  /clear(ed|ance)?/i,
  /diagnos/i,
  /safe to (play|run|train)/i,
  /can i (play|run|train|return)/i,
  /medical advice/i,
  /খেলতে নিরাপদ|ছাড়পত্র|রোগ নির্ণয়/,
  /खेलना सुरक्षित|चिकित्सकीय मंजूरी|निदान/,
  /کھیلنا محفوظ|طبی منظوری|تشخیص/,
];

const messages: Record<Language, { next: string; safety: string; refusal: string }> = {
  en: {
    next: "Use this stage as a conversation guide with your linked clinician and care team.",
    safety: "This explanation cannot diagnose, clear, or advance your stage. Report symptoms and seek clinician review.",
    refusal: "I cannot provide medical clearance or decide whether you are safe to return. Please discuss this with your qualified clinician, who can review your symptoms and full context.",
  },
  bn: {
    next: "এই ধাপটি আপনার সংযুক্ত চিকিৎসক ও কেয়ার টিমের সঙ্গে আলোচনার নির্দেশিকা হিসেবে ব্যবহার করুন।",
    safety: "এই ব্যাখ্যা রোগ নির্ণয়, ছাড়পত্র বা ধাপ পরিবর্তন করতে পারে না। উপসর্গ জানিয়ে চিকিৎসকের পর্যালোচনা নিন।",
    refusal: "আমি চিকিৎসাগত ছাড়পত্র দিতে বা আপনি খেলায় ফিরতে নিরাপদ কি না সিদ্ধান্ত নিতে পারি না। আপনার উপসর্গ ও সম্পূর্ণ পরিস্থিতি পর্যালোচনার জন্য যোগ্য চিকিৎসকের সঙ্গে কথা বলুন।",
  },
  hi: {
    next: "इस चरण को अपने जुड़े चिकित्सक और देखभाल दल के साथ बातचीत की मार्गदर्शिका के रूप में उपयोग करें।",
    safety: "यह व्याख्या निदान, चिकित्सकीय मंजूरी या चरण में बदलाव नहीं कर सकती। लक्षण बताएं और चिकित्सक की समीक्षा लें।",
    refusal: "मैं चिकित्सकीय मंजूरी नहीं दे सकता या यह तय नहीं कर सकता कि आपकी वापसी सुरक्षित है। अपने लक्षणों और पूरी स्थिति की समीक्षा के लिए योग्य चिकित्सक से बात करें।",
  },
  ur: {
    next: "اس مرحلے کو اپنے منسلک معالج اور نگہداشت ٹیم کے ساتھ گفتگو کی رہنمائی کے طور پر استعمال کریں۔",
    safety: "یہ وضاحت تشخیص، طبی منظوری یا مرحلہ تبدیل نہیں کر سکتی۔ علامات بتائیں اور معالج سے جائزہ لیں۔",
    refusal: "میں طبی منظوری نہیں دے سکتا یا یہ فیصلہ نہیں کر سکتا کہ آپ کی واپسی محفوظ ہے۔ اپنی علامات اور مکمل صورتحال کے جائزے کے لیے مستند معالج سے بات کریں۔",
  },
};

function localSummary(language: Language, stage: Stage, purpose: string) {
  if (language === "bn") return `আপনি এখন ${stage} ধাপে আছেন। এই ধাপে ধীরে ধীরে সুস্থতা ও সহায়তাপ্রাপ্ত কার্যক্রমে মনোযোগ দিন।`;
  if (language === "hi") return `आप अभी ${stage} चरण में हैं। इस चरण में धीरे-धीरे स्वास्थ्य लाभ और देखरेख में गतिविधि पर ध्यान दें।`;
  if (language === "ur") return `آپ اس وقت ${stage} مرحلے میں ہیں۔ اس مرحلے میں بتدریج بحالی اور نگرانی میں سرگرمی پر توجہ دیں۔`;
  return purpose;
}

export function isClearanceRequest(question = "") {
  return refusalPatterns.some((pattern) => pattern.test(question));
}

export function groundedFallback(
  stage: Stage,
  language: Language,
  question = "",
): StageExplanation {
  const stageGuidance = guideline.stages.find(
    (item) => item.label.toLowerCase() === stage.toLowerCase(),
  );
  const citation = `ICC Return to Play Post Pregnancy Guidelines, page ${stageGuidance?.reference.pdfPage ?? 6}, ${stageGuidance?.reference.section ?? "The 6 Rs"}`;
  if (isClearanceRequest(question)) {
    return {
      stage,
      summary: messages[language].refusal,
      nextStep: messages[language].next,
      safetyNote: messages[language].safety,
      citations: [citation],
      source: "guardrail",
    };
  }
  return {
    stage,
    summary: localSummary(
      language,
      stage,
      stageGuidance?.purpose ?? "Continue with your individual care plan.",
    ),
    nextStep: messages[language].next,
    safetyNote: messages[language].safety,
    citations: [citation],
    source: "grounded-fallback",
  };
}

export function explanationContext(stage: Stage) {
  const stageGuidance = guideline.stages.find(
    (item) => item.label.toLowerCase() === stage.toLowerCase(),
  );
  return {
    stage: stageGuidance,
    frameworkLimitations: guideline.scope.limitations,
    evidenceBoundary: testGuideline.evidenceBoundary,
    symptomStops: testGuideline.symptomStops,
  };
}

export function validateExplanation(
  value: unknown,
  requestedStage: Stage,
  allowedCitation: string,
): value is Omit<StageExplanation, "source"> {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    item.stage === requestedStage &&
    typeof item.summary === "string" &&
    typeof item.nextStep === "string" &&
    typeof item.safetyNote === "string" &&
    Array.isArray(item.citations) &&
    item.citations.length > 0 &&
    item.citations.every((citation) => citation === allowedCitation)
  );
}
