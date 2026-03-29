"use client";
import { useState } from "react";
import type { MediaItem } from "@/types/gig";

interface Props {
  media: MediaItem[];
  title: string;
}

export function GigMediaGallery({ media, title }: Props) {
  const [active, setActive] = useState(0);

  if (!media.length) return null;

  const current = media[active];
  const mainUrl = current.processed_urls?.cover ?? current.url;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Main viewer */}
      <div
        style={{
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          aspectRatio: "16/9",
          position: "relative",
        }}
      >
        {current.media_type === "video" ? (
          <video
            src={current.url}
            controls
            poster={current.processed_urls?.thumbnail_url}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
        ) : (
          <img
            src={mainUrl}
            alt={`${title} — image ${active + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}

        {media.length > 1 && (
          <>
            <button
              onClick={() => setActive((a) => Math.max(0, a - 1))}
              disabled={active === 0}
              style={arrowStyle("left")}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              onClick={() => setActive((a) => Math.min(media.length - 1, a + 1))}
              disabled={active === media.length - 1}
              style={arrowStyle("right")}
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {media.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {media.map((item, i) => {
            const thumbUrl =
              item.processed_urls?.small ??
              item.processed_urls?.thumbnail ??
              item.url;
            return (
              <button
                key={item.id}
                onClick={() => setActive(i)}
                style={{
                  flexShrink: 0,
                  width: 72,
                  height: 54,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: `${i === active ? "2px" : "1px"} solid ${
                    i === active ? "rgba(0,240,255,0.6)" : "rgba(255,255,255,0.1)"
                  }`,
                  padding: 0,
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.04)",
                  transition: "border-color 0.15s",
                }}
              >
                {item.media_type === "video" ? (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                ) : (
                  <img
                    src={thumbUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: 10,
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "rgba(0,0,0,0.5)",
    border: "none",
    color: "#fff",
    fontSize: 22,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    padding: 0,
    transition: "background 0.15s",
  };
}
