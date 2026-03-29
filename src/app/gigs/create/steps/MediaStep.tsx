"use client";

import { useGigForm } from "@/store/gigFormStore";
import { useRef, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

const MAX_MEDIA_FILES = 5;

interface Props {
  onPublish: () => void;
  isEdit?: boolean;
}

async function pollMediaReady(gigId: string, mediaId: string) {
  for (let i = 0; i < 30; i++) {
    const status = await apiFetch<{
      status: "processing" | "ready" | "error";
      processed_urls?: Record<string, string>;
      url: string;
    }>(`/gigs/${gigId}/media/${mediaId}/status`);

    if (status.status === "ready") {
      return status;
    }
    if (status.status === "error") {
      throw new Error("Media processing failed");
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Media processing timed out");
}

export function MediaStep({ onPublish, isEdit = false }: Props) {
  const { gigId, media, setMedia, addMedia, updateMedia } = useGigForm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [globalError, setGlobalError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  async function handleFiles(files: FileList) {
    if (media.length + files.length > MAX_MEDIA_FILES) {
      setGlobalError(`Maximum ${MAX_MEDIA_FILES} media files allowed`);
      return;
    }
    setGlobalError("");

    const baseCount = media.length;
    let offset = 0;

    for (const file of Array.from(files)) {
      const index = baseCount + offset;
      offset += 1;

      const isVideo = file.type.startsWith("video/");
      const media_type = isVideo ? "video" : "image";
      const preview = isVideo ? undefined : URL.createObjectURL(file);

      addMedia({
        file,
        preview,
        media_type,
        is_cover: index === 0,
        uploading: true,
        status: "uploading",
      });

      try {
        const presign = await apiFetch<{
          upload_url: string;
          raw_key: string;
          processed_key: string;
          public_url: string;
        }>(`/gigs/${gigId}/media/presign`, {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            media_type,
            content_type: file.type,
            file_size: file.size,
          }),
        });

        await fetch(presign.upload_url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        const confirmed = await apiFetch<{ id: string; status: "processing" | "ready"; url: string }>(
          `/gigs/${gigId}/media/confirm`,
          {
            method: "POST",
            body: JSON.stringify({
              raw_key: presign.raw_key,
              processed_key: presign.processed_key,
              public_url: presign.public_url,
              media_type,
              is_cover: index === 0,
            }),
          }
        );

        updateMedia(index, {
          id: confirmed.id,
          raw_key: presign.raw_key,
          processed_key: presign.processed_key,
          s3_key: presign.processed_key,
          url: presign.public_url,
          uploading: false,
          status: "processing",
        });

        const ready = await pollMediaReady(gigId, confirmed.id);
        updateMedia(index, {
          uploading: false,
          status: "ready",
          processed_urls: ready.processed_urls ?? {},
          url: ready.processed_urls?.cover ?? ready.url,
          preview: ready.processed_urls?.cover ?? ready.url,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        updateMedia(index, {
          uploading: false,
          status: "error",
          error: message,
        });
      }
    }
  }

  async function handleRemove(index: number) {
    const item = media[index];

    try {
      if (item?.id) {
        await apiFetch(`/gigs/${gigId}/media/${item.id}`, { method: "DELETE" });
      }

      const nextMedia = media
        .filter((_, i) => i !== index)
        .map((m, i) => ({ ...m, is_cover: i === 0 }));
      setMedia(nextMedia);

      if (nextMedia.length > 0) {
        const orderedIds = nextMedia.filter((m) => m.id).map((m) => m.id as string);
        if (orderedIds.length > 0) {
          await apiFetch(`/gigs/${gigId}/media/reorder`, {
            method: "PATCH",
            body: JSON.stringify({ ordered_ids: orderedIds }),
          });
        }
      }
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Failed to remove media");
    }
  }

  async function handleDrop(dropIndex: number) {
    if (dragIndex === null || dragIndex === dropIndex) return;

    const reordered = [...media];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    const normalized = reordered.map((item, i) => ({
      ...item,
      is_cover: i === 0,
      sort_order: i,
    }));

    setMedia(normalized);
    setDragIndex(null);

    try {
      const orderedIds = normalized.filter((m) => m.id).map((m) => m.id as string);
      if (orderedIds.length > 0) {
        await apiFetch(`/gigs/${gigId}/media/reorder`, {
          method: "PATCH",
          body: JSON.stringify({ ordered_ids: orderedIds }),
        });
      }
    } catch {
      setGlobalError("Failed to save media order. Please try again.");
    }
  }

  async function handlePublish() {
    try {
      await apiFetch(`/gigs/${gigId}/publish`, { method: "POST" });
      onPublish();
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Failed to publish");
    }
  }

  const hasPendingMedia = media.some((m) => m.uploading || m.status === "processing");

  return (
    <div className="flex flex-col gap-8 bg-slate-900/40 p-8 rounded-3xl border border-white/5 backdrop-blur-xl">
      <div
        onClick={() => inputRef.current?.click()}
        className="group border-2 border-dashed border-white/10 hover:border-blue-500/50 rounded-2xl p-12 text-center cursor-pointer bg-slate-950/30 transition-all hover:bg-slate-950/50"
      >
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-300">Drag & Drop Images or Video</p>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">
          Max {MAX_MEDIA_FILES} files · 10MB Images · 100MB Video (MP4)
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/mp4"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {media.map((item, i) => (
          <div
            key={`${item.id ?? "new"}-${i}`}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}
            className="relative group aspect-square rounded-xl overflow-hidden border border-white/5 bg-slate-950 cursor-grab"
          >
            {item.preview ? (
              <img src={item.preview} alt="Gig media preview" className="w-full h-full object-cover" />
            ) : item.url ? (
              <img src={item.url} alt="Gig media" className="w-full h-full object-cover" />
            ) : item.media_type === "video" ? (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs uppercase tracking-widest">
                Video
              </div>
            ) : null}

            {(item.uploading || item.status === "processing") && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent animate-spin rounded-full"></div>
              </div>
            )}

            {item.is_cover && (
              <div className="absolute top-2 left-2 bg-blue-600 text-[8px] font-black px-2 py-0.5 rounded tracking-tighter uppercase">
                Cover Image
              </div>
            )}

            {item.error && (
              <div className="absolute bottom-0 left-0 right-0 bg-rose-950/90 text-rose-200 text-[10px] px-2 py-1 truncate">
                {item.error}
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(i);
              }}
              className="absolute top-2 right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {globalError && (
        <p className="text-xs text-rose-500 text-center font-bold tracking-widest uppercase">{globalError}</p>
      )}

      <button
        onClick={handlePublish}
        disabled={media.length === 0 || hasPendingMedia}
        className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold py-4 px-12 rounded-xl transition-all shadow-lg active:scale-95 text-sm uppercase tracking-widest self-center"
      >
        {isEdit ? "Save Gig Updates" : "Publish Marketplace Listing"}
      </button>
    </div>
  );
}
