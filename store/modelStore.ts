"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ModelState {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      selectedModel: "auto", // Default to auto selection
      setSelectedModel: (model: string) => set({ selectedModel: model }),
    }),
    {
      name: "model-selection", // localStorage key
    }
  )
);
