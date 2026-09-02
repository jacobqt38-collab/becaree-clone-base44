import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Star, TrendingDown, Crown, Flame } from "lucide-react";
import { insuranceCompanies } from "@/lib/insurance-data";
import { setInsurer, submitCurrentStep } from "@/lib/workflow";
import { track } from "@/lib/gate";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "مقارنة العروض — بيكير" },
      { name: "description", content: "قارن عروض تأمين السيارات من أكثر من 20 شركة واختر الأنسب لك." },
      { property: "og:title", content: "مقارنة العروض — بيكير" },
      { property: "og:description", content: "قارن عروض تأمين السيارات واختر الأنسب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComparePage,
});

type Offer = {
  id: string;
  companyId: string;
  companyName: string;
  color: string;
  type: "ضد الغير" | "ضد الغير بلس" | "شامل";
  price: number;
  oldPrice: number;
  deductible: number;
  rating: number;
  features: string[];
  popular?: boolean;
};

// Realistic KSA market pricing (SAR / year) for a ~80,000 SAR vehicle.
const COMPANY_PRICING: Record<string, { tpl: number; comp: number; rating: number }> = {
  tawuniya: { tpl: 468, comp: 1740, rating: 4.6 },
  salama: { tpl: 412, comp: 1585, rating: 4.3 },
  rajhi: { tpl: 399, comp: 1590, rating: 4.7 },
  walaa: { tpl: 398, comp: 1520, rating: 4.2 },
  allianz: { tpl: 505, comp: 1875, rating: 4.5 },
  alrajhi: { tpl: 445, comp: 1715, rating: 4.6 },
  gulf: { tpl: 425, comp: 1610, rating: 4.1 },
  brog: { tpl: 389, comp: 1490, rating: 4.0 },
  drv7: { tpl: 375, comp: 1445, rating: 4.4 },
  midgulf: { tpl: 458, comp: 1760, rating: 4.2 },
  yaqoot: { tpl: 369, comp: 1425, rating: 4.3 },
  wafa: { tpl: 405, comp: 1550, rating: 4.0 },
  arabia: { tpl: 432, comp: 1655, rating: 4.1 },
  livva: { tpl: 479, comp: 1805, rating: 4.4 },
  shield: { tpl: 418, comp: 1595, rating: 4.2 },
  amana: { tpl: 395, comp: 1505, rating: 4.0 },
};

const TPL_FEATURES = [
  ["إصدار فوري", "تغطية الطرف الثالث حتى 10 مليون ريال", "ربط مباشر بنجم", "مطالبات إلكترونية"],
  ["إصدار فوري", "خدمة 24/7", "تغطية الحوادث خارج المدن", "بدون كشف طبي"],
  ["إصدار فوري", "خصم 10% للقطاع الحكومي", "تعويض سريع خلال 5 أيام", "ربط مباشر بنجم"],
];

const TPL_PLUS_FEATURES = [
  ["تغطية الطرف الثالث حتى 10 مليون ريال", "مساعدة على الطريق", "إصدار فوري", "تعويض سريع خلال 5 أيام"],
  ["تغطية موسعة لأضرار الغير", "سيارة بديلة 3 أيام", "خدمة 24/7", "ربط مباشر بنجم"],
  ["تغطية الطرف الثالث", "مساعدة على الطريق مجاناً", "مطالبات إلكترونية", "خصم عدم المطالبة"],
];

const COMP_FEATURES = [
  ["تغطية شاملة للمركبة", "سيارة بديلة 7 أيام", "المساعدة على الطريق مجاناً", "تغطية دول الخليج"],
  ["تغطية شاملة للمركبة", "إصلاح في الوكالة", "سحب مجاني داخل المدينة", "تغطية السرقة والحريق"],
  ["تغطية شاملة للمركبة", "سيارة بديلة 10 أيام", "تغطية الكوارث الطبيعية", "خصم عدم المطالبة 20%"],
];

function generateOffers(declaredValue: number): Offer[] {
  const base = Math.max(declaredValue || 80000, 40000);
  const scale = base / 80000;
  const offers: Offer[] = [];

  insuranceCompanies.forEach((c, i) => {
    const p = COMPANY_PRICING[c.id] ?? { tpl: 420 + (i % 5) * 12, comp: 1600 + (i % 6) * 40, rating: 4 + ((i * 7) % 10) / 10 };
    const round = (n: number) => Math.round(n / 5) * 5;
    const isPopular = c.name === "تكافل الراجحي";

    const tplPrice = round(p.tpl * (0.9 + scale * 0.1));
    offers.push({
      id: `${c.id}-tpl`,
      companyId: c.id,
      companyName: c.name,
      color: c.color,
      type: "ضد الغير",
      price: tplPrice,
      oldPrice: round(tplPrice * 1.22),
      deductible: 0,
      rating: p.rating,
      features: TPL_FEATURES[i % TPL_FEATURES.length]!,
      popular: isPopular,
    });

    const tplPlusPrice = round(tplPrice * 1.15);
    offers.push({
      id: `${c.id}-tpl-plus`,
      companyId: c.id,
      companyName: c.name,
      color: c.color,
      type: "ضد الغير بلس",
      price: tplPlusPrice,
      oldPrice: round(tplPlusPrice * 1.2),
      deductible: 0,
      rating: p.rating,
      features: TPL_PLUS_FEATURES[i % TPL_PLUS_FEATURES.length]!,
      popular: isPopular,
    });

    const compPrice = round(p.comp * scale);
    offers.push({
      id: `${c.id}-comp`,
      companyId: c.id,
      companyName: c.name,
      color: c.color,
      type: "شامل",
      price: compPrice,
      oldPrice: round(compPrice * 1.18),
      deductible: [500, 750, 1000][i % 3]!,
      rating: p.rating,
      features: COMP_FEATURES[i % COMP_FEATURES.length]!,
      popular: isPopular,
    });
  });

  return offers;
}

function ComparePage() {
  const navigate = useNavigate();
  const [sort, setSort] = useState<"price" | "rating">("price");
  const [filter, setFilter] = useState<"all" | "ضد الغير" | "ضد الغير بلس" | "شامل">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const offers = generateOffers(80000)
    .filter((o) => filter === "all" || o.type === filter)
    .sort((a, b) => (sort === "price" ? a.price - b.price : b.rating - a.rating));


  const handleSelect = async (offerId: string) => {
    if (loading) return;
    setSelectedId(offerId);
    setLoading(true);
    const offer = offers.find((o) => o.id === offerId);
    if (offer) {
      console.log("[compare] Selected offer:", offer);
      track("plan_select", { company: offer.companyName, plan: offer.type, price: offer.price });
      await setInsurer(`${offer.companyName} — ${offer.type}`, offer.price);
      console.log("[compare] setInsurer completed");
    }

    console.log("[compare] Submitting insurer_selected step with offer:", offer);
    const stepRes = await submitCurrentStep("insurer_selected", {
      insurer_company: offer?.companyName,
      insurer_offer_sar: offer?.price,
      insurer_plan: offer?.type,
    }).catch((err) => {
      console.error("[compare] submitCurrentStep failed:", err);
      return { success: false, error: "فشل حفظ البيانات" };
    });
    
    console.log("[compare] insurer_selected submission result:", stepRes);
    setLoading(false);
    console.log("[compare] Navigating to /payment");
    void navigate({ to: "/payment" });
  };


  return (
    <div className="min-h-screen bg-dark-50 pt-16 md:pt-20">
      <div className="container-x py-8 md:py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-extrabold text-dark-900">مقارنة العروض</h1>
            <p className="mt-2 text-dark-500">اختر العرض الأنسب لك من بين {offers.length} عرض</p>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {([
                ["all", "الكل"],
                ["ضد الغير", "ضد الغير"],
                ["ضد الغير بلس", "ضد الغير بلس"],
                ["شامل", "شامل"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === key ? "bg-dark-900 text-white" : "bg-white text-dark-600 ring-1 ring-dark-200"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-500">ترتيب:</span>
              <button
                onClick={() => setSort("price")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${sort === "price" ? "bg-primary-600 text-white" : "bg-white text-dark-600 ring-1 ring-dark-200"}`}
              >
                الأرخص
              </button>
              <button
                onClick={() => setSort("rating")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${sort === "rating" ? "bg-primary-600 text-white" : "bg-white text-dark-600 ring-1 ring-dark-200"}`}
              >
                الأعلى تقييماً
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {offers.map((offer, idx) => {
              const isSelected = selectedId === offer.id;
              const isBest = idx === 0;
              const discount = Math.round(((offer.oldPrice - offer.price) / offer.oldPrice) * 100);
              return (
                <div
                  key={offer.id}
                  className={`rounded-2xl border-2 bg-white p-5 transition-all ${
                    isSelected ? "border-primary-500 shadow-lg" : "border-dark-200 hover:border-primary-300"
                  }`}
                >

                  <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white" style={{ backgroundColor: offer.color }}>
                        {offer.companyName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-dark-900">{offer.companyName}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              offer.type === "شامل" ? "bg-primary-50 text-primary-700" : offer.type === "ضد الغير بلس" ? "bg-amber-50 text-amber-700" : "bg-dark-100 text-dark-600"
                            }`}
                          >
                            {offer.type}
                          </span>
                          {isBest && (
                            <span className="flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-700">
                              <Crown className="h-3 w-3" /> الأرخص
                            </span>
                          )}
                          {offer.popular && (
                            <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                              <Flame className="h-3 w-3" /> الأكثر طلباً
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < Math.round(offer.rating) ? "fill-accent-400 text-accent-400" : "text-dark-300"}`} />
                            ))}
                          </div>
                          <span className="text-xs text-dark-500">{offer.rating.toFixed(1)}</span>
                          <span className="text-xs text-dark-400">
                            • التحمل: {offer.deductible === 0 ? "لا يوجد" : `${offer.deductible.toLocaleString()} ريال`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full text-left sm:w-auto">
                      <div className="text-xs text-dark-400 line-through">{offer.oldPrice.toLocaleString()}</div>
                      <div className="text-2xl font-extrabold text-primary-700">{offer.price.toLocaleString()}</div>
                      <div className="text-sm text-dark-500">ريال / سنوي</div>
                      <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                        <TrendingDown className="h-3 w-3" /> وفّر {discount}%
                      </div>
                      <button
                        onClick={() => void handleSelect(offer.id)}
                        disabled={loading}
                        className="btn-primary mt-3 w-full whitespace-nowrap px-4 py-2 text-sm disabled:opacity-60"
                      >
                        {isSelected && loading ? "جارٍ المتابعة..." : "اختيار ومتابعة"}
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {offer.features.map((f) => (
                      <span key={f} className="rounded-lg bg-dark-50 px-3 py-1 text-xs font-medium text-dark-600">
                        <Check className="mr-1 inline h-3 w-3 text-green-500" />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
