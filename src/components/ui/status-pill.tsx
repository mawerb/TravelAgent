import { cn } from "@/lib/utils";

const tones = {
  compliant: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  exception: "bg-amber-50 text-amber-800 ring-amber-200",
  out_of_policy: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
  neutral: "bg-stone-100 text-stone-700 ring-stone-200",
} as const;

export function StatusPill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
