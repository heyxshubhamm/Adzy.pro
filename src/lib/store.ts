import { create } from 'zustand';

interface PublishState {
  step: number;
  data: {
    title: string;
    niche: string;
    url: string;
    description: string;
    dr: number;
    traffic: string;
    price: number;
    tags: string[];
  };
  setStep: (step: number) => void;
  updateData: (newData: Partial<PublishState['data']>) => void;
  reset: () => void;
}

export const usePublishStore = create<PublishState>((set) => ({
  step: 1,
  data: {
    title: '',
    niche: 'Technology',
    url: '',
    description: '',
    dr: 0,
    traffic: '',
    price: 0,
    tags: [],
  },
  setStep: (step) => set({ step }),
  updateData: (newData) => set((state) => ({ 
    data: { ...state.data, ...newData } 
  })),
  reset: () => set({ 
    step: 1, 
    data: { 
      title: '', 
      niche: 'Technology', 
      url: '', 
      description: '', 
      dr: 0, 
      traffic: '', 
      price: 0, 
      tags: [] 
    } 
  }),
}));
