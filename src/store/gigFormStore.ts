import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  input_type?: "text" | "textarea" | "file";
  choices?: string[];
  is_required: boolean;
}

export interface MediaForm {
  s3_key?: string;
  url?: string;
  is_cover: boolean;
  file?: File;
  preview?: string;
  media_type?: "image" | "video";
  uploading?: boolean;
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
    reset,
  } = useGigFormStore();

  return {
    step,
    setStep,
    gigId,
    setGigId,
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
      tags?: string[];
    }) =>
      updateData({
        title: overview.title ?? data.title,
        description: overview.description ?? data.description,
        category_id: overview.categoryId ?? data.category_id,
        tags: overview.tags ?? data.tags,
      }),
    setPackages: (packages: PackageForm[]) => updateData({ packages }),
    setRequirements: (requirements: RequirementForm[]) => updateData({ requirements }),
    addMedia: (media: MediaForm) => updateData({ media: [...data.media, media] }),
    updateMedia: (index: number, media: Partial<MediaForm>) =>
      updateData({
        media: data.media.map((item, i) => (i === index ? { ...item, ...media } : item)),
      }),
    removeMedia: (index: number) =>
      updateData({ media: data.media.filter((_, i) => i !== index) }),
    reset,
  };
}
