"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MessageSquareText } from "lucide-react";
import { requestFeedbackSmsAction } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";

export function RequestFeedbackSmsButton({
  bookingId,
  className,
}: {
  bookingId: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        className="gap-1.5"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMessage(null);
          startTransition(async () => {
            const result = await requestFeedbackSmsAction(bookingId);
            if (!result.ok) {
              setMessage(result.error);
              return;
            }
            setMessage(
              result.demo
                ? `Demo SMS logged for ${result.to} (add Twilio keys to send for real)`
                : `Feedback SMS sent to ${result.to}`,
            );
            router.refresh();
          });
        }}
      >
        <MessageSquareText className="size-3.5" />
        {pending ? "Sending…" : "Send feedback SMS"}
      </Button>
      {message ? (
        <p className="mt-2 text-xs text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
