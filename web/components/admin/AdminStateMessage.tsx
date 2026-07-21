import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function AdminStateMessage({
  kind,
  title,
  description,
  onRetry,
}: {
  kind: "empty" | "error";
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  const isError = kind === "error";
  const Icon = isError ? AlertCircle : Inbox;

  return (
    <div
      className={`flex flex-col items-center px-5 py-12 text-center sm:px-10 ${
        isError
          ? "border border-[var(--color-danger)]/45 bg-[color-mix(in_srgb,var(--color-danger)_5%,var(--color-bg-panel))]"
          : "border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elev)]/45"
      }`}
      role={isError ? "alert" : "status"}
    >
      <Icon
        size={26}
        className={isError ? "text-[var(--color-danger)]" : "text-[var(--color-fg-3)]"}
        aria-hidden="true"
      />
      <h3 className="mt-3 text-[16px] font-semibold text-[var(--color-fg-0)]">{title}</h3>
      <p className="mt-1 max-w-xl text-[13px] leading-5 text-[var(--color-fg-2)]">{description}</p>
      {onRetry && (
        <Button className="mt-5" size="sm" variant="ghost" onClick={onRetry}>
          <RefreshCw size={15} aria-hidden="true" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
