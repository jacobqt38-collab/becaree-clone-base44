import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FileCheck } from "lucide-react";
import { submitCurrentStep } from "@/lib/workflow";

export const Route = createFileRoute("/confirm")({
  head: () => ({
    meta: [
      { title: "تأكيد البيانات — بيكير" },
      { name: "description", content: "راجع بياناتك قبل إصدار الوثيقة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const navigate = useNavigate();
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) return;
    setLoading(true);
    await submitCurrentStep("confirm", { agreed: true });
    setLoading(false);
    void navigate({ to: "/verify" });
  };

  return (
    <div className="min-h-screen bg-dark-50 pt-16 md:pt-20">
      <div className="container-x py-8 md:py-12">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
              <FileCheck className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-dark-900">تأكيد البيانات</h1>
            <p className="mt-2 text-sm text-dark-500">راجع بياناتك قبل الإصدار</p>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-5">
            <div className="space-y-2 rounded-xl bg-dark-50 p-4 text-sm text-dark-600">
              <div className="flex justify-between"><span>الاسم</span><span className="font-medium text-dark-900">—</span></div>
              <div className="flex justify-between"><span>الهوية</span><span className="font-medium text-dark-900">—</span></div>
              <div className="flex justify-between"><span>المركبة</span><span className="font-medium text-dark-900">—</span></div>
              <div className="flex justify-between"><span>العرض</span><span className="font-medium text-dark-900">—</span></div>
            </div>

            <label className="flex items-center gap-3 text-sm text-dark-700">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-5 w-5 rounded border-dark-300 text-primary-600 focus:ring-primary-500" />
              أوافق على الشروط والأحكام وأقر بصحة البيانات
            </label>

            <button type="submit" disabled={!agree || loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? "جارٍ التأكيد..." : "تأكيد ومتابعة"}
              <ArrowLeft className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
