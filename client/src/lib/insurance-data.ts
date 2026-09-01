// BeCaree insurance data — ported from the bolt project's data/insurance.ts
// Arabic RTL, KSA-specific car insurance funnel.

export interface InsuranceType {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  color: string;
  bgColor: string;
}

export interface InsuranceCompany {
  id: string;
  name: string;
  logo: string;
  color: string;
}

export interface InsuranceOffer {
  id: string;
  companyId: string;
  companyName: string;
  logo: string;
  color: string;
  type: "شامل" | "ضد الغير";
  price: number;
  deductible: number;
  features: string[];
  rating: number;
  popular?: boolean;
}

export const insuranceTypes: InsuranceType[] = [
  { id: "car", name: "تأمين المركبات", nameEn: "Car Insurance", icon: "car", description: "قارن أسعار تأمين السيارات من أكثر من 20 شركة تأمين", color: "text-primary-600", bgColor: "bg-primary-50" },
  { id: "medical", name: "التأمين الطبي", nameEn: "Medical Insurance", icon: "heart-pulse", description: "حماية صحية لك ولعائلتك بأفضل الأسعار", color: "text-secondary-600", bgColor: "bg-secondary-50" },
  { id: "travel", name: "تأمين السفر", nameEn: "Travel Insurance", icon: "plane", description: "سافر بأمان مع تغطية شاملة لرحلاتك", color: "text-accent-600", bgColor: "bg-accent-50" },
  { id: "domestic", name: "تأمين العمالة المنزلية", nameEn: "Domestic Workers", icon: "users", description: "تأمين شامل لعمالك المنزليين", color: "text-primary-700", bgColor: "bg-primary-50" },
  { id: "medical-malpractice", name: "تأمين الأخطاء الطبية", nameEn: "Medical Malpractice", icon: "stethoscope", description: "حماية مهنية للممارسين الصحيين", color: "text-secondary-700", bgColor: "bg-secondary-50" },
  { id: "transport", name: "تأمين نقل البضائع", nameEn: "Transport Insurance", icon: "truck", description: "تغطية شاملة للبضائع أثناء النقل", color: "text-accent-700", bgColor: "bg-accent-50" },
];

export const insuranceCompanies: InsuranceCompany[] = [
  { id: "tawuniya", name: "التعاونية", logo: "", color: "#1b6af0" },
  { id: "salama", name: "سلامة للتأمين", logo: "", color: "#14b89c" },
  { id: "rajhi", name: "تكافل الراجحي", logo: "", color: "#0d9583" },
  { id: "walaa", name: "ولاء للتأمين التعاوني", logo: "", color: "#3289fc" },
  { id: "allianz", name: "اليانز للتأمين", logo: "", color: "#1454dc" },
  { id: "alrajhi", name: "الراجحي تكافل", logo: "", color: "#0f776c" },
  { id: "gulf", name: "الخليجية العامة للتأمين", logo: "", color: "#193e8c" },
  { id: "brog", name: "بروج للتأمين التعاوني", logo: "", color: "#1b6af0" },
  { id: "drv7", name: "درايف7", logo: "", color: "#14b89c" },
  { id: "midgulf", name: "ميدغلف السعودية", logo: "", color: "#ea580c" },
  { id: "yaqoot", name: "ياقوت", logo: "", color: "#3289fc" },
  { id: "wafa", name: "وفاء للتأمين", logo: "", color: "#f97316" },
  { id: "arabia", name: "التأمين العربي التعاوني", logo: "", color: "#1454dc" },
  { id: "livva", name: "ليڤا للتأمين", logo: "", color: "#193e8c" },
  { id: "shield", name: "الدرع العربي", logo: "", color: "#0d9583" },
  { id: "amana", name: "أمانة للتأمين التعاوني", logo: "", color: "#1b6af0" },
  { id: "national", name: "الوطنية للتأمين", logo: "", color: "#14b89c" },
  { id: "mtkmla", name: "متكاملة للتأمين", logo: "", color: "#ea580c" },
  { id: "gig", name: "جي.آي.جي", logo: "", color: "#3289fc" },
  { id: "jazira", name: "الجزيرة التكافل", logo: "", color: "#0f776c" },
];

export const carInsuranceOffers: InsuranceOffer[] = [
  { id: "1", companyId: "tawuniya", companyName: "التعاونية", logo: "", color: "#1b6af0", type: "شامل", price: 1450, deductible: 500, features: ["تغطية الأضرار المادية والطبيعية", "تغطية الحوادث الشخصية للسائق والركاب", "تغطية السرقة والحريق", "إصلاح في الوكالة", "خدمة طوارئ مميزة"], rating: 4.5, popular: true },
  { id: "2", companyId: "salama", companyName: "سلامة للتأمين", logo: "", color: "#14b89c", type: "شامل", price: 1280, deductible: 300, features: ["تغطية الأضرار المادية والطبيعية", "تغطية الحوادث الشخصية للسائق", "تغطية السرقة والحريق", "إصلاح في الوكالة", "مساعدة على الطريق"], rating: 4.3 },
  { id: "3", companyId: "rajhi", companyName: "تكافل الراجحي", logo: "", color: "#0d9583", type: "ضد الغير", price: 750, deductible: 0, features: ["تغطية المسؤولية المدنية تجاه الغير", "تغطية الحوادث الشخصية للسائق", "تغطية دول مجلس التعاون الخليجي", "خدمة طوارئ"], rating: 4.2 },
  { id: "4", companyId: "allianz", companyName: "اليانز للتأمين", logo: "", color: "#1454dc", type: "شامل", price: 1620, deductible: 250, features: ["تغطية شاملة للأضرار المادية والطبيعية", "تغطية الحوادث الشخصية الشاملة", "تغطية السرقة والحريق", "إصلاح في الوكالة", "خدمة طوارئ بلاتيني", "تغطية الزجاج الأمامي والخلفي"], rating: 4.7 },
  { id: "5", companyId: "walaa", companyName: "ولاء للتأمين", logo: "", color: "#3289fc", type: "ضد الغير", price: 690, deductible: 0, features: ["تغطية المسؤولية المدنية تجاه الغير", "تغطية دول مجلس التعاون الخليجي"], rating: 4.0 },
  { id: "6", companyId: "drv7", companyName: "درايف7", logo: "", color: "#14b89c", type: "شامل", price: 1100, deductible: 400, features: ["تغطية الأضرار المادية والطبيعية", "تغطية الحوادث الشخصية للركاب", "تغطية السرقة والحريق", "مساعدة على الطريق"], rating: 4.1 },
];

export const carBrands = [
  "تويوتا", "هيونداي", "كيا", "نيسان", "فورد", "شيفروليه", "مرسيدس", "بي إم دبليو",
  "لكزس", "هوندا", "مازدا", "ميتسوبيشي", "فولكس واجن", "أودي", "جيب", "دودج",
  "جي إم سي", "كاديلاك", "إنفينيتي", "بيجو", "رينو", "سكودا", "سوبارو", "سوزوكي",
];

export const saudiCities = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر",
  "الظهران", "الطائف", "تبوك", "بريدة", "أبها", "خميس مشيط", "حائل", "نجران",
  "جازان", "ينبع", "الأحساء", "الجبيل", "القطيف", "عرعر", "سكاكا", "الباحة",
];

export const faqs = [
  { q: "كيف أقارن عروض التأمين؟", a: "أدخل بيانات مركبتك وستحصل على مقارنة فورية لكل عروض شركات التأمين، مع إمكانية فلترة النتائج حسب السعر والتغطية." },
  { q: "هل إصدار الوثيقة فوري؟", a: "نعم، بعد اختيار العرض المناسب وإتمام عملية الدفع، يتم إصدار الوثيقة فوراً وربطها بنظام المرور ونجم." },
  { q: "ما الفرق بين التأمين الشامل وضد الغير؟", a: "التأمين الشامل يغطي أضرار مركبتك وأضرار الغير، بينما التأمين ضد الغير يغطي فقط أضرار الطرف الآخر." },
  { q: "هل يمكنني تقسيط التأمين؟", a: "نعم، نقدم خدمة تقسيط التأمين على بطاقات الائتمان مع إمكانية الدفع على دفعات متعددة." },
  { q: "كيف أتواصل مع الدعم الفني؟", a: "يمكنك التواصل معنا عبر الهاتف أو البريد الإلكتروني أو من خلال نموذج التواصل في الموقع." },
  { q: "هل بياناتي آمنة؟", a: "نعم، نستخدم أحدث تقنيات التشفير لحماية بياناتك الشخصية وبيانات الدفع." },
];

export const testimonials = [
  { name: "أحمد العتيبي", city: "الرياض", text: "خدمة ممتازة وسريعة، قارنت أكثر من 10 عروض في دقائق واخترت الأنسب لي. أنصح الجميع بتجربة بيكير.", rating: 5 },
  { name: "سارة القحطاني", city: "جدة", text: "أعجبني سهولة الموقع وسرعة إصدار الوثيقة. وفّرت علي وقت ومجهود كبير في البحث عن أفضل سعر.", rating: 5 },
  { name: "محمد الدوسري", city: "الدمام", text: "أول مرة أقدر أقارن كل عروض التأمين في مكان واحد. الخصومات ممتازة والخدمة احترافية.", rating: 4 },
  { name: "نورة الحربي", city: "مكة المكرمة", text: "تجربة رائعة من البداية للنهاية. الدعم الفني متعاون والأسعار منافسة جداً.", rating: 5 },
  { name: "فهد الشمري", city: "الطائف", text: "بيكير وفّر لي أكثر من 400 ريال على تأمين سيارتي. منصة لا غنى عنها.", rating: 5 },
  { name: "ريم الزهراني", city: "الخبر", text: "واجهة سهلة الاستخدام وعروض متنوعة. اخترت تأمين شامل بسعر ممتاز في أقل من 10 دقائق.", rating: 4 },
];

export const features = [
  { icon: "zap", title: "إصدار سريع", description: "أصدر وثيقتك في دقائق مع ربط مباشر بنظام المرور ونجم" },
  { icon: "tag", title: "أسعار أقل", description: "نقارن لك كل عروض الأسعار بشكل فوري من كل شركات التأمين" },
  { icon: "shield-check", title: "منافع تحميك", description: "خطط تأمين متنوعة مع المرونة في تحديد المنافع الإضافية" },
  { icon: "calendar-check", title: "جدول تأمينك", description: "نرسل لك إشعارات تذكيرية لتجديد تأمينك وتقدر تجدول تاريخ بدايته" },
  { icon: "folder", title: "مكان واحد", description: "تدير كل وثائقك إدارة إلكترونية كاملة من مكان واحد وتجددها في أي وقت" },
  { icon: "credit-card", title: "نقّسط تأمينك", description: "نقسط لك تأمينك على البطاقات الائتمانية بكل سهولة" },
];
