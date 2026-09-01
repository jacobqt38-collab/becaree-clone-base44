import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ScanLine } from "lucide-react";
import { submitCurrentStep } from "@/lib/workflow";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "التحقق — بيكير" },
      { name: "description", content: "تحقق من هويتك عبر نفاذ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await submitCurrentStep("verify", { verified: true });
    setLoading(false);
    void navigate({ to: "/activate" });
  };

  return (
    <div className="min-h-screen bg-dark-50 pt-16 md:pt-20">
      <div className="container-x py-8 md:py-12">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
              <ScanLine className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-dark-900">التحقق من الهوية</h1>
            <p className="mt-2 text-sm text-dark-500">سنتحقق من هويتك عبر نفاذ</p>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-5">
            <div className="flex items-center gap-3 rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-700">
              <ScanLine className="h-5 w-5" />
              سيتم فتح تطبيق نفاذ للتحقق
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? "جارٍ التحقق..." : "بدء التحقق"}
              <ArrowLeft className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
