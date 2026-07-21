import { HoneycombLoader } from "@/components/ui/HoneycombLoader";

export default function AppLoading() {
  return (
    <div className="grid min-h-[50vh] place-items-center px-4">
      <HoneycombLoader />
    </div>
  );
}
