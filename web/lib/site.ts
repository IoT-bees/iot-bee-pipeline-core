const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;

const normalizedSiteUrl = configuredSiteUrl
  ? configuredSiteUrl.startsWith("http")
    ? configuredSiteUrl
    : `https://${configuredSiteUrl}`
  : "http://localhost:3000";

export const siteUrl = new URL(normalizedSiteUrl);

export const site = {
  name: "iot bees",
  description:
    "Plataforma de datos IoT para integradores que entregan proyectos a clientes en Latinoamérica.",
};
