import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:underline",
        className,
      )}
    >
      {children}
      <ExternalLinkIcon className="size-3.5 shrink-0 opacity-70" />
    </a>
  );
}
