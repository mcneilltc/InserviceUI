"use client";

import { Inter } from "next/font/google";
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

const inter = Inter({ subsets: ["latin"] });

// Create emotion cache
const clientSideEmotionCache = createCache({ key: "css" });

export default function RootLayout({ children }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
        <AuthProvider>
        <CacheProvider value={clientSideEmotionCache}>
          <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <CssBaseline />
              {/* <AuthGuard> */}
              <Layout>{children}</Layout>
              {/* </AuthGuard> */}
            </LocalizationProvider>
          </ThemeProvider>
        </CacheProvider>
        </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
