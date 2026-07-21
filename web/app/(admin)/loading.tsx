import { HoneycombLoader } from "@/components/ui/HoneycombLoader";

export default function AdminLoading() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <HoneycombLoader label="Abriendo administración" />
    </main>
  );
}
