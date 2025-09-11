import { create } from "zustand";
import { StoreState } from "../types";

const useStore = create<StoreState>((set) => ({
  url: null,
  color: "#71A246",
  mobile: false,
  setUrl: (url: string) => set(() => ({ url })),
  setColor: (color: string) => set(() => ({ color })),
  setMobile: (mobile: boolean) => set(() => ({ mobile })),
}));

export default useStore;
