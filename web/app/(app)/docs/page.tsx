import Link from "next/link";

export const metadata = {
  title: "Ayuda",
};

const sections = [
  ["inicio", "Inicio"],
  ["flujo", "Crear un flujo"],
  ["conexiones", "Conexiones"],
  ["datos", "Datos y reglas"],
  ["entrega", "Entrega"],
  ["operacion", "Operación"],
  ["api", "API"],
] as const;

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-[var(--color-border-subtle)] py-10 first:border-t-0 first:pt-0">
      <div className="text-[11px] uppercase text-[var(--color-accent)]">{number}</div>
      <h2 className="mt-2 text-[27px] font-semibold text-[var(--color-fg-0)]">{title}</h2>
      <div className="mt-5 max-w-[760px] space-y-4 text-[14px] leading-[1.7] text-[var(--color-fg-2)]">
        {children}
      </div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[2px] border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-1.5 py-[1px] font-mono text-[12px] text-[var(--color-fg-1)]">
      {children}
    </code>
  );
}

export default function DocsPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <header className="border-b border-[var(--color-accent)] pb-8">
        <p className="text-[11px] uppercase text-[var(--color-accent)]">AYUDA</p>
        <h1 className="mt-3 text-[34px] font-semibold text-[var(--color-fg-0)] sm:text-[42px]">
          De la conexión a la entrega.
        </h1>
        <p className="mt-3 max-w-[700px] text-[15px] leading-[1.7] text-[var(--color-fg-3)]">
          Configura y opera cada proyecto de cliente desde una sola aplicación: broker, validación y destino.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-6 border-l border-[var(--color-border-subtle)]" aria-label="Contenido de la guía">
            {sections.map(([id, label], index) => (
              <a
                key={id}
                href={`#${id}`}
                className="block border-l-2 border-l-transparent px-4 py-2 text-[13px] text-[var(--color-fg-3)] transition-colors hover:border-l-[var(--color-accent)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-fg-0)]"
              >
                <span className="mr-2 text-[var(--color-fg-4)]">{String(index + 1).padStart(2, "0")}</span>
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <article>
          <Section id="inicio" number="01" title="Antes de crear el primer proyecto">
            <p>
              Cada instalación se construye con tres recursos: una conexión que recibe mensajes, una definición de datos que los valida y un destino que los entrega. El proyecto une esos tres recursos y controla su estado.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Conexión", "El acceso al equipo o red del cliente."],
                ["Esquema", "Los campos y reglas que debe cumplir cada mensaje."],
                ["Destino", "El sistema que recibe los datos procesados."],
              ].map(([title, text]) => (
                <div key={title} className="border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-4">
                  <strong className="block text-[13px] text-[var(--color-fg-0)]">{title}</strong>
                  <span className="mt-1 block text-[12px] leading-[1.55] text-[var(--color-fg-3)]">{text}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="flujo" number="02" title="Crear un flujo de datos">
            <ol className="space-y-4">
              <li><strong className="text-[var(--color-fg-0)]">1. Crea la conexión.</strong> Ve a <Link className="text-[var(--color-accent)] hover:underline" href="/sources/new">Conexiones</Link> y registra el acceso del cliente.</li>
              <li><strong className="text-[var(--color-fg-0)]">2. Define el esquema.</strong> En <Link className="text-[var(--color-accent)] hover:underline" href="/schemas/new">Esquemas</Link>, declara los campos esperados y sus reglas.</li>
              <li><strong className="text-[var(--color-fg-0)]">3. Configura el destino.</strong> En <Link className="text-[var(--color-accent)] hover:underline" href="/stores/new">Destinos</Link>, indica dónde debe terminar la información.</li>
              <li><strong className="text-[var(--color-fg-0)]">4. Une los tres elementos.</strong> Abre <Link className="text-[var(--color-accent)] hover:underline" href="/pipelines/new">Nuevo proyecto</Link>, asígnalos y crea el proyecto.</li>
            </ol>
          </Section>

          <Section id="conexiones" number="03" title="Conexiones disponibles">
            <p>Las conexiones se crean una sola vez y pueden utilizarse en uno o varios proyectos del mismo cliente.</p>
            <div className="overflow-x-auto border border-[var(--color-border)]">
              <table className="w-full min-w-[520px] text-left text-[13px]">
                <thead className="text-[var(--color-accent)]">
                  <tr><th className="border-b border-[var(--color-accent)] px-4 py-3 font-normal">Tipo</th><th className="border-b border-[var(--color-accent)] px-4 py-3 font-normal">Datos necesarios</th></tr>
                </thead>
                <tbody className="text-[var(--color-fg-2)]">
                  <tr><td className="border-b border-[var(--color-border-subtle)] px-4 py-3 font-semibold text-[var(--color-fg-0)]">RabbitMQ</td><td className="border-b border-[var(--color-border-subtle)] px-4 py-3">URL AMQP y cola.</td></tr>
                  <tr><td className="border-b border-[var(--color-border-subtle)] px-4 py-3 font-semibold text-[var(--color-fg-0)]">MQTT</td><td className="border-b border-[var(--color-border-subtle)] px-4 py-3">URL del broker y tópico.</td></tr>
                  <tr><td className="px-4 py-3 font-semibold text-[var(--color-fg-0)]">Kafka</td><td className="px-4 py-3">Brokers, tópico y grupo de consumidores.</td></tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="datos" number="04" title="Datos y reglas">
            <p>
              El esquema protege la calidad de la información antes de que salga de tu operación. Define cuáles campos son obligatorios, su tipo, rangos válidos y valores por defecto. Los mensajes que no cumplen no detienen el proyecto: se rechazan y quedan registrados para revisión.
            </p>
            <p>
              Usa nombres estables y legibles para los campos, por ejemplo <Code>temperatura</Code>, <Code>humedad</Code> o <Code>equipo_id</Code>. Así evitas transformaciones manuales en el sistema del cliente.
            </p>
          </Section>

          <Section id="entrega" number="05" title="Entrega al sistema del cliente">
            <p>Los destinos disponibles permiten llevar la información validada al lugar donde el cliente ya trabaja.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong className="text-[var(--color-fg-0)]">InfluxDB:</strong> usa medición, base de datos y campos de etiqueta para series de tiempo.</li>
              <li><strong className="text-[var(--color-fg-0)]">Webhook:</strong> entrega cada evento a una URL del sistema del cliente.</li>
              <li><strong className="text-[var(--color-fg-0)]">Registro local:</strong> conserva eventos en formato JSON por línea para diagnóstico y pruebas.</li>
            </ul>
          </Section>

          <Section id="operacion" number="06" title="Operación diaria">
            <p>
              Desde <Link className="text-[var(--color-accent)] hover:underline" href="/pipelines">Proyectos</Link> puedes iniciar, detener y revisar el estado de cada proyecto. Antes de iniciar, confirma que la conexión, las reglas y el destino correspondan al cliente correcto.
            </p>
            <div className="border-l-2 border-l-[var(--color-accent)] bg-[var(--color-bg-elev)] p-4 text-[13px] text-[var(--color-fg-2)]">
              No guardes contraseñas, tokens ni claves privadas dentro de los nombres o descripciones visibles del proyecto. Usa la configuración específica de cada conexión.
            </div>
          </Section>

          <Section id="api" number="07" title="API técnica">
            <p>
              La interfaz usa la misma API REST que puedes integrar desde otros sistemas. La referencia completa está disponible en Swagger desde el backend en <Code>/swagger-ui/</Code>.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Conexiones", "GET y POST /data-sources"],
                ["Destinos", "GET y POST /data-stores"],
                ["Esquemas", "GET y POST /validation-schemas"],
                ["Proyectos", "GET y POST /pipelines"],
              ].map(([title, path]) => (
                <div key={title} className="border border-[var(--color-border)] bg-[var(--color-bg-panel)] px-4 py-3">
                  <strong className="block text-[13px] text-[var(--color-fg-0)]">{title}</strong>
                  <span className="mt-1 block font-mono text-[12px] text-[var(--color-fg-3)]">{path}</span>
                </div>
              ))}
            </div>
          </Section>
        </article>
      </div>
    </div>
  );
}
