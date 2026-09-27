"use client";

import { useEffect } from "react";
import { withBasePath } from "@/lib/config";

/**
 * Registers the (deliberately minimal) service worker in production only:
 * - navigations are network-first, so release data is never served stale
 * - the SW never touches api.github.com — caching happens in the app layer
 */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register(withBasePath("/sw.js")).catch(() => {
        /* installation is a progressive enhancement — ignore failures */
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
