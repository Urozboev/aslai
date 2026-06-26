interface AdHonestyMeterProps {
  score: number;
  showMismatches?: boolean;
  mismatches?: { claim: string; reality: string; evidence: string }[];
}

export default function AdHonestyMeter({
  score,
  showMismatches = false,
  mismatches = [],
}: AdHonestyMeterProps) {
  const getColor = (s: number) => {
    if (s >= 70) return "from-emerald-500 to-teal-400";
    if (s >= 40) return "from-amber-500 to-yellow-400";
    return "from-red-600 to-orange-500";
  };

  const getLabel = (s: number) => {
    if (s >= 70) return "Ishonchli";
    if (s >= 40) return "Shubhali";
    return "Yolg'on";
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[#8A8F98]">Reklama haqqoniyligi</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono-data text-white">
              {score}%
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                score >= 70
                  ? "bg-emerald-500/20 text-emerald-400"
                  : score >= 40
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {getLabel(score)}
            </span>
          </div>
        </div>
        <div className="w-full h-3 bg-[#1F2937] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getColor(score)} transition-all duration-1000 ease-out`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {showMismatches && mismatches.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-sm font-medium text-white">Aniqlangan ziddiyatlar:</h4>
          {mismatches.map((m, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-red-500/5 border border-red-500/10"
            >
              <div className="flex items-start gap-2">
                <span className="text-red-400 text-xs mt-0.5 shrink-0">Reklama:</span>
                <span className="text-white text-sm">{m.claim}</span>
              </div>
              <div className="flex items-start gap-2 mt-1">
                <span className="text-emerald-400 text-xs mt-0.5 shrink-0">Haqiqat:</span>
                <span className="text-[#8A8F98] text-sm">{m.reality}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
