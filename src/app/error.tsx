"use client";

import { StateNotice } from "@/components/ui/StateNotice";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-svh max-w-[720px] flex-col justify-center px-5 md:px-8">
      <StateNotice kind="error" title="SOMETHING TRIPPED" body={error.message || "An unexpected error interrupted the page."} onRetry={() => reset()} />
    </div>
  );
}
