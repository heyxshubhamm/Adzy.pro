"use client";
import { useGigForm } from "@/store/gigFormStore";
import { OverviewStep } from "./steps/OverviewStep";
import { PricingStep } from "./steps/PricingStep";
import { RequirementsStep } from "./steps/RequirementsStep";
import { MediaStep } from "./steps/MediaStep";
import { apiFetch } from "@/lib/apiFetch";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = ["Overview", "Pricing", "Requirements", "Gallery"];

export default function CreateGigPage() {
  const { 
    step, setStep, setGigId, gigId, title, description,
    categoryId, tags, packages, requirements, reset 
  } = useGigForm();
  const router = useRouter();

  async function handleOverviewNext() {
    const data = await apiFetch<{ id: string }>("/gigs", {
      method: "POST",
      body: JSON.stringify({
        title, description, category_id: categoryId, tags,
        packages: packages.map(p => ({
          ...p, price: Number(p.price),
          delivery_days: Number(p.delivery_days),
          revisions: Number(p.revisions ?? 1),
        })),
      }),
    });
    setGigId(data.id);
    setStep(2);
  }

  async function handlePricingNext() {
    await apiFetch(`/gigs/${gigId}`, {
      method: "PATCH",
      body: JSON.stringify({
        packages: packages.map(p => ({
          ...p, price: Number(p.price),
          delivery_days: Number(p.delivery_days),
          revisions: Number(p.revisions ?? 1),
        })),
      }),
    });
    setStep(3);
  }

  async function handleRequirementsNext() {
    await apiFetch(`/gigs/${gigId}`, {
      method: "PATCH",
      body: JSON.stringify({ requirements }),
    });
    setStep(4);
  }

  async function handlePublished() {
    reset();
    router.push(`/dashboard/gigs?published=1`);
  }

  return (
    <div className="min-h-screen bg-[#050510] text-slate-300 py-12 px-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 text-center space-y-2">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Publish Your Service</h1>
            <p className="text-xs uppercase tracking-[0.3em] text-blue-500 font-bold">Adzy Marketplace Intelligence</p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-16 gap-4 px-10">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="relative flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all duration-500 ${
                  done ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]" : 
                  active ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" : "bg-white/5 text-slate-600 border border-white/5"
                }`}>
                  {done ? "✓" : n}
                </div>
                <span className={`text-[10px] uppercase font-bold tracking-widest mt-4 transition-colors ${
                  active ? "text-white" : "text-slate-600"
                }`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`hidden md:block absolute top-5 left-[calc(50%+25px)] w-[calc(100%-50px)] h-[1px] ${
                    done ? "bg-emerald-500/50" : "bg-white/5"
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 1 && <OverviewStep onNext={handleOverviewNext} />}
              {step === 2 && <PricingStep onNext={handlePricingNext} onBack={() => setStep(1)} />}
              {step === 3 && <RequirementsStep onNext={handleRequirementsNext} onBack={() => setStep(2)} />}
              {step === 4 && gigId && <MediaStep onPublish={handlePublished} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
