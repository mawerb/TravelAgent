import { cn } from "@/lib/utils";

const tones = {
  compliant: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25",
  exception: "bg-amber-500/10 text-amber-200 ring-amber-400/25",
  out_of_policy: "bg-red-500/15 text-red-300 ring-red-400/25",
  info: "bg-sky-500/15 text-sky-200 ring-sky-400/25",
  neutral: "bg-muted text-zinc-300 ring-white/10",
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
