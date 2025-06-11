import { create } from "zustand";

const useStore = create((set) => ({
  url: null,
  color: "#71A246",
  setUrl: (url) => set(() => ({ url })),
  setColor: (color) => set(() => ({ color })),
}));

export default useStore;
