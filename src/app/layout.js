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
// import AuthGuard from "../components/AuthGuard";

const inter = Inter({ subsets: ["latin"] });

// Create emotion cache
const clientSideEmotionCache = createCache({ key: "css" });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
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
      </body>
    </html>
  );
}
