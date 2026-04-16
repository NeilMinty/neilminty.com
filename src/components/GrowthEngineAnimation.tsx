import { useEffect, useRef, useState } from "react";

const SLATE = {
  50:  "#F8F9FA",
  100: "#F1F3F4",
  200: "#E8EAED",
  300: "#DADCE0",
  400: "#BDC1C6",
  500: "#80868B",
  600: "#5F6368",
  700: "#3C4043",
  800: "#202124",
  900: "#171717",
};
const GREEN   = "#1A6B4A";
const GREEN_L = "#E6F2EC";
const GREEN_M = "#2D8A62";

const SOURCES = [
  { id: "commerce",   label: "Commerce",        sub: "Shopify · Recharge",           color: "#2D6A2D" },
  { id: "email",      label: "Email",           sub: "Klaviyo",                       color: "#0F6E56" },
  { id: "paid",       label: "Paid media",      sub: "Meta · Google Ads",             color: "#854F0B" },
  { id: "analytics",  label: "Analytics",       sub: "GA4 · GSC · GMC · Hotjar",      color: "#185FA5" },
  { id: "loyalty",    label: "Loyalty & social",sub: "Yotpo · Judge.me · UGC",        color: "#534AB7" },
  { id: "intel",      label: "Intelligence",    sub: "Perplexity · Firecrawl · DFW",  color: "#993C1D" },
];

const CLUSTERS = [
  {
    id: "revenue",
    label: "Revenue",
    color: "#BA7517",
    bg: "#FFFBF0",
    border: "#F0C060",
    agents: ["Retention Specialist", "Pricing Intelligence", "Margin Intelligence", "Promotions", "Loyalty & Referral Agent"],
  },
  {
    id: "acquisition",
    label: "Acquisition",
    color: "#2D6A2D",
    bg: "#F2FAF2",
    border: "#8BC88B",
    agents: ["Paid Media Buyer", "Earned Media Agent", "SEO Agent"],
  },
  {
    id: "optimisation",
    label: "Optimisation",
    color: "#185FA5",
    bg: "#F0F6FE",
    border: "#90BDF0",
    agents: ["CRO Agent", "Experimentation Agent", "Analytics Agent"],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    color: "#993C1D",
    bg: "#FEF4F0",
    border: "#F0A080",
    agents: ["Market Research Agent", "Product Intelligence Agent", "Content Architect"],
  },
  {
    id: "engagement",
    label: "Engagement",
    color: "#534AB7",
    bg: "#F4F3FE",
    border: "#B0A8E8",
    agents: ["Email Strategist", "GEO Readiness Audit"],
  },
];

const HUB_LINES = [
  "Signal processing",
  "Cohort modelling",
  "Prediction engine",
  "Confidence scoring",
  "Multi-tenant vault",
  "CM1 scenario ranges",
];

function Pipe({ d, color, speed = 1.8, reverse = false }: { d: string; color: string; speed?: number; reverse?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={1.2}
      strokeDasharray="5 4"
      style={{
        animation: `dashFlow ${speed}s linear infinite ${reverse ? "reverse" : "normal"}`,
      }}
    />
  );
}

function SignalDot({ cx, cy, color, delay = 0 }: { cx: number; cy: number; color: string; delay?: number }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={color}
      opacity={0.85}
      style={{ animation: `sigPulse 2.2s ease-in-out infinite ${delay}s` }}
    />
  );
}

function SourceChip({ x, y, w = 130, h = 50, label, sub, color }: { x: number; y: number; w?: number; h?: number; label: string; sub: string; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={7} fill={color + "18"} stroke={color} strokeWidth={0.6} />
      <text x={x + w / 2} y={y + 18} textAnchor="middle" fontSize={11} fontWeight={500} fill={color} fontFamily="'Plus Jakarta Sans', sans-serif">{label}</text>
      <text x={x + w / 2} y={y + 35} textAnchor="middle" fontSize={9} fill={color} opacity={0.75} fontFamily="'Plus Jakarta Sans', sans-serif">{sub}</text>
    </g>
  );
}

function ClusterBox({ x, y, w, cluster }: { x: number; y: number; w: number; cluster: { label: string; color: string; bg: string; border: string; agents: string[] } }) {
  const lineH = 16;
  const paddingTop = 36;
  const h = paddingTop + cluster.agents.length * lineH + 10;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={9} fill={cluster.bg} stroke={cluster.border} strokeWidth={0.6} />
      <text x={x + w / 2} y={y + 21} textAnchor="middle" fontSize={10} fontWeight={600} fill={cluster.color} fontFamily="'Plus Jakarta Sans', sans-serif">{cluster.label}</text>
      {cluster.agents.map((agent, i) => (
        <text
          key={agent}
          x={x + w / 2}
          y={y + paddingTop + i * lineH}
          textAnchor="middle"
          fontSize={9}
          fill={cluster.color}
          opacity={0.8}
          fontFamily="'Plus Jakarta Sans', sans-serif"
        >
          {agent}
        </text>
      ))}
    </g>
  );
}

export default function GrowthEngineAnimation() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const VW = 700;
  const SX = 14, SW = 132, SH = 50, SGAP = 16;
  const sourceYs = SOURCES.map((_, i) => 90 + i * (SH + SGAP));

  const HX = 178, HY = 260, HW = 176, HH = 200;
  const hubCX = HX + HW / 2;
  const hubCY = HY + HH / 2;

  const CW = 184, CH = 46;
  const CX = hubCX - CW / 2;
  const CY = HY - CH - 30;

  const CLX = 396, CLW = 272;
  const clusterLineH = 16;
  const clusterPad = 36;
  let clusterY = 60;
  const clusterLayouts = CLUSTERS.map((c) => {
    const h = clusterPad + c.agents.length * clusterLineH + 10;
    const layout = { y: clusterY, h };
    clusterY += h + 12;
    return layout;
  });

  const hubLeftX  = HX;
  const hubRightX = HX + HW;

  const clusterTargets = CLUSTERS.map((c, i) => ({
    y: clusterLayouts[i].y + clusterLayouts[i].h / 2,
    color: c.color,
  }));

  const lastCluster = clusterLayouts[clusterLayouts.length - 1];
  const svgH = Math.max(
    sourceYs[sourceYs.length - 1] + SH + 40,
    lastCluster.y + lastCluster.h + 40,
    HY + HH + 60
  );

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        maxWidth: 800,
        margin: "0 auto",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      <style>{`
        @keyframes dashFlow { to { stroke-dashoffset: -22; } }
        @keyframes sigPulse { 0% { r: 4; opacity: .9; } 55% { r: 8; opacity: .3; } 100% { r: 4; opacity: .9; } }
        @keyframes hubPulse { 0%,100% { opacity: .18; } 50% { opacity: .45; } }
        @keyframes coordFade { 0%,100% { opacity: .85; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
      `}</style>

      <svg
        width="100%"
        viewBox={`0 0 ${VW} ${svgH}`}
        role="img"
        aria-label="Growth Engine architecture: 22 integrations in 6 source groups flow into the hub, distributing intelligence to 16 agents across 5 clusters."
      >
        <defs>
          <marker id="ge-arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={5} markerHeight={5} orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>

        {SOURCES.map((src, i) => (
          <SourceChip key={src.id} x={SX} y={sourceYs[i]} w={SW} h={SH} label={src.label} sub={src.sub} color={src.color} />
        ))}

        {SOURCES.map((src, i) => {
          const sy = sourceYs[i] + SH / 2;
          const ty = hubCY + (i - 2.5) * 18;
          return (
            <Pipe
              key={src.id}
              d={`M${SX + SW} ${sy} C${SX + SW + 50} ${sy},${hubLeftX - 30} ${ty},${hubLeftX} ${ty}`}
              color={src.color}
              speed={1.5 + i * 0.18}
            />
          );
        })}

        {[38, 50].map((r, i) => (
          <circle
            key={r}
            cx={hubCX} cy={hubCY} r={r}
            fill="none" stroke={GREEN} strokeWidth={0.5}
            style={{ animation: `hubPulse ${3 + i * 0.8}s ease-in-out infinite ${i * 0.9}s` }}
          />
        ))}

        <rect x={HX} y={HY} width={HW} height={HH} rx={13} fill={GREEN} fillOpacity={0.07} stroke={GREEN} strokeWidth={1.2} />
        <text x={hubCX} y={HY + 24} textAnchor="middle" fontSize={12} fontWeight={700} fill={GREEN} fontFamily="'Plus Jakarta Sans', sans-serif">Growth Engine</text>
        {HUB_LINES.map((line, i) => (
          <text key={line} x={hubCX} y={HY + 44 + i * 16} textAnchor="middle" fontSize={9} fill={GREEN_M} fontFamily="'Plus Jakarta Sans', sans-serif">{line}</text>
        ))}

        <Pipe d={`M${hubCX} ${HY} L${hubCX} ${CY + CH}`} color={GREEN} speed={1.4} reverse />
        <rect
          x={CX} y={CY} width={CW} height={CH} rx={9}
          fill={GREEN_L} stroke={GREEN} strokeWidth={1.1}
          style={{ animation: "coordFade 3s ease-in-out infinite" }}
        />
        <text x={CX + CW / 2} y={CY + 17} textAnchor="middle" fontSize={11} fontWeight={700} fill={GREEN} fontFamily="'Plus Jakarta Sans', sans-serif">Growth Coordinator</text>
        <text x={CX + CW / 2} y={CY + 32} textAnchor="middle" fontSize={9} fill={GREEN_M} fontFamily="'Plus Jakarta Sans', sans-serif">Weekly action plans · command surface</text>

        {clusterTargets.map((t, i) => (
          <Pipe
            key={i}
            d={`M${hubRightX} ${hubCY + (i - 2) * 22} C${hubRightX + 30} ${hubCY + (i - 2) * 22},${CLX - 20} ${t.y},${CLX} ${t.y}`}
            color={t.color}
            speed={1.7 + i * 0.15}
            reverse
          />
        ))}

        {CLUSTERS.map((cluster, i) => (
          <ClusterBox key={cluster.id} x={CLX} y={clusterLayouts[i].y} w={CLW} cluster={cluster} />
        ))}

        {CLUSTERS.map((cluster, i) => (
          <SignalDot
            key={cluster.id}
            cx={CLX + CLW + 16}
            cy={clusterLayouts[i].y + clusterLayouts[i].h / 2}
            color={cluster.color}
            delay={i * 0.5}
          />
        ))}
      </svg>

      <p style={{
        margin: "12px 0 0",
        fontSize: 11,
        color: SLATE[500],
        textAlign: "center",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        letterSpacing: "0.02em",
      }}>
        22 integrations → signal processing → 16 agents
      </p>
    </div>
  );
}
