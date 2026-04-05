"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCategoryTree } from "@/hooks/useCategoryTree";

export function MegaMenu() {
  const { tree, prefetchServices, servicesCache } = useCategoryTree();
  const [activeSlug, setActive] = useState<string | null>(null);
  const [activeSub,  setActiveSub] = useState<string | null>(null);
  const leaveTimer            = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const router                = useRouter();

  function enter(slug: string, firstSubSlug: string) {
    clearTimeout(leaveTimer.current);
    setActive(slug);
    setActiveSub(firstSubSlug);
    if (firstSubSlug) {
      prefetchServices(firstSubSlug);
    }
  }

  function handleSubEnter(subSlug: string) {
    setActiveSub(subSlug);
    prefetchServices(subSlug);
  }

  function leave() {
    leaveTimer.current = setTimeout(() => {
      setActive(null);
      setActiveSub(null);
    }, 120);
  }

  function cancelLeave() {
    clearTimeout(leaveTimer.current);
  }

  const activeCat     = tree.find(c => c.slug === activeSlug);
  const activeSubCat  = activeCat?.children?.find(c => c.slug === activeSub);
  
  // The dynamically fetched popular services for the highlighted subcategory
  const displayTiles = activeSubCat ? (servicesCache[activeSubCat.slug] || []) : [];

  return (
    <nav style={{ position: "relative", borderBottom: "0.5px solid var(--color-border-tertiary, #eaeaea)" }}>

      {/* ── Top bar ── */}
      <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none" }}>
        {tree.map(cat => (
          <div
            key={cat.slug}
            onMouseEnter={() => enter(cat.slug, cat.children?.[0]?.slug ?? "")}
            onMouseLeave={leave}
            style={{ position: "relative", flexShrink: 0 }}
          >
            <button
              style={{
                padding:      "12px 14px",
                fontSize:     13,
                fontWeight:   500,
                background:   "none",
                border:       "none",
                borderBottom: `2px solid ${activeSlug === cat.slug ? (cat.color || "var(--color-text-primary, #111)") : "transparent"}`,
                color:        activeSlug === cat.slug ? (cat.color || "var(--color-text-primary, #111)") : "var(--color-text-secondary, #666)",
                cursor:       "pointer",
                whiteSpace:   "nowrap",
                transition:   "color .15s, border-color .15s",
              }}
            >
              {cat.icon && <span style={{ marginRight: 6 }}>{cat.icon}</span>}
              {cat.name}
            </button>
          </div>
        ))}
      </div>

      {/* ── Mega dropdown ── */}
      {activeCat && activeCat.children && activeCat.children.length > 0 && (
        <div
          onMouseEnter={cancelLeave}
          onMouseLeave={leave}
          style={{
            position:   "absolute",
            top:        "100%",
            left:       0,
            background: "var(--color-background-primary, #fff)",
            border:     "0.5px solid var(--color-border-tertiary, #eaeaea)",
            borderTop:  "none",
            borderRadius: "0 0 12px 12px",
            boxShadow:  "0 12px 24px rgba(0,0,0,0.06)",
            padding:    24,
            display:    "flex",
            gap:        24,
            minWidth:   680,
            zIndex:     100,
          }}
        >
          {/* Left: subcategory list */}
          <div style={{
            width:       200,
            flexShrink:  0,
            borderRight: "0.5px solid var(--color-border-tertiary, #eaeaea)",
            paddingRight: 20,
            display:     "flex",
            flexDirection: "column",
            gap:         2,
          }}>
            {activeCat.children.map(sub => (
              <button
                key={sub.slug}
                onMouseEnter={() => handleSubEnter(sub.slug)}
                onClick={() => router.push(`/search?category=${activeCat.slug}&subcategory=${sub.slug}`)}
                style={{
                  display:        "flex",
                  justifyContent: "space-between",
                  alignItems:     "center",
                  padding:        "8px 10px",
                  borderRadius:   6,
                  background:     activeSub === sub.slug ? "var(--color-background-secondary, #f7f7f7)" : "none",
                  color:          activeSub === sub.slug ? "var(--color-text-primary, #111)" : "var(--color-text-secondary, #666)",
                  border:         "none",
                  cursor:         "pointer",
                  fontSize:       13,
                  fontWeight:     activeSub === sub.slug ? 600 : 400,
                  textAlign:      "left",
                  width:          "100%",
                  transition:     "background .1s, color .1s",
                }}
              >
                <span>{sub.name}</span>
                <span style={{ fontSize: 13, opacity: activeSub === sub.slug ? 0.8 : 0.2 }}>›</span>
              </button>
            ))}
          </div>

          {/* Right: popular gig type tiles */}
          {activeSubCat && (
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary, #999)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>
                Popular in {activeSubCat.name}
              </p>
              
              {displayTiles.length === 0 ? (
                <div style={{ fontSize: 13, color: '#999', padding: "10px 0" }}>
                  <span style={{ display: "inline-block", animation: "pulse 1.5s infinite opacity" }}>Loading highest volume services...</span>
                </div>
              ) : (
                <div style={{
                  display:               "grid",
                  gridTemplateColumns:   "repeat(auto-fill, minmax(160px, 1fr))",
                  gap:                   6,
                }}>
                  {displayTiles.map((item, i) => (
                    <Link
                      key={item.slug}
                      href={`/search?category=${activeCat.slug}&subcategory=${activeSubCat.slug}&q=${item.name}`}
                      style={{
                        padding:      "7px 10px",
                        borderRadius: 6,
                        fontSize:     13,
                        color:        "var(--color-text-secondary, #444)",
                        textDecoration: "none",
                        display:      "block",
                        transition:   "background .1s, color .1s",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = "var(--color-background-secondary, #f7f7f7)";
                        (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary, #111)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary, #444)";
                      }}
                    >
                      {item.name}
                      {i === 0 && (
                        <span style={{ fontSize: 10, marginLeft: 6, padding: "2px 6px", borderRadius: 10, background: "#EEEDFE", color: "#3C3489", fontWeight: 600 }}>
                          Hot
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
