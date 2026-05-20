import { MarketingNav } from "@/components/landing/MarketingNav";
import { Hero } from "@/components/landing/Hero";
import { FlowDiagram } from "@/components/landing/FlowDiagram";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { UseCases } from "@/components/landing/UseCases";
import { Architecture } from "@/components/landing/Architecture";
import { SelfHost } from "@/components/landing/SelfHost";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Landing() {
  return (
    <>
      <MarketingNav />
      <Hero />
      <FlowDiagram />
      <HowItWorks />
      <UseCases />
      <Architecture />
      <SelfHost />
      <LandingFooter />
    </>
  );
}
