import React, { createContext, useContext } from "react";

export interface AppUser {
  userID: number;
  firstName: string;
  lastName: string;
  roles: Record<string, unknown>;
  facilityIDs: string;
  csrfToken: string;
}

// Ensure TypeScript knows about window.__APP_CONTEXT__
declare global {
  interface Window {
    __APP_CONTEXT__: AppUser;
  }
}

// Fallback for local dev without CF (if necessary)
const defaultContext: AppUser = {
  userID: 0,
  firstName: "Local",
  lastName: "Dev",
  roles: {},
  facilityIDs: "",
  csrfToken: ""
};

const contextValue = window.__APP_CONTEXT__ || defaultContext;

const AppContext = createContext<AppUser>(contextValue);

export const useAppContext = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
