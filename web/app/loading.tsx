import { HoneycombLoader } from "@/components/ui/HoneycombLoader";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <HoneycombLoader />
    </main>
  );
}
