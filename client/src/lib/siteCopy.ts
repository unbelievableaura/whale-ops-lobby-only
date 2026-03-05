export interface SiteCopy {
  loadingPressAnyKey: string;
  loadingOrClick: string;
  loadingEntering: string;
  loadingVersion: string;
  homeMenuStart: string;
  homeStartTooltip: string;
  homeLobbyLabel: string;
  homePlayerCount: string;
  homePlayerName: string;
  homeSplitScreenHint: string;
  homeMapName: string;
  homeMapMode: string;
  homePartyLeader: string;
  homePartyPrivacy: string;
  homeLoadingPrefix: string;
  homeTrailerClickLabel: string;
  homeTrailerTitle: string;
  homeTrailerSubtitle: string;
}

export type SiteCopyField = keyof SiteCopy;

export const SITE_COPY_STORAGE_KEY = "whale_ops_asset_page_copy";

export const DEFAULT_SITE_COPY: SiteCopy = {
  loadingPressAnyKey: "PRESS ANY KEY TO ENTER",
  loadingOrClick: "OR CLICK ANYWHERE",
  loadingEntering: "ENTERING",
  loadingVersion: "RED WHITE & BLUE\u2122 v1.0",
  homeMenuStart: "START GAME",
  homeStartTooltip: "COMING SOON",
  homeLobbyLabel: "LOBBY",
  homePlayerCount: "1 Players (18 Max)",
  homePlayerName: "DONALD TRUMP",
  homeSplitScreenHint: "Add controller for Split Screen",
  homeMapName: "IRAN",
  homeMapMode: "PVP",
  homePartyLeader: "You are Party Leader",
  homePartyPrivacy: "Party Privacy: Open",
  homeLoadingPrefix: "INITIALIZING TACTICAL INTERFACE...",
  homeTrailerClickLabel: "Click to Watch Trailer",
  homeTrailerTitle: "RED WHITE & BLUE TRAILER",
  homeTrailerSubtitle: "OFFICIAL PREVIEW",
};

const SITE_COPY_KEYS = Object.keys(DEFAULT_SITE_COPY) as SiteCopyField[];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeSiteCopy(raw: unknown): SiteCopy {
  if (!isRecord(raw)) {
    return { ...DEFAULT_SITE_COPY };
  }

  const next: SiteCopy = { ...DEFAULT_SITE_COPY };
  for (const key of SITE_COPY_KEYS) {
    const value = raw[key];
    if (typeof value === "string") {
      next[key] = value;
    }
  }
  return next;
}

export function readLocalSiteCopy(): SiteCopy | null {
  const raw = localStorage.getItem(SITE_COPY_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return mergeSiteCopy(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalSiteCopy(copy: SiteCopy): void {
  localStorage.setItem(SITE_COPY_STORAGE_KEY, JSON.stringify(copy));
}
