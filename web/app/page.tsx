import { MarketingNav } from "@/components/landing/MarketingNav";
import { Hero } from "@/components/landing/Hero";
import { ConceptStrip } from "@/components/landing/ConceptStrip";
import { Pillars } from "@/components/landing/Pillars";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Architecture } from "@/components/landing/Architecture";
import { SelfHost } from "@/components/landing/SelfHost";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Landing() {
  return (
    <>
      <MarketingNav />
      <Hero />
      <ConceptStrip />
      <Pillars />
      <HowItWorks />
      <Architecture />
      <SelfHost />
      <LandingFooter />
    </>
  );
}
