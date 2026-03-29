"use client";
import { useGigForm } from "@/store/gigFormStore";
import { useRef, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

export function MediaStep({ onPublish }: { onPublish: () => void }) {
  const { gigId, media, addMedia, updateMedia, removeMedia } = useGigForm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [globalError, setGlobalError] = useState("");

  async function handleFiles(files: FileList) {
    if (media.length + files.length > 5) {
      setGlobalError("Maximum 5 media files allowed");
      return;
    }
    setGlobalError("");

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const media_type = isVideo ? "video" : "image";
      const preview = isVideo ? undefined : URL.createObjectURL(file);
      const index = media.length;

      addMedia({ file, preview, media_type, is_cover: index === 0, uploading: true });

      try {
        // 1. Get presigned URL
        const data = await apiFetch<{ upload_url: string; s3_key: string; public_url: string }>(
          `/gigs/${gigId}/media/presign`,
          {
            method: "POST",
            body: JSON.stringify({ filename: file.name, media_type, content_type: file.type }),
          }
        );

        // 2. Direct S3 Upload
        await fetch(data.upload_url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        // 3. Confirm with API
        await apiFetch(`/gigs/${gigId}/media/confirm`, {
          method: "POST",
          body: JSON.stringify({ 
            s3_key: data.s3_key, 
            public_url: data.public_url, 
            media_type, 
            is_cover: index === 0 
          }),
        });

        updateMedia(index, { s3_key: data.s3_key, url: data.public_url, uploading: false });
      } catch (err: any) {
        updateMedia(index, { uploading: false, error: err.message || "Upload failed" });
      }
    }
  }

  async function handlePublish() {
    try {
      await apiFetch(`/gigs/${gigId}/publish`, { method: "POST" });
      onPublish();
    } catch (err: any) {
      setGlobalError(err.message || "Failed to publish");
    }
  }

  return (
    <div className="flex flex-col gap-8 bg-slate-900/40 p-8 rounded-3xl border border-white/5 backdrop-blur-xl">
      <div 
        onClick={() => inputRef.current?.click()}
        className="group border-2 border-dashed border-white/10 hover:border-blue-500/50 rounded-2xl p-12 text-center cursor-pointer bg-slate-950/30 transition-all hover:bg-slate-950/50"
      >
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-300">Drag & Drop Images or Video</p>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">Max 5 files &middot; 10MB Images &middot; 100MB Video (MP4)</p>
        <input ref={inputRef} type="file" multiple accept="image/*,video/mp4" className="hidden" 
          onChange={e => e.target.files && handleFiles(e.target.files)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {media.map((item, i) => (
          <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-white/5 bg-slate-950">
            {item.preview ? (
              <img src={item.preview} className="w-full h-full object-cover" />
            ) : item.url ? (
              <img src={item.url} className="w-full h-full object-cover" />
            ) : null}
            
            {item.uploading && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent animate-spin rounded-full"></div>
                </div>
            )}

            {item.is_cover && (
                <div className="absolute top-2 left-2 bg-blue-600 text-[8px] font-black px-2 py-0.5 rounded tracking-tighter uppercase">Cover Image</div>
            )}

            <button 
                onClick={() => removeMedia(i)}
                className="absolute top-2 right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
            >
                &times;
            </button>
          </div>
        ))}
      </div>

      {globalError && <p className="text-xs text-rose-500 text-center font-bold tracking-widest uppercase">{globalError}</p>}

      <button
        onClick={handlePublish}
        disabled={media.length === 0 || media.some(m => m.uploading)}
        className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold py-4 px-12 rounded-xl transition-all shadow-lg active:scale-95 text-sm uppercase tracking-widest self-center"
      >
        Publish Marketplace Listing
      </button>
    </div>
  );
}
