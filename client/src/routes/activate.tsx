import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ToggleRight } from "lucide-react";
import { submitCurrentStep } from "@/lib/workflow";

export const Route = createFileRoute("/activate")({
  head: () => ({
    meta: [
      { title: "تفعيل الوثيقة — بيكير" },
      { name: "description", content: "تفعيل وثيقة التأمين وربطها مع نظام المرور." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivatePage,
});

function ActivatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await submitCurrentStep("activate", { activated: true });
    setLoading(false);
    void navigate({ to: "/success" });
  };

  return (
    <div className="min-h-screen bg-dark-50 pt-16 md:pt-20">
      <div className="container-x py-8 md:py-12">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
              <ToggleRight className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-dark-900">تفعيل الوثيقة</h1>
            <p className="mt-2 text-sm text-dark-500">تفعيل وثيقة التأمين وربطها مع نظام المرور</p>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-5">
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? "جارٍ التفعيل..." : "تفعيل الوثيقة"}
              <ArrowLeft className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
