"use client";

import "./globals.css";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import theme from "../styles/theme";
import Layout from "../components/Layout";
import { AuthProvider } from "../components/AuthContext";
// import AuthGuard from "../components/AuthGuard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { usePathname } from "next/navigation";


// Create emotion cache
const clientSideEmotionCache = createCache({ key: "css" });

export default function RootLayout({ children }) {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();
  const isEmployeePortal = pathname?.startsWith('/employee');

  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
        <AuthProvider>
        <CacheProvider value={clientSideEmotionCache}>
          <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <CssBaseline />
              {isEmployeePortal ? (
                children
              ) : (
                <Layout>{children}</Layout>
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
