"use client";

import "../lib/axiosConfig";
import "../lib/timezone"; // side effect only — pins moment's default zone; see that file
import "./globals.css";
import { ThemeProvider } from "@mui/material/styles";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import CssBaseline from "@mui/material/CssBaseline";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import theme from "../styles/theme";
import Layout from "../components/Layout";
import { AuthProvider } from "../components/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { usePathname } from "next/navigation";


// Create emotion cache
const clientSideEmotionCache = createCache({ key: "css" });

const PUBLIC_PREFIXES = ['/employee', '/checkin'];
const PUBLIC_EXACT = ['/', '/login'];

// React Query defaults to staleTime: 0 and refetchOnWindowFocus: true, which
// means every page (re)mount and every tab-refocus re-fetches from the API
// even when nothing has changed — the opposite of a cache. Since every
// mutation in this app already calls queryClient.invalidateQueries() on the
// relevant key (see manage-employees, manage-sites, manage-topics, etc.),
// data becomes fresh the moment a real write happens; there's no need to
// also re-fetch on a timer/refocus. A generous staleTime turns "visit two
// pages that both need /api/employees" or "tab away and back" from two
// Firestore reads into one, which is what was blowing through the daily
// read quota.
//
// gcTime must stay comfortably above staleTime: staleTime only matters while
// a query's data is still in the cache, and gcTime is what controls whether
// it's still there at all once every component using it has unmounted (e.g.
// navigating Manage Employees -> Reports -> back). Set it too low and a
// longer staleTime never gets the chance to matter for anyone who navigated
// away for a few minutes.
const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
    },
  },
};

export default function RootLayout({ children }) {
  const [queryClient] = useState(() => new QueryClient(queryClientConfig));
  const pathname = usePathname();
  const isEmployeePortal = pathname?.startsWith('/employee');
  const isPublicPath = PUBLIC_EXACT.includes(pathname || '') || PUBLIC_PREFIXES.some((p) => pathname?.startsWith(p));

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>CertLedgerIQ</title>
        <InitColorSchemeScript attribute="class" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
        <AuthProvider>
        <CacheProvider value={clientSideEmotionCache}>
          <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <CssBaseline />
              {isPublicPath ? (
                children
              ) : isEmployeePortal ? (
                children
              ) : (
                <Layout>
                  <ProtectedRoute pathname={pathname}>{children}</ProtectedRoute>
                </Layout>
              )}
            </LocalizationProvider>
          </ThemeProvider>
        </CacheProvider>
        </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
