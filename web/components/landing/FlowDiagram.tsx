function MobileNode({
  title,
  subtitle,
  caption,
  accent,
  glyph,
}: {
  title: string;
  subtitle: string;
  caption: string;
  accent?: boolean;
  glyph: React.ReactNode;
}) {
  return (
    <div
      className={
        "rounded-[8px] border bg-[#0D0D0D] px-5 py-5 flex items-center gap-4 " +
        (accent ? "border-[var(--color-accent)]" : "border-[#2a2a2a]")
      }
    >
      <div className="w-14 h-14 shrink-0 flex items-center justify-center">
        {glyph}
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-bold text-white">{title}</div>
        <div className="text-[12px] text-[var(--color-fg-3)]">{subtitle}</div>
        <div className="text-[11px] italic text-[var(--color-fg-4)] mt-1 truncate">
          {caption}
        </div>
      </div>
    </div>
  );
}

function MobileArrow() {
  return (
    <div className="flex justify-center my-2 text-[var(--color-accent)] text-[20px] leading-none">
      ↓
    </div>
  );
}

export function FlowDiagram() {
  return (
    <section
      id="what"
      className="border-y border-[#1f1f1f] px-4 sm:px-6 lg:px-12 py-12 sm:py-16 bg-[#080808]"
    >
      <div className="max-w-[1024px]">
        <div className="text-[12px] tracking-[2px] uppercase text-[var(--color-accent)] mb-2">
          {"// "}how it works
        </div>
        <h2 className="text-[24px] sm:text-[32px] font-bold tracking-[-1px] text-[var(--color-fg-0)] mb-6">
          Three steps, no code.
        </h2>

        <div className="md:hidden flex flex-col">
          <MobileNode
            title="Your devices"
            subtitle="send messages"
            caption="RabbitMQ · MQTT · Kafka"
            glyph={
              <svg viewBox="-32 -8 64 48" className="w-12 h-10">
                <path
                  d="M -24 8 Q 0 -16 24 8"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <path
                  d="M -14 16 Q 0 0 14 16"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <circle cx={0} cy={24} r={3.5} fill="var(--color-accent)" />
              </svg>
            }
          />
          <MobileArrow />
          <MobileNode
            title="iot bees"
            subtitle="cleans & routes"
            caption="validation · transforms · replicas"
            accent
            glyph={
              <svg viewBox="80 46 60 64" className="w-12 h-12">
                <polygon
                  points="110,52 134,66 134,92 110,106 86,92 86,66"
                  fill="var(--color-accent)"
                />
                <text
                  x={110}
                  y={86}
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                  fontSize={22}
                  fontWeight={800}
                  fill="#0A0A0A"
                >
                  b
                </text>
              </svg>
            }
          />
          <MobileArrow />
          <MobileNode
            title="Your database"
            subtitle="ready to query"
            caption="InfluxDB · local log"
            glyph={
              <svg viewBox="-30 -16 60 60" className="w-12 h-12">
                <ellipse
                  cx={0}
                  cy={-4}
                  rx={24}
                  ry={6}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                />
                <path
                  d="M -24 -4 L -24 26 A 24 6 0 0 0 24 26 L 24 -4"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                />
                <ellipse
                  cx={0}
                  cy={8}
                  rx={24}
                  ry={6}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={1}
                  opacity={0.5}
                />
              </svg>
            }
          />
        </div>

        <svg
          viewBox="0 0 980 220"
          xmlns="http://www.w3.org/2000/svg"
          className="hidden md:block w-full h-auto max-w-[920px]"
          aria-label="Your devices send messages to iot bees, which cleans and routes them to your database"
        >
          {/* devices node */}
          <g transform="translate(20,30)">
            <rect
              x={0}
              y={0}
              width={280}
              height={160}
              rx={8}
              fill="#0D0D0D"
              stroke="#2a2a2a"
              strokeWidth={1.5}
            />
            <g transform="translate(140,52)">
              <path
                d="M -24 8 Q 0 -16 24 8"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={3}
                strokeLinecap="round"
              />
              <path
                d="M -14 16 Q 0 0 14 16"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={3}
                strokeLinecap="round"
              />
              <circle cx={0} cy={24} r={3.5} fill="var(--color-accent)" />
            </g>
            <text
              x={140}
              y={110}
              textAnchor="middle"
              fill="#fff"
              fontSize={15}
              fontWeight={700}
              fontFamily="-apple-system, system-ui, sans-serif"
            >
              Your devices
            </text>
            <text
              x={140}
              y={128}
              textAnchor="middle"
              fill="#999"
              fontSize={12}
              fontFamily="-apple-system, system-ui, sans-serif"
            >
              send messages
            </text>
            <text
              x={140}
              y={146}
              textAnchor="middle"
              fill="#666"
              fontSize={11}
              fontStyle="italic"
              fontFamily="-apple-system, system-ui, sans-serif"
            >
              RabbitMQ · MQTT · Kafka
            </text>
          </g>

          {/* arrow 1 */}
          <path
            d="M 310 110 L 360 110"
            stroke="var(--color-accent)"
            strokeWidth={2}
            fill="none"
            strokeDasharray="4 6"
            className="flow-line"
          />
          <polygon points="360,105 368,110 360,115" fill="var(--color-accent)" />

          {/* iot bee node */}
          <g transform="translate(370,30)">
            <rect
              x={0}
              y={0}
              width={220}
              height={160}
              rx={8}
              fill="#0D0D0D"
              stroke="var(--color-accent)"
              strokeWidth={1.5}
            />
            <polygon
              points="110,52 134,66 134,92 110,106 86,92 86,66"
              fill="var(--color-accent)"
            />
            <text
              x={110}
              y={86}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize={22}
              fontWeight={800}
              fill="#0A0A0A"
            >
              b
            </text>
            <text
              x={110}
              y={130}
              textAnchor="middle"
              fill="#fff"
              fontSize={15}
              fontWeight={700}
              fontFamily="-apple-system, system-ui, sans-serif"
            >
              iot bees
            </text>
            <text
              x={110}
              y={148}
              textAnchor="middle"
              fill="#999"
              fontSize={12}
              fontFamily="-apple-system, system-ui, sans-serif"
            >
              cleans &amp; routes
            </text>
          </g>

          {/* arrow 2 */}
          <path
            d="M 600 110 L 650 110"
            stroke="var(--color-accent)"
            strokeWidth={2}
            fill="none"
            strokeDasharray="4 6"
            className="flow-line"
          />
          <polygon points="650,105 658,110 650,115" fill="var(--color-accent)" />

          {/* database node */}
          <g transform="translate(660,30)">
            <rect
              x={0}
              y={0}
              width={280}
              height={160}
              rx={8}
              fill="#0D0D0D"
              stroke="#2a2a2a"
              strokeWidth={1.5}
            />
            <g transform="translate(140,52)">
              <ellipse
                cx={0}
                cy={-4}
                rx={24}
                ry={6}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
              />
              <path
                d="M -24 -4 L -24 26 A 24 6 0 0 0 24 26 L 24 -4"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
              />
              <ellipse
                cx={0}
                cy={8}
                rx={24}
                ry={6}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={1}
                opacity={0.5}
              />
            </g>
            <text
              x={140}
              y={110}
              textAnchor="middle"
              fill="#fff"
              fontSize={15}
              fontWeight={700}
              fontFamily="-apple-system, system-ui, sans-serif"
            >
              Your database
            </text>
            <text
              x={140}
              y={128}
              textAnchor="middle"
              fill="#999"
              fontSize={12}
              fontFamily="-apple-system, system-ui, sans-serif"
            >
              ready to query
            </text>
            <text
              x={140}
              y={146}
              textAnchor="middle"
              fill="#666"
              fontSize={11}
              fontStyle="italic"
              fontFamily="-apple-system, system-ui, sans-serif"
            >
              InfluxDB · local log
            </text>
          </g>
        </svg>
      </div>
    </section>
  );
}
