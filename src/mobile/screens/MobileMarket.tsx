import { useState } from "react";
import { trpc } from "@/providers/trpc";
import MobileLayout from "@/mobile/components/MobileLayout";
import PriceTrendChart from "@/components/shared/PriceTrendChart";
import { Search, TrendingDown, Package, Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function MobileMarket() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [showAddPrice, setShowAddPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");

  const { data: searchResults, isLoading: searching } = trpc.product.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 1 }
  );
  const { data: cheapest } = trpc.product.cheapest.useQuery();
  const { data: priceTrend } = trpc.market.priceTrend.useQuery(
    { productId: selectedProduct || 1, days: 30 },
    { enabled: selectedProduct !== null }
  );

  const utils = trpc.useUtils();
  const addPriceMutation = trpc.product.addPrice.useMutation({
    onSuccess: () => {
      toast.success("Narx qo'shildi!");
      utils.product.getPrices.invalidate();
      utils.market.priceTrend.invalidate();
      setNewPrice("");
      setShowAddPrice(false);
    },
  });

  return (
    <MobileLayout title="Bozor Analitika">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Mahsulot qidiring..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-10 py-3.5 text-sm text-white placeholder:text-[#8A8F98]/50 focus:outline-none focus:border-[#0EA5A4]/50"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); setSelectedProduct(null); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X size={16} className="text-[#8A8F98]" />
            </button>
          )}
        </div>

        {/* Search Results */}
        {searchQuery.length > 1 && (
          <div className="space-y-2">
            {searching ? (
              <div className="text-center py-8 text-[#8A8F98] text-sm">Qidirilmoqda...</div>
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map((result) => (
                <button
                  key={result.product?.id}
                  onClick={() => { setSelectedProduct(result.product?.id || null); setSearchQuery(""); }}
                  className="glass-card w-full flex items-center gap-3 p-3 text-left active:scale-[0.98] transition-transform"
                >
                  <Package size={18} className="text-[#0EA5A4] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{result.product?.name}</p>
                    <p className="text-[10px] text-[#8A8F98]">{result.product?.category}</p>
                  </div>
                  {result.latestPrice && (
                    <span className="text-sm font-mono-data text-[#0EA5A4]">
                      {Number(result.latestPrice).toLocaleString()}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-[#8A8F98] text-sm">Natija topilmadi</div>
            )}
          </div>
        )}

        {/* Price Trend */}
        {selectedProduct && priceTrend && (
          <div className="glass-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Narx dinamikasi</h3>
              <button onClick={() => setShowAddPrice(!showAddPrice)}
                className="p-2 rounded-xl bg-[#0EA5A4]/15 text-[#0EA5A4]">
                <Plus size={16} />
              </button>
            </div>

            {showAddPrice && (
              <div className="mb-3 flex gap-2">
                <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Narx"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#0EA5A4]/50" />
                <button onClick={() => selectedProduct && newPrice && addPriceMutation.mutate({ productId: selectedProduct, price: newPrice })}
                  disabled={addPriceMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#0EA5A4] text-white text-sm font-medium disabled:opacity-50">
                  {addPriceMutation.isPending ? "..." : "Saqlash"}
                </button>
              </div>
            )}

            <PriceTrendChart data={priceTrend.chartData} trend={priceTrend.trend} height={160} />
          </div>
        )}

        {/* Cheapest Offers */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 px-1">
            <TrendingDown size={16} className="text-emerald-400" />
            Eng arzon
          </h3>
          <div className="space-y-2">
            {cheapest?.slice(0, 8).map((item, i) => (
              <div key={i} className="glass-card flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold font-mono-data text-emerald-400">#{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.product?.name || "Noma'lum"}</p>
                  <p className="text-[10px] text-[#8A8F98]">{item.business?.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono-data text-emerald-400">
                    {Number(item.price).toLocaleString()}
                  </p>
                  <p className="text-[9px] text-[#8A8F98]">so'm</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
