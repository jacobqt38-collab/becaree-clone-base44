import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, Home, ShieldCheck } from "lucide-react";
import { submitCurrentStep } from "@/lib/workflow";

export const Route = createFileRoute("/success")({
  head: () => ({
    meta: [
      { title: "تم إصدار الوثيقة — بيكير" },
      { name: "description", content: "تم إصدار وثيقة التأمين بنجاح." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    void submitCurrentStep("confirmation", { completed: true }).then(() => setDone(true));
  }, []);

  return (
    <div className="min-h-screen bg-dark-50 pt-16 md:pt-20">
      <div className="container-x py-12">
        <div className="mx-auto max-w-md text-center">
          <div className="animate-bounce-in mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="h-14 w-14" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold text-dark-900">تم إصدار وثيقتك!</h1>
          <p className="mt-3 text-dark-500">تم إصدار وثيقة التأمين وربطها مع نظام المرور بنجاح.</p>

          <div className="mt-8 card text-right">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-dark-500">رقم الوثيقة</span>
                <span className="font-bold text-dark-900">POL-{Date.now().toString().slice(-8)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dark-500">الحالة</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 font-semibold text-green-700">
                  <ShieldCheck className="h-4 w-4" /> فعّالة
                </span>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <button className="btn-primary w-full">
                <Download className="h-5 w-5" />
                تحميل الوثيقة
              </button>
              <Link to="/" className="btn-accent w-full">
                <Home className="h-5 w-5" />
                العودة للرئيسية
              </Link>
            </div>
          </div>

          <p className="mt-4 text-xs text-dark-400">{done ? "تم تسجيل طلبك لدى فريق العمليات." : "جارٍ تسجيل الطلب..."}</p>
        </div>
      </div>
    </div>
  );
}
