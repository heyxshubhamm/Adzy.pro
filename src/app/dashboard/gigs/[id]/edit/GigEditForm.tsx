"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { useGigForm } from "@/store/gigFormStore";
import { OverviewStep } from "@/app/gigs/create/steps/OverviewStep";
import { PricingStep } from "@/app/gigs/create/steps/PricingStep";
import { RequirementsStep } from "@/app/gigs/create/steps/RequirementsStep";
import { MediaStep } from "@/app/gigs/create/steps/MediaStep";
import type { GigOut } from "@/types/gig";

const STEPS = ["Overview", "Pricing", "Requirements", "Gallery"];

interface Category {
  id: string;
  name: string;
}

export default function GigEditForm({ gig }: { gig: GigOut; categories: Category[] }) {
  const router = useRouter();
  const {
    step,
    setStep,
    gigId,
    title,
    description,
    categoryId,
    tags,
    packages,
    requirements,
    hydrate,
    reset,
  } = useGigForm();

  useEffect(() => {
    hydrate(gig);
    return () => reset();
  }, [gig, hydrate, reset]);

  async function saveOverview() {
    const targetGigId = gigId || gig.id;
    await apiFetch(`/gigs/${targetGigId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title,
        description,
        category_id: categoryId,
        tags,
      }),
    });
    setStep(2);
  }

  async function savePricing() {
    const targetGigId = gigId || gig.id;
    await apiFetch(`/gigs/${targetGigId}`, {
      method: "PATCH",
      body: JSON.stringify({
        packages: packages.map((p) => ({
          ...p,
          price: Number(p.price),
          delivery_days: Number(p.delivery_days),
          revisions: Number(p.revisions ?? 1),
        })),
      }),
    });
    setStep(3);
  }

  async function saveRequirements() {
    const targetGigId = gigId || gig.id;
    await apiFetch(`/gigs/${targetGigId}`, {
      method: "PATCH",
      body: JSON.stringify({ requirements }),
    });
    setStep(4);
  }

  function handleSaved() {
    reset();
    router.push("/dashboard/gigs?updated=1");
  }

  return (
    <div className="min-h-screen bg-[#050510] text-slate-300 py-12 px-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center space-y-2">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Edit Service</h1>
          <p className="text-xs uppercase tracking-[0.3em] text-blue-500 font-bold">Changes on active gigs go live immediately</p>
        </div>

        <div className="flex justify-between items-center mb-16 gap-4 px-10">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="relative flex flex-col items-center flex-1">
                <button
                  type="button"
                  onClick={() => done && setStep(n)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all duration-500 ${
                    done
                      ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      : active
                        ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                        : "bg-white/5 text-slate-600 border border-white/5"
                  } ${done ? "cursor-pointer" : "cursor-default"}`}
                >
                  {done ? "✓" : n}
                </button>
                <span className={`text-[10px] uppercase font-bold tracking-widest mt-4 transition-colors ${active ? "text-white" : "text-slate-600"}`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`hidden md:block absolute top-5 left-[calc(50%+25px)] w-[calc(100%-50px)] h-[1px] ${done ? "bg-emerald-500/50" : "bg-white/5"}`} />
                )}
              </div>
            );
          })}
        </div>

        {step === 1 && <OverviewStep onNext={saveOverview} />}
        {step === 2 && <PricingStep onNext={savePricing} onBack={() => setStep(1)} />}
        {step === 3 && <RequirementsStep onNext={saveRequirements} onBack={() => setStep(2)} />}
        {step === 4 && <MediaStep onPublish={handleSaved} isEdit />}
      </div>
    </div>
  );
}
