import type { Language } from "@/lib/ai/explanation";

export type UiKey =
  | "today" | "journey" | "support" | "profile" | "clinicianView"
  | "returnPlan" | "welcomeBack" | "homeIntro" | "currentStage" | "stageGate"
  | "nextStep" | "cameraCheck" | "cameraDescription" | "linkedClinician"
  | "setupTitle" | "setupSubtitle" | "openCamera" | "movementTitle"
  | "movementSubtitle" | "continueSymptoms" | "symptomsTitle" | "symptomsSubtitle"
  | "symptomsPrompt" | "saveClear" | "saveReview" | "saved" | "thanks"
  | "awaitingReview" | "stageNotAdvanced" | "backToday" | "explainStage"
  | "aiBoundary" | "loadingExplanation" | "askPlaceholder" | "ask";

const en: Record<UiKey, string> = {
  today: "Today", journey: "Journey", support: "Support", profile: "Profile", clinicianView: "Clinician view",
  returnPlan: "Your return plan", welcomeBack: "Welcome back", homeIntro: "One clear step at a time, with your care team in control.", currentStage: "Your current stage", stageGate: "Your stage only changes after your linked clinician approves it.",
  nextStep: "Today's next step", cameraCheck: "Camera-guided check-in", cameraDescription: "Four movement options, then symptoms", linkedClinician: "Your clinician",
  setupTitle: "Set up safely", setupSubtitle: "A good camera angle helps describe movement.", openCamera: "Open private camera", movementTitle: "Movement check-in", movementSubtitle: "Choose one test. Counts are observations, not pass or fail.", continueSymptoms: "Continue to symptoms",
  symptomsTitle: "How did that feel?", symptomsSubtitle: "Symptoms always matter more than a camera observation.", symptomsPrompt: "Select anything you noticed during or after the movement.", saveClear: "Save symptom-free check-in", saveReview: "Save and request review",
  saved: "Check-in saved privately", thanks: "Thank you", awaitingReview: "Awaiting clinician review", stageNotAdvanced: "Your stage has not advanced.", backToday: "Back to today",
  explainStage: "Explain my stage", aiBoundary: "AI explains cited guidance. It never decides your stage.", loadingExplanation: "Preparing a grounded explanation...", askPlaceholder: "Ask about this stage", ask: "Ask",
};

const bn: Record<UiKey, string> = {
  today: "আজ", journey: "যাত্রা", support: "সহায়তা", profile: "প্রোফাইল", clinicianView: "চিকিৎসক ভিউ",
  returnPlan: "আপনার ফেরার পরিকল্পনা", welcomeBack: "স্বাগতম", homeIntro: "কেয়ার টিমের নিয়ন্ত্রণে, একবারে একটি স্পষ্ট পদক্ষেপ।", currentStage: "আপনার বর্তমান ধাপ", stageGate: "সংযুক্ত চিকিৎসকের অনুমোদন ছাড়া আপনার ধাপ পরিবর্তন হবে না।",
  nextStep: "আজকের পরবর্তী পদক্ষেপ", cameraCheck: "ক্যামেরা-নির্দেশিত চেক-ইন", cameraDescription: "চারটি নড়াচড়ার বিকল্প, তারপর উপসর্গ", linkedClinician: "আপনার চিকিৎসক",
  setupTitle: "নিরাপদভাবে প্রস্তুত হোন", setupSubtitle: "ভালো ক্যামেরা কোণ নড়াচড়া বর্ণনা করতে সাহায্য করে।", openCamera: "ব্যক্তিগত ক্যামেরা খুলুন", movementTitle: "নড়াচড়া চেক-ইন", movementSubtitle: "একটি পরীক্ষা বেছে নিন। গণনা পর্যবেক্ষণ, পাস বা ফেল নয়।", continueSymptoms: "উপসর্গে এগিয়ে যান",
  symptomsTitle: "কেমন অনুভব হয়েছে?", symptomsSubtitle: "ক্যামেরা পর্যবেক্ষণের চেয়ে আপনার উপসর্গ বেশি গুরুত্বপূর্ণ।", symptomsPrompt: "নড়াচড়ার সময় বা পরে যা অনুভব করেছেন তা বেছে নিন।", saveClear: "উপসর্গহীন চেক-ইন সংরক্ষণ করুন", saveReview: "সংরক্ষণ করে পর্যালোচনা চান",
  saved: "চেক-ইন ব্যক্তিগতভাবে সংরক্ষিত", thanks: "ধন্যবাদ", awaitingReview: "চিকিৎসকের পর্যালোচনার অপেক্ষায়", stageNotAdvanced: "আপনার ধাপ এগোয়নি।", backToday: "আজকের পাতায় ফিরুন",
  explainStage: "আমার ধাপ ব্যাখ্যা করুন", aiBoundary: "AI উদ্ধৃত নির্দেশনা ব্যাখ্যা করে। এটি কখনও আপনার ধাপ ঠিক করে না।", loadingExplanation: "উৎসভিত্তিক ব্যাখ্যা প্রস্তুত হচ্ছে...", askPlaceholder: "এই ধাপ সম্পর্কে জিজ্ঞাসা করুন", ask: "জিজ্ঞাসা করুন",
};

const hi: Record<UiKey, string> = {
  today: "आज", journey: "यात्रा", support: "सहायता", profile: "प्रोफाइल", clinicianView: "चिकित्सक दृश्य",
  returnPlan: "आपकी वापसी योजना", welcomeBack: "वापसी पर स्वागत", homeIntro: "देखभाल दल के नियंत्रण में, एक समय में एक स्पष्ट कदम।", currentStage: "आपका वर्तमान चरण", stageGate: "आपका चरण जुड़े चिकित्सक की मंजूरी के बाद ही बदलता है।",
  nextStep: "आज का अगला कदम", cameraCheck: "कैमरा-निर्देशित चेक-इन", cameraDescription: "चार गतिविधि विकल्प, फिर लक्षण", linkedClinician: "आपके चिकित्सक",
  setupTitle: "सुरक्षित रूप से तैयार हों", setupSubtitle: "सही कैमरा कोण गतिविधि का वर्णन करने में मदद करता है।", openCamera: "निजी कैमरा खोलें", movementTitle: "गतिविधि चेक-इन", movementSubtitle: "एक परीक्षण चुनें। गिनती अवलोकन है, पास या फेल नहीं।", continueSymptoms: "लक्षणों पर जाएं",
  symptomsTitle: "कैसा महसूस हुआ?", symptomsSubtitle: "आपके लक्षण कैमरा अवलोकन से अधिक महत्वपूर्ण हैं।", symptomsPrompt: "गतिविधि के दौरान या बाद में महसूस हुई बात चुनें।", saveClear: "लक्षण-मुक्त चेक-इन सहेजें", saveReview: "सहेजें और समीक्षा मांगें",
  saved: "चेक-इन निजी रूप से सहेजा गया", thanks: "धन्यवाद", awaitingReview: "चिकित्सक समीक्षा की प्रतीक्षा", stageNotAdvanced: "आपका चरण आगे नहीं बढ़ा है।", backToday: "आज पर वापस जाएं",
  explainStage: "मेरा चरण समझाएं", aiBoundary: "AI उद्धृत मार्गदर्शन समझाता है। यह चरण तय नहीं करता।", loadingExplanation: "स्रोत-आधारित व्याख्या तैयार हो रही है...", askPlaceholder: "इस चरण के बारे में पूछें", ask: "पूछें",
};

const ur: Record<UiKey, string> = {
  today: "آج", journey: "سفر", support: "مدد", profile: "پروفائل", clinicianView: "معالج منظر",
  returnPlan: "آپ کی واپسی کا منصوبہ", welcomeBack: "واپسی پر خوش آمدید", homeIntro: "نگہداشت ٹیم کے اختیار میں، ایک وقت میں ایک واضح قدم۔", currentStage: "آپ کا موجودہ مرحلہ", stageGate: "آپ کا مرحلہ منسلک معالج کی منظوری کے بعد ہی بدلتا ہے۔",
  nextStep: "آج کا اگلا قدم", cameraCheck: "کیمرہ رہنمائی چیک اِن", cameraDescription: "چار حرکت کے اختیارات، پھر علامات", linkedClinician: "آپ کا معالج",
  setupTitle: "محفوظ طریقے سے تیار ہوں", setupSubtitle: "درست کیمرہ زاویہ حرکت بیان کرنے میں مدد دیتا ہے۔", openCamera: "نجی کیمرہ کھولیں", movementTitle: "حرکت چیک اِن", movementSubtitle: "ایک ٹیسٹ منتخب کریں۔ گنتی مشاہدہ ہے، پاس یا فیل نہیں۔", continueSymptoms: "علامات کی طرف جائیں",
  symptomsTitle: "کیسا محسوس ہوا؟", symptomsSubtitle: "آپ کی علامات کیمرہ مشاہدے سے زیادہ اہم ہیں۔", symptomsPrompt: "حرکت کے دوران یا بعد میں محسوس ہونے والی بات منتخب کریں۔", saveClear: "بغیر علامات چیک اِن محفوظ کریں", saveReview: "محفوظ کریں اور جائزہ مانگیں",
  saved: "چیک اِن نجی طور پر محفوظ ہوا", thanks: "شکریہ", awaitingReview: "معالج کے جائزے کا انتظار", stageNotAdvanced: "آپ کا مرحلہ آگے نہیں بڑھا۔", backToday: "آج پر واپس جائیں",
  explainStage: "میرا مرحلہ سمجھائیں", aiBoundary: "AI حوالہ شدہ رہنمائی سمجھاتا ہے۔ یہ مرحلہ طے نہیں کرتا۔", loadingExplanation: "ماخذ پر مبنی وضاحت تیار ہو رہی ہے...", askPlaceholder: "اس مرحلے کے بارے میں پوچھیں", ask: "پوچھیں",
};

export const UI_COPY: Record<Language, Record<UiKey, string>> = { en, bn, hi, ur };
