"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      void navigator.serviceWorker
        .register(`${basePath}/sw.js`)
        .then(async () => {
          const registration = await navigator.serviceWorker.ready;
          const resources = performance
            .getEntriesByType("resource")
            .map((entry) => entry.name)
            .filter((url) => new URL(url).origin === location.origin);
          registration.active?.postMessage({
            type: "CACHE_RESOURCES",
            resources: [location.href, ...resources],
          });
        });
    }
  }, []);

  return null;
}
