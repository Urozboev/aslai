import { ShieldCheck } from "lucide-react";

interface VerifiedBadgeProps {
  verified?: boolean;
  size?: "sm" | "md";
}

export default function VerifiedBadge({ verified = true, size = "sm" }: VerifiedBadgeProps) {
  if (!verified) return null;

  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5 gap-0.5" : "text-xs px-2.5 py-1 gap-1";
  const iconSize = size === "sm" ? 10 : 14;

  return (
    <span
      className={`inline-flex items-center rounded-full bg-[#0EA5A4]/20 text-[#0EA5A4] font-medium ${sizeClasses} border border-[#0EA5A4]/30`}
    >
      <ShieldCheck size={iconSize} />
      Tasdiqlangan
    </span>
  );
}
