import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Direcciones visuales",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VisualDirectionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
