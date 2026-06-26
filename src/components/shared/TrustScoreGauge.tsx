interface TrustScoreGaugeProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

export default function TrustScoreGauge({
  score,
  size = 120,
  showLabel = true,
}: TrustScoreGaugeProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 71) return "#0EA5A4";
    if (s >= 41) return "#F59E0B";
    return "#EF4444";
  };

  const color = getColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient
            id={`tealGradient-${score}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={score >= 71 ? "#2DD4BF" : score >= 41 ? "#FBBF24" : "#F87171"} />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#1F2937"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={`url(#tealGradient-${score})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 8px ${color}99)`,
          }}
        />
        <text
          x="50"
          y="50"
          dy="0.35em"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="18px"
          fontWeight="bold"
          fontFamily="JetBrains Mono, monospace"
          transform="rotate(90 50 50)"
        >
          {score}%
        </text>
      </svg>
      {showLabel && (
        <span className="text-xs text-[#8A8F98] font-medium">Ishonch ko'rsatkichi</span>
      )}
    </div>
  );
}
