import * as Sentry from "@sentry/react";
import { create } from "zustand";

const useStore = create((set) => ({
  user: null,
  publisher: null,
  flux: "to",
  setUser: (user) => set(() => ({ user })),
  setPublisher: (publisher) => {
    const normalized = publisher ? { ...publisher, _id: publisher._id ?? publisher.id } : publisher;
    localStorage.setItem("publisher", normalized?.id || "");
    set(() => ({ publisher: normalized, flux: normalized?.isAnnonceur ? "to" : "from" }));
  },
  setFlux: (flux) => {
    localStorage.setItem("flux", flux);
    set(() => ({ flux }));
  },
  setAuth: (user, publisher) => {
    const normalizedPublisher = publisher ? { ...publisher, _id: publisher._id ?? publisher.id } : publisher;
    if (user) Sentry.setUser({ email: user.email, id: user._id, username: `${user.firstname} ${user.lastname}` });
    else Sentry.setUser(null);
    set(() => ({ user, publisher: normalizedPublisher }));
  },
}));

export default useStore;
