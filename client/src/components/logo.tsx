import { Shield } from "lucide-react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: "dark" | "light";
}

export default function Logo({ className = "", showText = true, variant = "dark" }: LogoProps) {
  const textColor = variant === "light" ? "text-white" : "text-dark-900";
  const subColor = variant === "light" ? "text-primary-200" : "text-primary-600";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-600/30">
        <Shield className="h-6 w-6 text-white" strokeWidth={2.5} />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`text-xl font-extrabold ${textColor}`}>بيكير</span>
          <span className={`text-[10px] font-medium ${subColor}`}>BeCaree</span>
        </div>
      )}
    </div>
  );
}
