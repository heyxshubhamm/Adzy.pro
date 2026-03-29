"use client";
import { useGigForm, RequirementForm } from "@/store/gigFormStore";
import { useState } from "react";

export function RequirementsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { requirements, setRequirements } = useGigForm();
  const [newQuestion, setNewQuestion] = useState("");
  const [inputType, setInputType] = useState<RequirementForm["input_type"]>("text");

  const addQuestion = () => {
    if (newQuestion.trim().length < 5) return;
    setRequirements([...requirements, { 
      question: newQuestion, 
      input_type: inputType, 
      choices: [], 
      is_required: true 
    }]);
    setNewQuestion("");
  };

  const removeQuestion = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-8 bg-slate-900/40 p-8 rounded-3xl border border-white/5 backdrop-blur-xl">
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-slate-300 uppercase tracking-widest">
          Order Requirements
        </label>
        <p className="text-slate-500 text-xs">
          Add questions to ask your buyer when they purchase this gig.
        </p>
      </div>

      <div className="space-y-4 bg-slate-950/30 p-6 rounded-2xl border border-white/5">
        <div className="flex gap-4">
          <input
            placeholder="e.g. Please provide your website URL"
            value={newQuestion}
            onChange={e => setNewQuestion(e.target.value)}
            className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <select 
            value={inputType} 
            onChange={e => setInputType(e.target.value as any)}
            className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none"
          >
            <option value="text">Short Text</option>
            <option value="textarea">Long Description</option>
            <option value="file">File Attachment</option>
          </select>
          <button 
            onClick={addQuestion}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
          >
            Add
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {requirements.map((req, i) => (
          <div key={i} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">{req.question}</span>
              <span className="text-[10px] uppercase tracking-tighter text-blue-500">{req.input_type}</span>
            </div>
            <button 
              onClick={() => removeQuestion(i)}
              className="text-slate-600 hover:text-rose-500 transition-colors"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-4 border-t border-white/5 pt-8">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors text-sm uppercase tracking-widest font-bold">Back</button>
        <button
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-sm uppercase tracking-widest"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
