import { BeeLogo } from "@/components/Logo";

export function BeeDeliveryDivider() {
  return (
    <div className="relative mx-auto h-16 max-w-[1080px] overflow-hidden" aria-hidden="true">
      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--landing-border)]" />
      <div className="absolute top-[calc(50%_-_16px)] bee-delivery bg-[var(--color-bg-base)] px-2">
        <BeeLogo size={28} />
      </div>
    </div>
  );
}
