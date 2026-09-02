import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Car,
  Check,
  CreditCard,
  Headphones,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { createApplication } from "@/lib/workflow";
import heroImage from "@/assets/becaree-hero.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "بيكير — تأمين السيارات في السعودية" },
      {
        name: "description",
        content: "قارن عروض تأمين السيارات في السعودية، واختر التغطية المناسبة، وأصدر وثيقتك بسهولة مع بيكير.",
      },
      { property: "og:title", content: "بيكير — تأمين السيارات في السعودية" },
      {
        property: "og:description",
        content: "قارن عروض تأمين السيارات واختر التغطية المناسبة لك بسهولة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const packages = [
  {
    title: "التأمين الشامل",
    subtitle: "أفضل تغطية",
    description: "يوفر حماية شاملة لمركبتك ضد الحوادث والسرقة والكوارث الطبيعية وأضرار الغير.",
    highlighted: true,
    features: [
      "الحماية من أضرار الحوادث",
      "تغطية أضرار الغير",
      "الكوارث الطبيعية",
      "السرقة والحريق",
      "خدمة المساعدة على الطريق",
      "إصلاح المركبة داخل الوكالة",
    ],
  },
  {
    title: "ضد الغير",
    subtitle: "التغطية الأساسية",
    description: "التغطية الأساسية المطلوبة لحماية مسؤوليتك تجاه الطرف الآخر.",
    highlighted: false,
    features: ["تغطية الأضرار التي تلحق بالغير", "متوافق مع متطلبات المرور", "إصدار فوري للوثيقة"],
  },
  {
    title: "ضد الغير بلس",
    subtitle: "التغطية المحسنة",
    description: "حماية ضد الغير مع مزايا إضافية تمنحك راحة ومرونة أكبر.",
    highlighted: false,
    features: ["تغطية موسعة لأضرار الغير", "منافع إضافية اختيارية", "مساعدة على الطريق"],
  },
];

const benefits = [
  {
    icon: ShieldCheck,
    title: "الأمان في المملكة",
    description: "منصة تأمين معتمدة تجمع أنواع التأمين المناسبة في مكان واحد.",
  },
  {
    icon: Car,
    title: "وحدة وثائق التأمين",
    description: "قارن بين خيارات متعددة من شركات التأمين واختر الوثيقة الأنسب لسيارتك.",
  },
  {
    icon: Headphones,
    title: "الشفافية والوضوح",
    description: "نأخذ بيدك ونبسط لك تفاصيل كل تغطية لتختار وأنت مطمئن.",
  },
  {
    icon: BadgeCheck,
    title: "الخبرة التقنية والاستشارية",
    description: "رحلة شراء سهلة تجمع خبرتنا التقنية بمعرفتنا بقطاع التأمين.",
  },
  {
    icon: CalendarDays,
    title: "المتابعة الأسرع لعروض التأمين",
    description: "استعرض خيارات متعددة واتخذ قرارك بخطوات واضحة وسريعة.",
  },
  {
    icon: CreditCard,
    title: "تسعير موحّد وواضح",
    description: "اعرف السعر والتغطية بوضوح قبل إكمال عملية الشراء.",
  },
];

const faqs = [
  ["التأمين ضروري لتجديد الاستمارة؟", "نعم، وجود تأمين ساري من المتطلبات الأساسية لتجديد استمارة المركبة."],
  ["كيف أعرف خصم «نجم» حقي؟", "يظهر الخصم المستحق تلقائياً ضمن عروض شركات التأمين المؤهلة."],
  ["وين نظام الرصد الآلي الجديد 2026؟", "تخضع المخالفات والأنظمة للجهات الرسمية، ويمكنك متابعة آخر التحديثات من مصادرها المعتمدة."],
  ["أقدر ألغي التأمين وأرجع فلوسي؟", "يمكن إلغاء الوثيقة وفق شروط شركة التأمين والأنظمة المعمول بها."],
  ["هل هيئة التأمين توحّد الأسعار؟", "تختلف الأسعار حسب شركة التأمين وبيانات المركبة والسائق ونوع التغطية."],
  ["كم مدة صلاحية وثيقة التأمين؟", "تكون معظم وثائق تأمين المركبات صالحة لمدة سنة من تاريخ بدايتها."],
];

function StartButton({ outline = false }: { outline?: boolean }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    const app = await createApplication("car");
    setLoading(false);
    if (app) {
      void navigate({ to: "/reg" });
    }
  };

  return (
    <Button
      type="button"
      variant={outline ? "outline" : "default"}
      size="lg"
      className="h-12 w-full text-base font-bold"
      onClick={() => void handleClick()}
      disabled={loading}
    >
      {loading ? "جاري التحميل..." : "ابدأ الآن"}
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 overflow-hidden pt-16 md:pt-20">
        <section className="bg-primary-50">
          <div className="container-x flex min-h-[560px] max-w-3xl flex-col items-center justify-center py-6 text-center sm:min-h-[650px] sm:py-8 md:py-12">
            <img
              src={heroImage}
              alt="عميل سعودي بجانب سيارة مؤمّنة"
              width={1200}
              height={900}
              fetchPriority="high"
              className="h-auto w-full max-w-xl object-contain"
            />
            <div className="mx-auto -mt-3 max-w-2xl space-y-4">
              <h1 className="text-3xl font-extrabold leading-[1.45] text-foreground md:text-5xl">
                أول منصة لتأمين السيارات في السعودية
              </h1>
              <p className="mx-auto max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
                جميع منتجات وخدمات التأمين من مزودين موثوقين. قارن الأسعار والتغطيات واختر وثيقتك المناسبة.
              </p>
              <div className="mx-auto max-w-md pt-2">
                <StartButton />
              </div>
            </div>
          </div>
        </section>

        <section aria-label="شركاء التأمين" className="border-y border-border bg-card py-5">
          <div className="container-x grid max-w-3xl grid-cols-4 items-center gap-2 text-center sm:flex sm:justify-around sm:gap-4">
            {["التعاونية", "تكافل الراجحي", "الدرع العربي", "سلامة"].map((company) => (
              <div key={company} className="flex min-w-0 flex-col items-center gap-1 text-[10px] font-bold leading-4 text-muted-foreground sm:flex-row sm:gap-2 sm:text-xs md:text-sm">
                <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                <span className="max-w-full break-words">{company}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-background py-14 md:py-20">
          <div className="container-x max-w-3xl">
            <div className="mb-8 text-center">
              <p className="font-bold text-primary">اختر نوع تأمينك</p>
              <h2 className="mt-2 text-2xl font-extrabold text-foreground md:text-3xl">تغطية تناسب احتياجك</h2>
            </div>
            <div className="space-y-5">
              {packages.map((item) => (
                <article
                  key={item.title}
                  className={`overflow-hidden rounded-lg border shadow-sm ${
                    item.highlighted ? "border-primary bg-primary" : "border-border bg-card"
                  }`}
                >
                  <div className={`px-6 py-6 text-center ${item.highlighted ? "text-primary-foreground" : "text-card-foreground"}`}>
                    {item.highlighted && (
                      <span className="mb-3 inline-flex items-center gap-1 rounded-md bg-primary-foreground/15 px-3 py-1 text-xs font-bold">
                        <Sparkles className="h-4 w-4" />
                        أفضل تغطية
                      </span>
                    )}
                    <h3 className="text-xl font-extrabold">{item.title}</h3>
                    {!item.highlighted && <p className="mt-1 text-sm font-bold text-primary">{item.subtitle}</p>}
                    <p className={`mx-auto mt-3 max-w-xl text-sm leading-7 ${item.highlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {item.description}
                    </p>
                  </div>
                  <div className="bg-card px-5 py-5">
                    <StartButton outline={!item.highlighted} />
                    <ul className="mt-5 grid gap-3 md:grid-cols-2">
                      {item.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-card-foreground">
                          <Check className="h-4 w-4 shrink-0 text-success" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-card py-14 md:py-20">
          <div className="container-x max-w-3xl">
            <div className="mb-10 text-center">
              <p className="font-bold text-primary">لماذا بيكير؟</p>
              <h2 className="mt-2 text-2xl font-extrabold text-foreground md:text-3xl">اختر راحة تأمينك بذكاء</h2>
            </div>
            <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-foreground">{benefit.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-primary-50 py-14 md:py-20">
          <div className="container-x max-w-3xl">
            <div className="mb-8 text-center">
              <Zap className="mx-auto h-8 w-8 text-primary" />
              <h2 className="mt-3 text-3xl font-extrabold text-foreground">الأسئلة الشائعة</h2>
              <p className="mt-2 text-sm text-muted-foreground">إجابات سريعة على أكثر الأسئلة شيوعاً عن تأمين المركبات</p>
            </div>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map(([question, answer], index) => (
                <AccordionItem key={question} value={`faq-${index}`} className="rounded-lg border border-border bg-card px-5 shadow-sm">
                  <AccordionTrigger className="text-right text-sm font-bold text-foreground hover:no-underline">
                    {question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-7 text-muted-foreground">{answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
