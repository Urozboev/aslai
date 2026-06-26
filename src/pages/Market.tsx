import { useState } from "react";
import { trpc } from "@/providers/trpc";
import PriceTrendChart from "@/components/shared/PriceTrendChart";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import { Search, TrendingDown, MapPin, Package, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Market() {
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

  const { data: productPrices } = trpc.product.getPrices.useQuery(
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

  const handleAddPrice = () => {
    if (!selectedProduct || !newPrice) return;
    addPriceMutation.mutate({
      productId: selectedProduct,
      price: newPrice,
      unit: "kg",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Bozor Analitika</h1>
        <p className="text-[#8A8F98]">Narxlar, tendensiyalar va eng arzon takliflar</p>
      </div>

      {/* Search */}
      <div className="glass-card">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8F98]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Mahsulot qidiring... (masalan: Piyoz, Go'sht, Guruch)"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-[#8A8F98]/50 focus:outline-none focus:border-[#0EA5A4]/50 focus:ring-1 focus:ring-[#0EA5A4]/30 transition-all"
          />
        </div>

        {/* Search Results */}
        {searchQuery.length > 1 && (
          <div className="mt-4 space-y-2">
            {searching ? (
              <div className="text-center py-8 text-[#8A8F98]">Qidirilmoqda...</div>
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map((result) => (
                <button
                  key={result.product?.id}
                  onClick={() => {
                    setSelectedProduct(result.product?.id || null);
                    setSearchQuery("");
                  }}
                  className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <Package size={18} className="text-[#0EA5A4] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {result.product?.name}
                    </p>
                    <p className="text-xs text-[#8A8F98]">
                      {result.product?.category} {result.business?.name ? `· ${result.business.name}` : ""}
                    </p>
                  </div>
                  {result.latestPrice && (
                    <span className="text-sm font-mono-data text-[#0EA5A4]">
                      {Number(result.latestPrice).toLocaleString()} so'm
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-[#8A8F98]">
                Hozircha natija yo'q
              </div>
            )}
          </div>
        )}
      </div>

      {/* Price Trend Chart */}
      {selectedProduct && priceTrend && (
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Narx dinamikasi</h3>
            <button
              onClick={() => setShowAddPrice(!showAddPrice)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0EA5A4]/15 text-[#0EA5A4] text-sm font-medium hover:bg-[#0EA5A4]/25 transition-colors"
            >
              <Plus size={14} />
              Narx qo'shish
            </button>
          </div>

          {showAddPrice && (
            <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10 flex gap-3">
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Narx (so'm)"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-[#8A8F98]/50 focus:outline-none focus:border-[#0EA5A4]/50"
              />
              <button
                onClick={handleAddPrice}
                disabled={addPriceMutation.isPending}
                className="px-6 py-2 rounded-lg bg-[#0EA5A4] text-white text-sm font-medium hover:bg-[#0D9488] transition-colors disabled:opacity-50"
              >
                {addPriceMutation.isPending ? "..." : "Saqlash"}
              </button>
            </div>
          )}

          <PriceTrendChart
            data={priceTrend.chartData}
            trend={priceTrend.trend}
            productName={productPrices?.[0]?.unit || "Mahsulot"}
          />
        </div>
      )}

      {/* Cheapest Offers */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingDown size={20} className="text-emerald-400" />
          Eng arzon takliflar
        </h2>
        <div className="grid gap-3">
          {cheapest?.map((item, i) => (
            <div
              key={i}
              className="glass-card flex items-center gap-4 p-4"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold font-mono-data text-emerald-400">
                  #{i + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white">
                  {item.product?.name || "Noma'lum"}
                </h3>
                <div className="flex items-center gap-2 text-xs text-[#8A8F98]">
                  <MapPin size={10} />
                  {item.business?.name || "Noma'lum"}
                  {item.business?.region && ` · ${item.business.region}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold font-mono-data text-emerald-400">
                  {Number(item.price).toLocaleString()}
                </p>
                <p className="text-[10px] text-[#8A8F98]">
                  so'm / {item.unit || "kg"}
                </p>
              </div>
              {item.business?.trustScore && item.business.trustScore > 80 && (
                <VerifiedBadge />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
