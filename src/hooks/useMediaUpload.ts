import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";

export interface UploadItem {
  id?: string;
  file?: File;
  preview?: string;
  url?: string;
  media_type: "image" | "video";
  is_cover: boolean;
  status: "pending" | "uploading" | "processing" | "ready" | "error";
  progress: number;  // 0–100
  error?: string;
  processed_urls?: Record<string, string>;
}

export function useMediaUpload(gigId: string) {
  const [items, setItems] = useState<UploadItem[]>([]);

  function updateItem(index: number, patch: Partial<UploadItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  const uploadFile = useCallback(
    async (file: File, index: number) => {
      const isVideo = file.type.startsWith("video/");
      const media_type: "image" | "video" = isVideo ? "video" : "image";
      const maxMB = isVideo ? 100 : 10;

      if (file.size > maxMB * 1024 * 1024) {
        updateItem(index, {
          status: "error",
          error: `File must be under ${maxMB} MB`,
        });
        return;
      }

      updateItem(index, { status: "uploading", progress: 0 });

      try {
        // 1. Get presigned URL
        const presign = await apiFetch<{
          upload_url: string;
          raw_key: string;
          processed_key: string;
          public_url: string;
        }>(`/gigs/${gigId}/media/presign`, {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            content_type: file.type,
            file_size: file.size,
            media_type,
          }),
        });

        // 2. Upload directly to S3 with progress via XHR
        await uploadToS3WithProgress(presign.upload_url, file, (progress) => {
          updateItem(index, { progress });
        });

        updateItem(index, { progress: 100, status: "processing" });

        // 3. Confirm with the backend
        const confirmed = await apiFetch<{
          id: string;
          status: string;
          url: string;
        }>(`/gigs/${gigId}/media/confirm`, {
          method: "POST",
          body: JSON.stringify({
            raw_key: presign.raw_key,
            processed_key: presign.processed_key,
            public_url: presign.public_url,
            media_type,
            is_cover: index === 0,
          }),
        });

        updateItem(index, { id: confirmed.id, status: "processing" });

        // 4. Poll until Celery finishes processing
        pollStatus(confirmed.id, index);
      } catch (err: unknown) {
        updateItem(index, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gigId]
  );

  function pollStatus(mediaId: string, index: number) {
    let attempts = 0;
    const MAX = 30; // 60s total at 2s interval

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > MAX) {
        clearInterval(interval);
        updateItem(index, { status: "error", error: "Processing timed out" });
        return;
      }

      try {
        const res = await apiFetch<{
          status: string;
          processed_urls: Record<string, string>;
          url: string;
        }>(`/gigs/${gigId}/media/${mediaId}/status`);

        if (res.status === "ready") {
          clearInterval(interval);
          updateItem(index, {
            status: "ready",
            url: res.processed_urls?.cover ?? res.url,
            preview: res.processed_urls?.cover ?? res.url,
            processed_urls: res.processed_urls,
          });
        } else if (res.status === "error") {
          clearInterval(interval);
          updateItem(index, { status: "error", error: "Processing failed" });
        }
      } catch {
        // network blip — keep polling
      }
    }, 2000);
  }

  function addFiles(files: FileList) {
    const startIndex = items.length;
    const newItems: UploadItem[] = Array.from(files).map((file, i) => ({
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
      media_type: file.type.startsWith("video/") ? "video" : "image",
      is_cover: startIndex === 0 && i === 0,
      status: "pending" as const,
      progress: 0,
    }));

    setItems((prev) => [...prev, ...newItems]);

    newItems.forEach((_, i) => {
      uploadFile(files[i], startIndex + i);
    });
  }

  function removeItem(index: number) {
    const item = items[index];
    if (item.preview?.startsWith("blob:")) URL.revokeObjectURL(item.preview);
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function reorder(fromIdx: number, toIdx: number) {
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next.map((item, i) => ({ ...item, is_cover: i === 0 }));
    });
  }

  return { items, addFiles, removeItem, reorder };
}

function uploadToS3WithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed: ${xhr.status}`));
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Network error during upload"))
    );

    xhr.send(file);
  });
}
