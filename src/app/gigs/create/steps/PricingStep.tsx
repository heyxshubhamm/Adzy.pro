"use client";
import { useGigForm, PackageForm } from "@/store/gigFormStore";
import { useState } from "react";

export function PricingStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { packages, setPackages } = useGigForm();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updatePackage = (index: number, update: Partial<PackageForm>) => {
    const newPackages = [...packages];
    newPackages[index] = { ...newPackages[index], ...update };
    setPackages(newPackages);
  };

  const addTier = (tier: "standard" | "premium") => {
    if (packages.some(p => p.tier === tier)) return;
    setPackages([...packages, { 
      tier, name: "", description: "", price: "", delivery_days: "", revisions: "1", features: [] 
    }]);
  };

  const removeTier = (tier: string) => {
    setPackages(packages.filter(p => p.tier !== tier));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    packages.forEach((p, i) => {
      if (!p.name) e[`name_${i}`] = "Package name required";
      if (!p.description) e[`desc_${i}`] = "Description required";
      if (!p.price || isNaN(Number(p.price))) e[`price_${i}`] = "Valid price required";
      if (!p.delivery_days || isNaN(Number(p.delivery_days))) e[`days_${i}`] = "Delivery days required";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="flex flex-col gap-8 bg-slate-900/40 p-8 rounded-3xl border border-white/5 backdrop-blur-xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {["basic", "standard", "premium"].map((tier) => {
          const pkgIndex = packages.findIndex(p => p.tier === tier);
          const pkg = packages[pkgIndex];

          if (!pkg) {
            return (
              <button 
                key={tier}
                onClick={() => addTier(tier as "standard" | "premium")}
                className="h-full border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 text-slate-500 hover:text-blue-400 hover:border-blue-400/50 transition-all gap-2"
              >
                <span className="text-2xl">+</span>
                <span className="text-xs uppercase tracking-widest font-bold">Add {tier} Tier</span>
              </button>
            );
          }

          return (
            <div key={tier} className="relative bg-slate-950/50 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase tracking-tighter font-black text-blue-500/80">{tier}</span>
                {tier !== "basic" && (
                  <button onClick={() => removeTier(tier)} className="text-slate-600 hover:text-rose-500 transition-colors">&times;</button>
                )}
              </div>

              <input
                placeholder="Package Name (e.g. Starter Build)"
                value={pkg.name}
                onChange={e => updatePackage(pkgIndex, { name: e.target.value })}
                className="w-full bg-transparent border-b border-white/5 pb-2 text-sm outline-none focus:border-blue-500/50"
              />
              {errors[`name_${pkgIndex}`] && <p className="text-[10px] text-rose-500">{errors[`name_${pkgIndex}`]}</p>}

              <textarea
                placeholder="Describe what's included..."
                value={pkg.description}
                onChange={e => updatePackage(pkgIndex, { description: e.target.value })}
                className="w-full bg-transparent border border-white/5 rounded-lg p-2 text-xs outline-none focus:border-blue-500/50 h-24 resize-none"
              />
              {errors[`desc_${pkgIndex}`] && <p className="text-[10px] text-rose-500">{errors[`desc_${pkgIndex}`]}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase text-slate-500">Price ($)</label>
                  <input
                    type="number"
                    value={pkg.price}
                    onChange={e => updatePackage(pkgIndex, { price: e.target.value })}
                    className="w-full bg-slate-900 border border-white/5 rounded-lg px-2 py-1.5 text-xs outline-none"
                  />
                  {errors[`price_${pkgIndex}`] && <p className="text-[10px] text-rose-500">{errors[`price_${pkgIndex}`]}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase text-slate-500">Days</label>
                  <input
                    type="number"
                    value={pkg.delivery_days}
                    onChange={e => updatePackage(pkgIndex, { delivery_days: e.target.value })}
                    className="w-full bg-slate-900 border border-white/5 rounded-lg px-2 py-1.5 text-xs outline-none"
                  />
                  {errors[`days_${pkgIndex}`] && <p className="text-[10px] text-rose-500">{errors[`days_${pkgIndex}`]}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center mt-4">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors text-sm uppercase tracking-widest font-bold">Back</button>
        <button
          onClick={() => validate() && onNext()}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-sm uppercase tracking-widest"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
