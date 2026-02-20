import { createContext, useContext } from "react";

import defaultAnalyticsProvider from "@/services/analytics/defaultProvider";

const AnalyticsProviderContext = createContext(defaultAnalyticsProvider);

export const AnalyticsProvider = ({ provider = defaultAnalyticsProvider, children }) => {
  return <AnalyticsProviderContext.Provider value={provider}>{children}</AnalyticsProviderContext.Provider>;
};

export const useAnalyticsProvider = () => {
  return useContext(AnalyticsProviderContext);
};
