import { create } from "zustand";

const useStore = create((set) => ({
  url: null,
  color: "#71A246",
  mobile: false,
  setUrl: (url) => set(() => ({ url })),
  setColor: (color) => set(() => ({ color })),
  setMobile: (mobile) => set(() => ({ mobile })),
}));

export default useStore;
