import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "iot bees",
  description:
    "Rust-based ingestion pipelines for IoT data. RabbitMQ, MQTT, Kafka in. InfluxDB out.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
