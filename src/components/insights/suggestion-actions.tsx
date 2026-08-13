"use client";

import { useRouter } from "next/navigation";
import {
  dismissSuggestionAction,
  reviewSuggestionAction,
} from "@/app/actions/policy";
import { Button } from "@/components/ui/button";

export function SuggestionActions({ id }: { id: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={async () => {
          await reviewSuggestionAction(id);
          router.refresh();
        }}
      >
        Review suggestion
      </Button>
      <Button
        variant="outline"
        onClick={async () => {
          await dismissSuggestionAction(id);
          router.refresh();
        }}
      >
        Dismiss
      </Button>
    </div>
  );
}
