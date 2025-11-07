import * as Sentry from "@sentry/react";
import { create } from "zustand";

const useStore = create((set) => ({
  user: null,
  publisher: null,
  flux: "to",
  setUser: (user) => set(() => ({ user })),
  setPublisher: (publisher) => {
    localStorage.setItem("publisher", publisher.id);
    set(() => ({ publisher, flux: publisher.isAnnonceur ? "to" : "from" }));
  },
  setFlux: (flux) => {
    localStorage.setItem("flux", flux);
    set(() => ({ flux }));
  },
  setAuth: (user, publisher) => {
    if (user) Sentry.setUser({ email: user.email, id: user._id, username: `${user.firstname} ${user.lastname}` });
    else Sentry.setUser(null);
    set(() => ({ user, publisher }));
  },
}));

export default useStore;
