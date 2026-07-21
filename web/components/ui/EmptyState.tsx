import { Button } from "./Button";

export function EmptyState({
  message,
  ctaLabel,
  onCta,
}: {
  message: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="text-center py-16">
      <div className="t-mono mb-4">{"// "}{message}</div>
      {ctaLabel && (
        <Button variant="primary" onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
