import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GigOut } from "@/types/gig";

export type PackageTier = "basic" | "standard" | "premium";

export interface PackageForm {
  tier: PackageTier;
  name: string;
  description: string;
  price: number | string;
  delivery_days: number | string;
  revisions?: number | string;
  features?: string[];
}

export interface RequirementForm {
  question: string;
  input_type?: "text" | "textarea" | "file" | "multiple_choice";
  choices?: string[];
  is_required: boolean;
}

export interface MediaForm {
  id?: string;
  s3_key?: string;
  raw_key?: string;
  processed_key?: string;
  url?: string;
  is_cover: boolean;
  sort_order?: number;
  file?: File;
  preview?: string;
  media_type?: "image" | "video";
  uploading?: boolean;
  status?: "pending" | "uploading" | "processing" | "ready" | "error";
  processed_urls?: Record<string, string>;
  error?: string;
}

interface GigFormState {
  step: number;
  gigId: string;
  data: {
    title: string;
    description: string;
    category_id: string;
    subcategory: string;
    tags: string[];
    packages: PackageForm[];
    requirements: RequirementForm[];
    media: MediaForm[];
  };
  setStep: (step: number) => void;
  setGigId: (gigId: string) => void;
  updateData: (data: Partial<GigFormState["data"]>) => void;
  hydrate: (gig: GigOut) => void;
  reset: () => void;
}

function getEmptyData(): GigFormState["data"] {
  return {
    title: "",
    description: "",
    category_id: "",
    subcategory: "",
    tags: [],
    packages: [
      {
        tier: "basic",
        name: "",
        description: "",
        price: 5,
        delivery_days: 1,
        revisions: 1,
        features: [],
      },
    ],
    requirements: [],
    media: [],
  };
}

export const useGigFormStore = create<GigFormState>()(
  persist(
    (set) => ({
      step: 1,
      gigId: "",
      data: getEmptyData(),
      setStep: (step) => set({ step }),
      setGigId: (gigId) => set({ gigId }),
      updateData: (data) => set((state) => ({ data: { ...state.data, ...data } })),
      hydrate: (gig) =>
        set({
          step: 1,
          gigId: gig.id,
          data: {
            title: gig.title,
            description: gig.description,
            category_id: gig.category_id ?? "",
            subcategory: gig.subcategory ?? "",
            tags: gig.tags ?? [],
            packages: [...(gig.packages ?? [])]
              .sort((a, b) => {
                const order = { basic: 0, standard: 1, premium: 2 };
                return order[a.tier] - order[b.tier];
              })
              .map((pkg) => ({
                tier: pkg.tier,
                name: pkg.name,
                description: pkg.description,
                price: String(pkg.price),
                delivery_days: String(pkg.delivery_days),
                revisions: String(pkg.revisions ?? 1),
                features: pkg.features ?? [],
              })),
            requirements: [...(gig.requirements ?? [])]
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((req) => ({
                question: req.question,
                input_type: req.input_type,
                choices: req.choices ?? [],
                is_required: req.is_required,
              })),
            media: [...(gig.media ?? [])]
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((m) => ({
                id: m.id,
                raw_key: m.raw_key,
                processed_key: m.processed_key,
                s3_key: m.processed_key ?? m.raw_key,
                url: m.url,
                preview: m.url,
                is_cover: m.is_cover,
                sort_order: m.sort_order,
                media_type: m.media_type,
                uploading: false,
                status: m.status ?? "ready",
                processed_urls: m.processed_urls ?? {},
              })),
          },
        }),
      reset: () => set({ step: 1, gigId: "", data: getEmptyData() }),
    }),
    {
      name: "adzy-gig-form-cache",
      partialize: (state) => ({
        ...state,
        data: {
          ...state.data,
          media: state.data.media.map((item) => ({
            ...item,
            file: undefined,
          })),
        },
      }),
    }
  )
);

export function useGigForm() {
  const {
    step,
    setStep,
    gigId,
    setGigId,
    data,
    updateData,
    hydrate,
    reset,
  } = useGigFormStore();

  return {
    step,
    setStep,
    gigId,
    setGigId,
    subcategory: data.subcategory,
    title: data.title,
    description: data.description,
    categoryId: data.category_id,
    tags: data.tags,
    packages: data.packages,
    requirements: data.requirements,
    media: data.media,
    setOverview: (overview: {
      title?: string;
      description?: string;
      categoryId?: string;
      subcategory?: string;
      tags?: string[];
    }) =>
      updateData({
        title: overview.title ?? data.title,
        description: overview.description ?? data.description,
        category_id: overview.categoryId ?? data.category_id,
        subcategory: overview.subcategory ?? data.subcategory,
        tags: overview.tags ?? data.tags,
      }),
    setPackages: (packages: PackageForm[]) => updateData({ packages }),
    setRequirements: (requirements: RequirementForm[]) => updateData({ requirements }),
    setMedia: (media: MediaForm[]) => updateData({ media }),
    addMedia: (media: MediaForm) => updateData({ media: [...data.media, media] }),
    updateMedia: (index: number, media: Partial<MediaForm>) =>
      updateData({
        media: data.media.map((item, i) => (i === index ? { ...item, ...media } : item)),
      }),
    removeMedia: (index: number) =>
      updateData({ media: data.media.filter((_, i) => i !== index) }),
    hydrate,
    reset,
  };
}
