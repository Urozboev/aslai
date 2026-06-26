import { Link } from "react-router";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
          <AlertTriangle size={36} className="text-red-400" />
        </div>
        <h1 className="text-6xl font-bold font-mono-data text-white mb-2">404</h1>
        <p className="text-lg text-[#8A8F98] mb-8">Sahifa topilmadi</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0EA5A4] text-white font-medium hover:bg-[#0D9488] transition-colors"
        >
          <Home size={16} />
          Bosh sahifaga qaytish
        </Link>
      </div>
    </div>
  );
}
