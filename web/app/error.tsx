"use client";

import { ErrorView } from "@/components/error/ErrorView";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorView
      code="500"
      eyebrow="server error"
      title="Something jammed inside the pipeline."
      body="The app hit an unexpected error while rendering this view. You can retry the request or return to the dashboard while we keep the machinery tidy."
      actions={[{ href: "/", label: "back to home", primary: true }]}
    />
  );
}
