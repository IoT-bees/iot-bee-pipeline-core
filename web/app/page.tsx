import { MarketingNav } from "@/components/landing/MarketingNav";
import { Hero } from "@/components/landing/Hero";
import { LivePipeline } from "@/components/landing/LivePipeline";
import { FlowDiagram } from "@/components/landing/FlowDiagram";
import { BeforeAfter } from "@/components/landing/BeforeAfter";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { getPublicContactSettings } from "@/lib/api/contactServer";
import { site, siteUrl } from "@/lib/site";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: site.name,
      url: siteUrl.toString(),
      description: site.description,
      areaServed: "Latinoamérica",
    },
    {
      "@type": "SoftwareApplication",
      name: site.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteUrl.toString(),
      description: site.description,
      areaServed: "Latinoamérica",
    },
  ],
};

export default async function Landing() {
  const contact = await getPublicContactSettings();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main>
        <MarketingNav />
        <Hero />
        <LivePipeline />
        <FlowDiagram />
        <BeforeAfter />
        <LandingFooter contact={contact} />
      </main>
    </>
  );
}
