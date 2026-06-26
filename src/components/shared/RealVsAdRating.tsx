import { Star, AlertTriangle } from "lucide-react";

interface RealVsAdRatingProps {
  adRating: number;
  realRating: number;
}

export default function RealVsAdRating({ adRating, realRating }: RealVsAdRatingProps) {
  const diff = adRating - realRating;
  const isSignificant = diff > 0.8;

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center">
        <span className="text-[10px] uppercase tracking-wider text-[#8A8F98] mb-1">
          Reklama
        </span>
        <div className="flex items-center gap-1">
          <Star size={14} className="text-amber-400 fill-amber-400" />
          <span className="text-sm font-semibold text-white font-mono-data">
            {adRating.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <span className="text-xs text-[#8A8F98]">vs</span>
        {isSignificant && (
          <AlertTriangle size={12} className="text-red-400 mt-1" />
        )}
      </div>

      <div className="flex flex-col items-center">
        <span className="text-[10px] uppercase tracking-wider text-[#8A8F98] mb-1">
          Real
        </span>
        <div className="flex items-center gap-1">
          <Star size={14} className="text-[#0EA5A4] fill-[#0EA5A4]" />
          <span className="text-sm font-semibold text-white font-mono-data">
            {realRating.toFixed(1)}
          </span>
        </div>
      </div>

      {isSignificant && (
        <div className="ml-2 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
          <span className="text-[10px] text-red-400 font-medium">
            -{diff.toFixed(1)} tafovut
          </span>
        </div>
      )}
    </div>
  );
}
