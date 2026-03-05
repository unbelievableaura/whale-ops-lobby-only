import { useEffect, useState } from "react";
import { DEFAULT_SITE_COPY, mergeSiteCopy, readLocalSiteCopy, type SiteCopy } from "@/lib/siteCopy";

function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
  return fallback;
}

export function useSiteCopy(): SiteCopy {
  const [copy, setCopy] = useState<SiteCopy>({ ...DEFAULT_SITE_COPY });

  useEffect(() => {
    const localCopy = readLocalSiteCopy();
    if (localCopy) {
      setCopy((prev) => ({ ...prev, ...localCopy }));
    }

    void (async () => {
      try {
        const response = await fetch("/api/site-copy-public");
        const payload = (await response.json()) as unknown;
        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "Unable to load site copy."));
        }

        const next = mergeSiteCopy(
          typeof payload === "object" && payload !== null && "copy" in payload ? payload.copy : undefined,
        );
        const localOverride = readLocalSiteCopy();
        setCopy(localOverride ? { ...next, ...localOverride } : next);
      } catch {
        // Keep local/default copy if endpoint is unavailable.
      }
    })();
  }, []);

  return copy;
}
