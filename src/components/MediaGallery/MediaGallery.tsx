"use client";
import { useRef, useState } from "react";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { apiFetch } from "@/lib/apiFetch";
import styles from "./MediaGallery.module.css";

interface Props {
  gigId: string;
  onAllReady?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting…",
  uploading: "Uploading",
  processing: "Processing",
  ready: "Ready",
  error: "Failed",
};

export function MediaGallery({ gigId, onAllReady }: Props) {
  const { items, addFiles, removeItem, reorder } = useMediaUpload(gigId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const allReady = items.length > 0 && items.every((i) => i.status === "ready");

  if (allReady) onAllReady?.();

  async function handleRemove(index: number) {
    const item = items[index];
    if (item.id) {
      await apiFetch(`/gigs/${gigId}/media/${item.id}`, { method: "DELETE" }).catch(() => {});
    }
    removeItem(index);
  }

  async function handleReorder(fromIdx: number, toIdx: number) {
    reorder(fromIdx, toIdx);
    const ids = items.filter((i) => i.id).map((i) => i.id!);
    if (ids.length > 1) {
      await apiFetch(`/gigs/${gigId}/media/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ ordered_ids: ids }),
      }).catch(() => {});
    }
  }

  return (
    <div className={styles.gallery}>
      {/* Drop zone */}
      {items.length < 5 && (
        <div
          className={styles.dropzone}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
        >
          <svg
            className={styles.uploadIcon}
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className={styles.dropzoneTitle}>Drag & drop or click to upload</p>
          <p className={styles.dropzoneHint}>
            Images: JPG, PNG, WebP up to 10 MB · Video: MP4 up to 100 MB · Max 5 files
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
            style={{ display: "none" }}
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>
      )}

      {/* Grid */}
      {items.length > 0 && (
        <>
          <p className={styles.reorderHint}>
            Drag to reorder. First image is the cover shown in search results.
          </p>
          <div className={styles.grid}>
            {items.map((item, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(i);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => {
                  setDragOver(null);
                  if (dragIdx !== null) handleReorder(dragIdx, i);
                  setDragIdx(null);
                }}
                onDragEnd={() => {
                  setDragIdx(null);
                  setDragOver(null);
                }}
                className={`${styles.card} ${item.is_cover ? styles.coverCard : ""} ${
                  dragOver === i ? styles.dragOver : ""
                }`}
              >
                {/* Thumbnail */}
                <div className={styles.thumb}>
                  {item.preview && (
                    <img src={item.preview} alt="" className={styles.thumbImg} />
                  )}
                  {item.media_type === "video" && !item.preview && (
                    <div className={styles.videoPlaceholder}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}

                  {/* Progress overlay */}
                  {item.status === "uploading" && (
                    <div className={styles.overlay}>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className={styles.progressLabel}>{item.progress}%</span>
                    </div>
                  )}

                  {item.status === "processing" && (
                    <div className={styles.overlay}>
                      <span className={styles.processingLabel}>Processing…</span>
                    </div>
                  )}

                  {item.is_cover && (
                    <span className={styles.coverBadge}>Cover</span>
                  )}

                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(i);
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Status bar */}
                <div className={styles.statusBar}>
                  <div
                    className={`${styles.dot} ${styles[item.status]}`}
                  />
                  <span className={styles.statusLabel}>
                    {item.error ?? STATUS_LABEL[item.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {items.some((i) => i.status === "error") && (
        <p className={styles.errorMsg}>Some files failed. Remove them and try again.</p>
      )}

      {allReady && (
        <p className={styles.readyMsg}>All media ready. You can publish your gig.</p>
      )}
    </div>
  );
}
