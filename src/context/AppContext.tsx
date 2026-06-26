import React, { createContext, useContext, useState, useEffect } from "react";
import { setServiceContext } from "../services/dashboard.service";

export interface AppUser {
  userID: number;
  firstName: string;
  lastName: string;
  roles: Record<string, unknown>;
  facilityIDs: string;
  facilities: { id: string | number, name: string }[];
  currentFacilityID: string | number;
  csrfToken: string;
}

// Ensure TypeScript knows about window.__APP_CONTEXT__
declare global {
  interface Window {
    __APP_CONTEXT__?: AppUser;
  }
}


const AppContext = createContext<AppUser | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

// Helper to extract properties from a potentially uppercase-keyed object
function getCaseInsensitiveProp(obj: any, key: string, fallback: any = undefined): any {
  if (!obj || typeof obj !== 'object') return fallback;
  const lowerKey = key.toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lowerKey) {
      return obj[k];
    }
  }
  return fallback;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Start with injected data if available (synchronous for UAT embedded)
  const [userContext, setUserContext] = useState<AppUser | null>(
    window.__APP_CONTEXT__ || null
  );
  const [loading, setLoading] = useState(!window.__APP_CONTEXT__);

  useEffect(() => {
    // If we already have the context from UAT inject, don't fetch
    if (userContext) {
      setServiceContext(userContext);
      return;
    }

    async function fetchSession() {
      try {
        const response = await fetch('/ReactTaskBoard/getSessionContext', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          
          // Map properties case-insensitively to ensure camelCase keys are used
          const normalizedUser: AppUser = {
            userID: Number(getCaseInsensitiveProp(data, 'userID', 0)),
            firstName: String(getCaseInsensitiveProp(data, 'firstName', '')),
            lastName: String(getCaseInsensitiveProp(data, 'lastName', '')),
            roles: getCaseInsensitiveProp(data, 'roles', {}),
            facilityIDs: String(getCaseInsensitiveProp(data, 'facilityIDs', '')),
            facilities: (getCaseInsensitiveProp(data, 'facilities') || []).map((fac: any) => ({
              id: getCaseInsensitiveProp(fac, 'id', getCaseInsensitiveProp(fac, 'facilityid', '')),
              name: getCaseInsensitiveProp(fac, 'name', getCaseInsensitiveProp(fac, 'facilityname', ''))
            })),
            currentFacilityID: getCaseInsensitiveProp(data, 'currentFacilityID', ''),
            csrfToken: String(getCaseInsensitiveProp(data, 'csrfToken', ''))
          };

          if (normalizedUser.userID > 0) {
            setUserContext(normalizedUser);
            setServiceContext(normalizedUser);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error("Failed to fetch session context:", e);
      }

      // Redirect if session is missing or invalid (Enforce authentication even for local dev server direct access)
      alert("Your session has timed out or is invalid. You will be redirected to the login page.");
      const loginUrl = import.meta.env.VITE_LOGIN_URL || '/Login';
      window.location.href = loginUrl;
    }

    fetchSession();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent"></div>
          <p className="mt-4 text-sm font-medium text-slate-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!userContext) {
    return null;
  }

  return (
    <AppContext.Provider value={userContext}>
      {children}
    </AppContext.Provider>
  );
}
