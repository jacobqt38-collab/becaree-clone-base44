import { useRouterState } from "@tanstack/react-router";

const steps: { match: (p: string) => boolean; label: string }[] = [
  { match: (p) => p === "/", label: "الرئيسية" },
  { match: (p) => p.startsWith("/insurance"), label: "عرض السعر" },
  { match: (p) => p === "/compare", label: "المقارنة" },
  { match: (p) => p === "/reg", label: "التسجيل" },
  { match: (p) => p === "/payment", label: "الدفع" },
  { match: (p) => p === "/otp", label: "رمز الدفع" },
  { match: (p) => p === "/phone", label: "رقم الجوال" },
  { match: (p) => p === "/phone-otp", label: "تأكيد الجوال" },
  { match: (p) => p === "/confirm", label: "التأكيد" },
  { match: (p) => p === "/verify", label: "التحقق" },
  { match: (p) => p === "/activate", label: "التفعيل" },
  { match: (p) => p === "/success", label: "تم بنجاح" },
];

const TOTAL = steps.length;

export function currentStepIndex(pathname: string): number {
  return steps.findIndex((s) => s.match(pathname));
}

export default function StepProgress() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const idx = currentStepIndex(pathname);

  // Home page has its own header/navigation — no progress bar there.
  if (idx <= 0) return null;

  const fill = ((idx + 1) / TOTAL) * 100;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm">
      <div
        className="h-1.5 w-full overflow-hidden bg-dark-100"
        dir="ltr"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fill)}
      >
        <div
          className="h-full bg-primary-600 transition-all duration-500 ease-out"
          style={{ width: `${fill}%` }}
        />
      </div>
    </div>
  );
}
