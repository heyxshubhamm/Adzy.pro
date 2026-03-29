"use client";
import { useGigForm } from "@/store/gigFormStore";
import { useState } from "react";

const CATEGORIES = [
  { id: "cat-dev", label: "Programming & Tech" },
  { id: "cat-design", label: "Graphics & Design" },
  { id: "cat-writing", label: "Writing & Translation" },
  { id: "cat-digital", label: "Digital Marketing" },
];

export function OverviewStep({ onNext }: { onNext: () => void }) {
  const { title, description, categoryId, tags, setOverview } = useGigForm();
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (title.length < 15) e.title = "Title must be at least 15 characters";
    if (description.length < 120) e.description = "Description must be at least 120 characters";
    if (!categoryId) e.categoryId = "Please select a category";
    if (tags.length === 0) e.tags = "Add at least one tag";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function addTag(e: React.KeyboardEvent) {
    if (e.key !== "Enter" && e.key !== ",") return;
    e.preventDefault();
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setOverview({ tags: [...tags, tag] });
    }
    setTagInput("");
  }

  return (
    <div className="flex flex-col gap-8 bg-slate-900/40 p-8 rounded-3xl border border-white/5 backdrop-blur-xl">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-300">
          Gig Title <span className="text-slate-500 font-normal">({title.length}/80)</span>
        </label>
        <input
          value={title}
          onChange={e => setOverview({ title: e.target.value })}
          maxLength={80}
          className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
          placeholder="e.g., I will build a full-stack Next.js web application"
        />
        {errors.title && <p className="text-xs text-rose-500 italic mt-1">{errors.title}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-300">Category</label>
        <select 
          value={categoryId} 
          onChange={e => setOverview({ categoryId: e.target.value })}
          className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
        >
          <option value="">Select a category...</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        {errors.categoryId && <p className="text-xs text-rose-500 italic mt-1">{errors.categoryId}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-300">Description</label>
        <textarea
          value={description}
          onChange={e => setOverview({ description: e.target.value })}
          rows={8}
          className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
          placeholder="Provide a detailed professional overview of your service..."
        />
        <div className="flex justify-between items-center text-[10px] uppercase tracking-widest">
          <span className={description.length < 120 ? "text-rose-500" : "text-emerald-500"}>
            {description.length} / 120 Characters Min
          </span>
          {errors.description && <span className="text-rose-500 italic">{errors.description}</span>}
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-semibold text-slate-300">Tags (Max 5)</label>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-full text-xs font-medium">
              {tag}
              <button 
                onClick={() => setOverview({ tags: tags.filter(t => t !== tag) })}
                className="hover:text-white transition-colors"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <input
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={addTag}
          disabled={tags.length >= 5}
          className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500/50 outline-none"
          placeholder="Add keywords to help buyers find you..."
        />
        {errors.tags && <p className="text-xs text-rose-500 italic mt-1">{errors.tags}</p>}
      </div>

      <button
        onClick={() => validate() && onNext()}
        className="mt-4 self-end bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-sm uppercase tracking-widest"
      >
        Save & Continue
      </button>
    </div>
  );
}
