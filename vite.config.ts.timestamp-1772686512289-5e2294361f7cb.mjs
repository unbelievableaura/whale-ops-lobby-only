// vite.config.ts
import { jsxLocPlugin } from "file:///Users/dustin/Documents/New%20project/whale-ops-2/node_modules/@builder.io/vite-plugin-jsx-loc/dist/index.js";
import tailwindcss from "file:///Users/dustin/Documents/New%20project/whale-ops-2/node_modules/@tailwindcss/vite/dist/index.mjs";
import react from "file:///Users/dustin/Documents/New%20project/whale-ops-2/node_modules/@vitejs/plugin-react/dist/index.js";
import path5 from "path";
import { defineConfig } from "file:///Users/dustin/Documents/New%20project/whale-ops-2/node_modules/vite/dist/node/index.js";
import { vitePluginManusRuntime } from "file:///Users/dustin/Documents/New%20project/whale-ops-2/node_modules/vite-plugin-manus-runtime/dist/index.js";

// server/assetManager.ts
import fs2 from "node:fs/promises";
import path2 from "node:path";

// server/assetAccess.ts
import fs from "node:fs/promises";
import path from "node:path";
var ACCESS_FILE_NAME = ".asset-access.json";
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isAccessLevel(value) {
  return value === "public" || value === "private";
}
function getAccessFilePath(assetDirectory) {
  return path.resolve(assetDirectory, ACCESS_FILE_NAME);
}
async function readAssetAccessMap(assetDirectory) {
  const filePath = getAccessFilePath(assetDirectory);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return {};
    }
    const output = {};
    for (const [filename, level] of Object.entries(parsed)) {
      if (!filename.startsWith(".") && isAccessLevel(level)) {
        output[filename] = level;
      }
    }
    return output;
  } catch (error) {
    const code = error.code;
    if (code === "ENOENT") {
      return {};
    }
    throw error;
  }
}
async function writeAssetAccessMap(assetDirectory, map) {
  const filePath = getAccessFilePath(assetDirectory);
  const normalized = Object.fromEntries(
    Object.entries(map).filter(([filename, level]) => !filename.startsWith(".") && isAccessLevel(level)).sort(([a], [b]) => a.localeCompare(b))
  );
  await fs.mkdir(assetDirectory, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(normalized, null, 2)}
`, "utf8");
}
function getAssetAccessLevel(accessMap, filename) {
  return accessMap[filename] ?? "public";
}
async function setAssetAccessLevel(assetDirectory, filename, access) {
  if (!isAccessLevel(access)) {
    throw new AssetManagerError("Invalid access value.");
  }
  if (!filename || filename.startsWith(".")) {
    throw new AssetManagerError("Invalid filename.");
  }
  const accessMap = await readAssetAccessMap(assetDirectory);
  accessMap[filename] = access;
  await writeAssetAccessMap(assetDirectory, accessMap);
  return access;
}
function getAccessMetadataFileName() {
  return ACCESS_FILE_NAME;
}

// server/assetManager.ts
var IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif", ".bmp", ".ico"]);
var VIDEO_EXTENSIONS = /* @__PURE__ */ new Set([".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv"]);
var AUDIO_EXTENSIONS = /* @__PURE__ */ new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]);
var DEFAULT_ASSET_RELATIVE_DIR = path2.join("client", "public", "images");
var EXCLUDED_FILENAMES = /* @__PURE__ */ new Set(["assets-manifest.json", getAccessMetadataFileName()]);
var MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
var AssetManagerError = class extends Error {
  statusCode;
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AssetManagerError";
    this.statusCode = statusCode;
  }
};
function getAssetKind(filename) {
  const ext = path2.extname(filename).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) {
    return "image";
  }
  if (VIDEO_EXTENSIONS.has(ext)) {
    return "video";
  }
  if (AUDIO_EXTENSIONS.has(ext)) {
    return "audio";
  }
  return "other";
}
function validateFilename(filename) {
  if (!filename || typeof filename !== "string") {
    throw new AssetManagerError("Missing filename.");
  }
  const clean = path2.basename(filename.trim());
  if (!clean || clean === "." || clean === ".." || clean !== filename.trim()) {
    throw new AssetManagerError("Invalid filename.");
  }
  return clean;
}
function resolveAssetPath(assetDirectory, filename) {
  const safeName = validateFilename(filename);
  const assetDir = path2.resolve(assetDirectory);
  const resolved = path2.resolve(assetDir, safeName);
  if (!(resolved === assetDir || resolved.startsWith(`${assetDir}${path2.sep}`))) {
    throw new AssetManagerError("Invalid asset path.");
  }
  return resolved;
}
async function toAssetInfo(rootDir, filename) {
  const absolutePath = resolveAssetPath(rootDir, filename);
  const stats = await fs2.stat(absolutePath);
  return {
    filename,
    url: `/images/${filename}`,
    type: getAssetKind(filename),
    sizeBytes: stats.size,
    updatedAt: stats.mtime.toISOString()
  };
}
function decodeBase64Payload(contentBase64, maxBytes = MAX_UPLOAD_BYTES) {
  if (!contentBase64 || typeof contentBase64 !== "string") {
    throw new AssetManagerError("Missing file content.");
  }
  const normalized = contentBase64.includes(",") ? contentBase64.slice(contentBase64.indexOf(",") + 1) : contentBase64;
  const data = Buffer.from(normalized, "base64");
  if (data.length === 0) {
    throw new AssetManagerError("Uploaded file is empty.");
  }
  if (data.length > maxBytes) {
    throw new AssetManagerError("File is too large.", 413);
  }
  return data;
}
async function listAssetsFromDirectory(assetDirectory) {
  const assetDir = path2.resolve(assetDirectory);
  await fs2.mkdir(assetDir, { recursive: true });
  const entries = await fs2.readdir(assetDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && !entry.name.startsWith(".") && !EXCLUDED_FILENAMES.has(entry.name)).map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
  return Promise.all(files.map((name) => toAssetInfo(assetDir, name)));
}
async function replaceAssetInDirectory(assetDirectory, filename, fileContent) {
  if (fileContent.length > MAX_UPLOAD_BYTES) {
    throw new AssetManagerError("File is too large.", 413);
  }
  const assetDir = path2.resolve(assetDirectory);
  const absolutePath = resolveAssetPath(assetDir, filename);
  await fs2.mkdir(assetDir, { recursive: true });
  await fs2.writeFile(absolutePath, fileContent);
  return toAssetInfo(assetDir, validateFilename(filename));
}

// server/assetPageCopy.ts
import fs3 from "node:fs/promises";
import path3 from "node:path";
var COPY_FILE_NAME = ".asset-page-copy.json";
var DEFAULT_ASSET_PAGE_COPY = {
  loadingPressAnyKey: "PRESS ANY KEY TO ENTER",
  loadingOrClick: "OR CLICK ANYWHERE",
  loadingEntering: "ENTERING",
  loadingVersion: "RED WHITE & BLUE\u2122 v1.0",
  homeMenuStart: "START GAME",
  homeMenuEmotes: "EMOTES",
  homeMenuRoadmap: "ROADMAP",
  homeMenuAssets: "ASSET MANAGER",
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
  emotesArmoryLabel: "ARMORY",
  emotesTitle: "EMOTES",
  emotesBackButton: "\u2190 BACK TO LOBBY",
  emotesSelectToPreview: "SELECT AN EMOTE TO PREVIEW",
  emotesNoSelection: "NO EMOTE SELECTED",
  emotesSelectPrompt: "SELECT AN EMOTE",
  emotesAvailableTitle: "AVAILABLE EMOTES",
  emotesLegendaryLabel: "LEGENDARY",
  emotesEpicLabel: "EPIC",
  emotesRareLabel: "RARE",
  emotesFooterCopyright: "2026 RED WHITE & BLUE",
  roadmapHeaderLabel: "MISSION BRIEFING",
  roadmapTitle: "ROADMAP",
  roadmapBackButton: "\u2190 BACK",
  roadmapObjectivesLabel: "OBJECTIVES",
  roadmapClickCollapse: "CLICK TO COLLAPSE",
  roadmapClickExpand: "CLICK TO EXPAND",
  toolsLabel: "TOOLS",
  title: "ASSET MANAGER",
  subtitle: "Private manager with preview, replacement, and per-file access controls.",
  ownerAccessLabel: "OWNER ACCESS",
  unlockTitle: "Unlock Asset Manager",
  unlockDescription: "This page is locked. Enter your ASSET_MANAGER_KEY to manage files.",
  unlockPlaceholder: "Enter manager key",
  unlockButton: "UNLOCK",
  backButton: "BACK TO LOBBY",
  lockButton: "LOCK",
  searchPlaceholder: "Search assets by filename...",
  readOnlyText: "Read-only deployment mode active.",
  writableText: "Write access enabled.",
  refreshButton: "REFRESH",
  sectionAsset: "ASSET",
  sectionPreview: "PREVIEW",
  sectionType: "TYPE",
  sectionSize: "SIZE",
  sectionAccess: "ACCESS",
  sectionUpdated: "UPDATED",
  sectionAction: "ACTION",
  editorTitle: "Page Copy Editor",
  editorDescription: "Edit almost all text shown on this page. Only users with your manager key can edit this.",
  editorSave: "SAVE COPY",
  editorReset: "RESET DEFAULTS",
  footerNote: "Only authorized users should have your manager key."
};
var COPY_KEYS = Object.keys(DEFAULT_ASSET_PAGE_COPY);
function getCopyFilePath(assetDirectory) {
  return path3.resolve(assetDirectory, COPY_FILE_NAME);
}
function normalizeCopy(raw) {
  const next = { ...DEFAULT_ASSET_PAGE_COPY };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return next;
  }
  for (const key of COPY_KEYS) {
    const value = raw[key];
    if (typeof value === "string") {
      next[key] = value;
    }
  }
  return next;
}
function validateCopy(copy) {
  for (const key of COPY_KEYS) {
    const value = copy[key];
    if (typeof value !== "string") {
      throw new AssetManagerError(`Invalid copy field: ${String(key)}`);
    }
    if (value.length > 400) {
      throw new AssetManagerError(`Copy field is too long: ${String(key)}`);
    }
  }
}
async function readAssetPageCopy(assetDirectory) {
  const filePath = getCopyFilePath(assetDirectory);
  try {
    const raw = await fs3.readFile(filePath, "utf8");
    return normalizeCopy(JSON.parse(raw));
  } catch (error) {
    const code = error.code;
    if (code === "ENOENT") {
      return { ...DEFAULT_ASSET_PAGE_COPY };
    }
    throw error;
  }
}
async function writeAssetPageCopy(assetDirectory, rawCopy) {
  const normalized = normalizeCopy(rawCopy);
  validateCopy(normalized);
  const filePath = getCopyFilePath(assetDirectory);
  await fs3.mkdir(assetDirectory, { recursive: true });
  await fs3.writeFile(filePath, `${JSON.stringify(normalized, null, 2)}
`, "utf8");
  return normalized;
}

// server/githubSync.ts
import path4 from "node:path";
var GITHUB_API_BASE = "https://api.github.com";
var MAX_GITHUB_UPLOAD_BYTES = 90 * 1024 * 1024;
function encodeRepoPath(repoPath) {
  return repoPath.split("/").filter(Boolean).map((segment) => encodeURIComponent(segment)).join("/");
}
function readGitHubConfig() {
  const token = process.env.GITHUB_SYNC_TOKEN?.trim() ?? process.env.GITHUB_TOKEN?.trim() ?? "";
  const owner = process.env.GITHUB_SYNC_OWNER?.trim() ?? "";
  const repo = process.env.GITHUB_SYNC_REPO?.trim() ?? "";
  const branch = process.env.GITHUB_SYNC_BRANCH?.trim() || "main";
  const assetDir = process.env.GITHUB_SYNC_ASSET_DIR?.trim() || "client/public/images";
  if (!token) {
    throw new AssetManagerError("GITHUB_SYNC_TOKEN is not configured on server.", 503);
  }
  if (!owner || !repo) {
    throw new AssetManagerError("GITHUB_SYNC_OWNER and GITHUB_SYNC_REPO must be configured.", 503);
  }
  return { token, owner, repo, branch, assetDir };
}
function validateFilename2(filename) {
  if (!filename || typeof filename !== "string") {
    throw new AssetManagerError("Missing filename.");
  }
  const clean = path4.basename(filename.trim());
  if (!clean || clean !== filename.trim() || clean.startsWith(".")) {
    throw new AssetManagerError("Invalid filename.");
  }
  return clean;
}
function buildCommitMessage(filename, note) {
  const base = `Asset manager clip update: ${filename}`;
  const cleanNote = typeof note === "string" ? note.trim() : "";
  if (!cleanNote) {
    return base;
  }
  return `${base} (${cleanNote.slice(0, 120)})`;
}
async function githubRequest(url, token, init = {}) {
  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers ?? {}
    }
  });
}
async function parseErrorBody(response) {
  try {
    const payload = await response.json();
    if (payload?.message) {
      return payload.message;
    }
  } catch {
  }
  return response.statusText || "GitHub request failed.";
}
async function submitClipToGitHub(filename, contentBase64, note) {
  const config = readGitHubConfig();
  const safeFilename = validateFilename2(filename);
  const content = decodeBase64Payload(contentBase64, MAX_GITHUB_UPLOAD_BYTES).toString("base64");
  const targetPath = path4.posix.join(config.assetDir.split(path4.sep).join("/"), safeFilename);
  const encodedPath = encodeRepoPath(targetPath);
  const contentUrl = `${GITHUB_API_BASE}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodedPath}`;
  let sha;
  const getResponse = await githubRequest(`${contentUrl}?ref=${encodeURIComponent(config.branch)}`, config.token);
  if (getResponse.status === 200) {
    const body = await getResponse.json();
    sha = typeof body.sha === "string" ? body.sha : void 0;
  } else if (getResponse.status !== 404) {
    const detail = await parseErrorBody(getResponse);
    throw new AssetManagerError(`GitHub lookup failed: ${detail}`, 502);
  }
  const putBody = {
    message: buildCommitMessage(safeFilename, note),
    content,
    branch: config.branch,
    ...sha ? { sha } : {}
  };
  const putResponse = await githubRequest(contentUrl, config.token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(putBody)
  });
  if (!putResponse.ok) {
    const detail = await parseErrorBody(putResponse);
    throw new AssetManagerError(`GitHub update failed: ${detail}`, 502);
  }
  const putPayload = await putResponse.json();
  const commitSha = putPayload.commit?.sha;
  const commitUrl = putPayload.commit?.html_url;
  if (!commitSha || !commitUrl) {
    throw new AssetManagerError("GitHub update failed: missing commit details.", 502);
  }
  return {
    branch: config.branch,
    commitSha,
    commitUrl,
    path: putPayload.content?.path ?? targetPath
  };
}

// vite.config.ts
var __vite_injected_original_dirname = "/Users/dustin/Documents/New project/whale-ops-2";
var JSON_BODY_LIMIT_BYTES = 260 * 1024 * 1024;
function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}
async function readJsonBody(req) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += bufferChunk.byteLength;
    if (totalBytes > JSON_BODY_LIMIT_BYTES) {
      throw new AssetManagerError("Request payload is too large.", 413);
    }
    chunks.push(bufferChunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AssetManagerError("Invalid JSON payload.");
  }
}
function assetApiPlugin() {
  const rootDir = __vite_injected_original_dirname;
  const assetDirectory = path5.resolve(rootDir, "client", "public", "images");
  const managerKey = process.env.ASSET_MANAGER_KEY?.trim() ?? "";
  return {
    name: "asset-api-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestPath = req.url?.split("?")[0] ?? "";
        if (req.method === "GET" && requestPath === "/api/site-copy-public") {
          try {
            const copy = await readAssetPageCopy(assetDirectory);
            writeJson(res, 200, { copy });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to load site copy.";
            writeJson(res, 500, { error: message });
          }
          return;
        }
        const isAssetEndpoint = requestPath === "/api/assets" || requestPath === "/api/assets/replace" || requestPath === "/api/assets/access" || requestPath === "/api/assets/copy" || requestPath === "/api/assets/submit-clip";
        if (isAssetEndpoint) {
          if (!managerKey) {
            writeJson(res, 503, { error: "ASSET_MANAGER_KEY is not configured on server." });
            return;
          }
          const requestKey = req.headers["x-asset-manager-key"];
          const normalizedKey = Array.isArray(requestKey) ? requestKey[0] : requestKey;
          if (normalizedKey !== managerKey) {
            writeJson(res, 401, { error: "Invalid manager key." });
            return;
          }
        }
        if (req.method === "GET" && requestPath === "/api/assets") {
          try {
            const assets = await listAssetsFromDirectory(assetDirectory);
            const accessMap = await readAssetAccessMap(assetDirectory);
            const assetsWithAccess = assets.map((asset) => ({
              ...asset,
              access: getAssetAccessLevel(accessMap, asset.filename)
            }));
            writeJson(res, 200, { assets: assetsWithAccess, readOnly: false });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to list assets.";
            writeJson(res, 500, { error: message });
          }
          return;
        }
        if (req.method === "POST" && requestPath === "/api/assets/replace") {
          try {
            const body = await readJsonBody(req);
            const filename = typeof body.filename === "string" ? body.filename : "";
            const contentBase64 = typeof body.contentBase64 === "string" ? body.contentBase64 : "";
            const fileContent = decodeBase64Payload(contentBase64);
            const asset = await replaceAssetInDirectory(assetDirectory, filename, fileContent);
            writeJson(res, 200, { asset });
          } catch (error) {
            if (error instanceof AssetManagerError) {
              writeJson(res, error.statusCode, { error: error.message });
              return;
            }
            const message = error instanceof Error ? error.message : "Unable to replace asset.";
            writeJson(res, 500, { error: message });
          }
          return;
        }
        if (req.method === "POST" && requestPath === "/api/assets/submit-clip") {
          try {
            const body = await readJsonBody(req);
            const filename = typeof body.filename === "string" ? body.filename : "";
            const contentBase64 = typeof body.contentBase64 === "string" ? body.contentBase64 : "";
            const note = typeof body.note === "string" ? body.note : void 0;
            const result = await submitClipToGitHub(filename, contentBase64, note);
            writeJson(res, 200, result);
          } catch (error) {
            if (error instanceof AssetManagerError) {
              writeJson(res, error.statusCode, { error: error.message });
              return;
            }
            const message = error instanceof Error ? error.message : "Unable to submit clip to GitHub.";
            writeJson(res, 500, { error: message });
          }
          return;
        }
        if (req.method === "POST" && requestPath === "/api/assets/access") {
          try {
            const body = await readJsonBody(req);
            const filename = typeof body.filename === "string" ? body.filename : "";
            const access = body.access === "public" || body.access === "private" ? body.access : null;
            if (!access) {
              throw new AssetManagerError("Missing access value.");
            }
            const updatedAccess = await setAssetAccessLevel(assetDirectory, filename, access);
            writeJson(res, 200, { filename, access: updatedAccess });
          } catch (error) {
            if (error instanceof AssetManagerError) {
              writeJson(res, error.statusCode, { error: error.message });
              return;
            }
            const message = error instanceof Error ? error.message : "Unable to update access.";
            writeJson(res, 500, { error: message });
          }
          return;
        }
        if (req.method === "GET" && requestPath === "/api/assets/copy") {
          try {
            const copy = await readAssetPageCopy(assetDirectory);
            writeJson(res, 200, { copy, readOnly: false });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to load page copy.";
            writeJson(res, 500, { error: message });
          }
          return;
        }
        if (req.method === "POST" && requestPath === "/api/assets/copy") {
          try {
            const body = await readJsonBody(req);
            const copy = await writeAssetPageCopy(assetDirectory, body.copy);
            writeJson(res, 200, { copy, readOnly: false });
          } catch (error) {
            if (error instanceof AssetManagerError) {
              writeJson(res, error.statusCode, { error: error.message });
              return;
            }
            const message = error instanceof Error ? error.message : "Unable to update page copy.";
            writeJson(res, 500, { error: message });
          }
          return;
        }
        next();
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), assetApiPlugin()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path5.resolve(__vite_injected_original_dirname, "client", "src"),
      "@shared": path5.resolve(__vite_injected_original_dirname, "shared"),
      "@assets": path5.resolve(__vite_injected_original_dirname, "attached_assets")
    }
  },
  envDir: path5.resolve(__vite_injected_original_dirname),
  root: path5.resolve(__vite_injected_original_dirname, "client"),
  build: {
    outDir: path5.resolve(__vite_injected_original_dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    port: 3e3,
    strictPort: false,
    // Will find next available port if 3000 is busy
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic2VydmVyL2Fzc2V0TWFuYWdlci50cyIsICJzZXJ2ZXIvYXNzZXRBY2Nlc3MudHMiLCAic2VydmVyL2Fzc2V0UGFnZUNvcHkudHMiLCAic2VydmVyL2dpdGh1YlN5bmMudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZHVzdGluL0RvY3VtZW50cy9OZXcgcHJvamVjdC93aGFsZS1vcHMtMlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2R1c3Rpbi9Eb2N1bWVudHMvTmV3IHByb2plY3Qvd2hhbGUtb3BzLTIvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2R1c3Rpbi9Eb2N1bWVudHMvTmV3JTIwcHJvamVjdC93aGFsZS1vcHMtMi92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGpzeExvY1BsdWdpbiB9IGZyb20gXCJAYnVpbGRlci5pby92aXRlLXBsdWdpbi1qc3gtbG9jXCI7XG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSBcIkB0YWlsd2luZGNzcy92aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XG5pbXBvcnQgdHlwZSB7IEluY29taW5nTWVzc2FnZSwgU2VydmVyUmVzcG9uc2UgfSBmcm9tIFwibm9kZTpodHRwXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCB7IHZpdGVQbHVnaW5NYW51c1J1bnRpbWUgfSBmcm9tIFwidml0ZS1wbHVnaW4tbWFudXMtcnVudGltZVwiO1xuaW1wb3J0IHtcbiAgQXNzZXRNYW5hZ2VyRXJyb3IsXG4gIGRlY29kZUJhc2U2NFBheWxvYWQsXG4gIGxpc3RBc3NldHNGcm9tRGlyZWN0b3J5LFxuICByZXBsYWNlQXNzZXRJbkRpcmVjdG9yeSxcbn0gZnJvbSBcIi4vc2VydmVyL2Fzc2V0TWFuYWdlclwiO1xuaW1wb3J0IHsgZ2V0QXNzZXRBY2Nlc3NMZXZlbCwgcmVhZEFzc2V0QWNjZXNzTWFwLCBzZXRBc3NldEFjY2Vzc0xldmVsIH0gZnJvbSBcIi4vc2VydmVyL2Fzc2V0QWNjZXNzXCI7XG5pbXBvcnQgeyByZWFkQXNzZXRQYWdlQ29weSwgd3JpdGVBc3NldFBhZ2VDb3B5IH0gZnJvbSBcIi4vc2VydmVyL2Fzc2V0UGFnZUNvcHlcIjtcbmltcG9ydCB7IHN1Ym1pdENsaXBUb0dpdEh1YiB9IGZyb20gXCIuL3NlcnZlci9naXRodWJTeW5jXCI7XG5cbmNvbnN0IEpTT05fQk9EWV9MSU1JVF9CWVRFUyA9IDI2MCAqIDEwMjQgKiAxMDI0O1xuXG5mdW5jdGlvbiB3cml0ZUpzb24ocmVzOiBTZXJ2ZXJSZXNwb25zZSwgc3RhdHVzQ29kZTogbnVtYmVyLCBwYXlsb2FkOiB1bmtub3duKSB7XG4gIHJlcy5zdGF0dXNDb2RlID0gc3RhdHVzQ29kZTtcbiAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XG4gIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkocGF5bG9hZCkpO1xufVxuXG5hc3luYyBmdW5jdGlvbiByZWFkSnNvbkJvZHkocmVxOiBJbmNvbWluZ01lc3NhZ2UpOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PiB7XG4gIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXTtcbiAgbGV0IHRvdGFsQnl0ZXMgPSAwO1xuXG4gIGZvciBhd2FpdCAoY29uc3QgY2h1bmsgb2YgcmVxKSB7XG4gICAgY29uc3QgYnVmZmVyQ2h1bmsgPSBCdWZmZXIuaXNCdWZmZXIoY2h1bmspID8gY2h1bmsgOiBCdWZmZXIuZnJvbShjaHVuayk7XG4gICAgdG90YWxCeXRlcyArPSBidWZmZXJDaHVuay5ieXRlTGVuZ3RoO1xuICAgIGlmICh0b3RhbEJ5dGVzID4gSlNPTl9CT0RZX0xJTUlUX0JZVEVTKSB7XG4gICAgICB0aHJvdyBuZXcgQXNzZXRNYW5hZ2VyRXJyb3IoXCJSZXF1ZXN0IHBheWxvYWQgaXMgdG9vIGxhcmdlLlwiLCA0MTMpO1xuICAgIH1cbiAgICBjaHVua3MucHVzaChidWZmZXJDaHVuayk7XG4gIH1cblxuICBpZiAoY2h1bmtzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKFwidXRmOFwiKSkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIH0gY2F0Y2gge1xuICAgIHRocm93IG5ldyBBc3NldE1hbmFnZXJFcnJvcihcIkludmFsaWQgSlNPTiBwYXlsb2FkLlwiKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhc3NldEFwaVBsdWdpbigpIHtcbiAgY29uc3Qgcm9vdERpciA9IGltcG9ydC5tZXRhLmRpcm5hbWU7XG4gIGNvbnN0IGFzc2V0RGlyZWN0b3J5ID0gcGF0aC5yZXNvbHZlKHJvb3REaXIsIFwiY2xpZW50XCIsIFwicHVibGljXCIsIFwiaW1hZ2VzXCIpO1xuICBjb25zdCBtYW5hZ2VyS2V5ID0gcHJvY2Vzcy5lbnYuQVNTRVRfTUFOQUdFUl9LRVk/LnRyaW0oKSA/PyBcIlwiO1xuXG4gIHJldHVybiB7XG4gICAgbmFtZTogXCJhc3NldC1hcGktZGV2XCIsXG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcjogeyBtaWRkbGV3YXJlczogeyB1c2U6IChoYW5kbGVyOiAocmVxOiBJbmNvbWluZ01lc3NhZ2UsIHJlczogU2VydmVyUmVzcG9uc2UsIG5leHQ6ICgpID0+IHZvaWQpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+KSA9PiB2b2lkIH0gfSkge1xuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgY29uc3QgcmVxdWVzdFBhdGggPSByZXEudXJsPy5zcGxpdChcIj9cIilbMF0gPz8gXCJcIjtcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIgJiYgcmVxdWVzdFBhdGggPT09IFwiL2FwaS9zaXRlLWNvcHktcHVibGljXCIpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY29weSA9IGF3YWl0IHJlYWRBc3NldFBhZ2VDb3B5KGFzc2V0RGlyZWN0b3J5KTtcbiAgICAgICAgICAgIHdyaXRlSnNvbihyZXMsIDIwMCwgeyBjb3B5IH0pO1xuICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlVuYWJsZSB0byBsb2FkIHNpdGUgY29weS5cIjtcbiAgICAgICAgICAgIHdyaXRlSnNvbihyZXMsIDUwMCwgeyBlcnJvcjogbWVzc2FnZSB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaXNBc3NldEVuZHBvaW50ID1cbiAgICAgICAgICByZXF1ZXN0UGF0aCA9PT0gXCIvYXBpL2Fzc2V0c1wiIHx8XG4gICAgICAgICAgcmVxdWVzdFBhdGggPT09IFwiL2FwaS9hc3NldHMvcmVwbGFjZVwiIHx8XG4gICAgICAgICAgcmVxdWVzdFBhdGggPT09IFwiL2FwaS9hc3NldHMvYWNjZXNzXCIgfHxcbiAgICAgICAgICByZXF1ZXN0UGF0aCA9PT0gXCIvYXBpL2Fzc2V0cy9jb3B5XCIgfHxcbiAgICAgICAgICByZXF1ZXN0UGF0aCA9PT0gXCIvYXBpL2Fzc2V0cy9zdWJtaXQtY2xpcFwiO1xuXG4gICAgICAgIGlmIChpc0Fzc2V0RW5kcG9pbnQpIHtcbiAgICAgICAgICBpZiAoIW1hbmFnZXJLZXkpIHtcbiAgICAgICAgICAgIHdyaXRlSnNvbihyZXMsIDUwMywgeyBlcnJvcjogXCJBU1NFVF9NQU5BR0VSX0tFWSBpcyBub3QgY29uZmlndXJlZCBvbiBzZXJ2ZXIuXCIgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgcmVxdWVzdEtleSA9IHJlcS5oZWFkZXJzW1wieC1hc3NldC1tYW5hZ2VyLWtleVwiXTtcbiAgICAgICAgICBjb25zdCBub3JtYWxpemVkS2V5ID0gQXJyYXkuaXNBcnJheShyZXF1ZXN0S2V5KSA/IHJlcXVlc3RLZXlbMF0gOiByZXF1ZXN0S2V5O1xuICAgICAgICAgIGlmIChub3JtYWxpemVkS2V5ICE9PSBtYW5hZ2VyS2V5KSB7XG4gICAgICAgICAgICB3cml0ZUpzb24ocmVzLCA0MDEsIHsgZXJyb3I6IFwiSW52YWxpZCBtYW5hZ2VyIGtleS5cIiB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJHRVRcIiAmJiByZXF1ZXN0UGF0aCA9PT0gXCIvYXBpL2Fzc2V0c1wiKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0cyA9IGF3YWl0IGxpc3RBc3NldHNGcm9tRGlyZWN0b3J5KGFzc2V0RGlyZWN0b3J5KTtcbiAgICAgICAgICAgIGNvbnN0IGFjY2Vzc01hcCA9IGF3YWl0IHJlYWRBc3NldEFjY2Vzc01hcChhc3NldERpcmVjdG9yeSk7XG4gICAgICAgICAgICBjb25zdCBhc3NldHNXaXRoQWNjZXNzID0gYXNzZXRzLm1hcCgoYXNzZXQpID0+ICh7XG4gICAgICAgICAgICAgIC4uLmFzc2V0LFxuICAgICAgICAgICAgICBhY2Nlc3M6IGdldEFzc2V0QWNjZXNzTGV2ZWwoYWNjZXNzTWFwLCBhc3NldC5maWxlbmFtZSksXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB3cml0ZUpzb24ocmVzLCAyMDAsIHsgYXNzZXRzOiBhc3NldHNXaXRoQWNjZXNzLCByZWFkT25seTogZmFsc2UgfSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiVW5hYmxlIHRvIGxpc3QgYXNzZXRzLlwiO1xuICAgICAgICAgICAgd3JpdGVKc29uKHJlcywgNTAwLCB7IGVycm9yOiBtZXNzYWdlIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIgJiYgcmVxdWVzdFBhdGggPT09IFwiL2FwaS9hc3NldHMvcmVwbGFjZVwiKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZWFkSnNvbkJvZHkocmVxKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lID0gdHlwZW9mIGJvZHkuZmlsZW5hbWUgPT09IFwic3RyaW5nXCIgPyBib2R5LmZpbGVuYW1lIDogXCJcIjtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRCYXNlNjQgPSB0eXBlb2YgYm9keS5jb250ZW50QmFzZTY0ID09PSBcInN0cmluZ1wiID8gYm9keS5jb250ZW50QmFzZTY0IDogXCJcIjtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVDb250ZW50ID0gZGVjb2RlQmFzZTY0UGF5bG9hZChjb250ZW50QmFzZTY0KTtcblxuICAgICAgICAgICAgY29uc3QgYXNzZXQgPSBhd2FpdCByZXBsYWNlQXNzZXRJbkRpcmVjdG9yeShhc3NldERpcmVjdG9yeSwgZmlsZW5hbWUsIGZpbGVDb250ZW50KTtcbiAgICAgICAgICAgIHdyaXRlSnNvbihyZXMsIDIwMCwgeyBhc3NldCB9KTtcbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgQXNzZXRNYW5hZ2VyRXJyb3IpIHtcbiAgICAgICAgICAgICAgd3JpdGVKc29uKHJlcywgZXJyb3Iuc3RhdHVzQ29kZSwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlVuYWJsZSB0byByZXBsYWNlIGFzc2V0LlwiO1xuICAgICAgICAgICAgd3JpdGVKc29uKHJlcywgNTAwLCB7IGVycm9yOiBtZXNzYWdlIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIgJiYgcmVxdWVzdFBhdGggPT09IFwiL2FwaS9hc3NldHMvc3VibWl0LWNsaXBcIikge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVhZEpzb25Cb2R5KHJlcSk7XG4gICAgICAgICAgICBjb25zdCBmaWxlbmFtZSA9IHR5cGVvZiBib2R5LmZpbGVuYW1lID09PSBcInN0cmluZ1wiID8gYm9keS5maWxlbmFtZSA6IFwiXCI7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50QmFzZTY0ID0gdHlwZW9mIGJvZHkuY29udGVudEJhc2U2NCA9PT0gXCJzdHJpbmdcIiA/IGJvZHkuY29udGVudEJhc2U2NCA6IFwiXCI7XG4gICAgICAgICAgICBjb25zdCBub3RlID0gdHlwZW9mIGJvZHkubm90ZSA9PT0gXCJzdHJpbmdcIiA/IGJvZHkubm90ZSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHN1Ym1pdENsaXBUb0dpdEh1YihmaWxlbmFtZSwgY29udGVudEJhc2U2NCwgbm90ZSk7XG4gICAgICAgICAgICB3cml0ZUpzb24ocmVzLCAyMDAsIHJlc3VsdCk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEFzc2V0TWFuYWdlckVycm9yKSB7XG4gICAgICAgICAgICAgIHdyaXRlSnNvbihyZXMsIGVycm9yLnN0YXR1c0NvZGUsIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJVbmFibGUgdG8gc3VibWl0IGNsaXAgdG8gR2l0SHViLlwiO1xuICAgICAgICAgICAgd3JpdGVKc29uKHJlcywgNTAwLCB7IGVycm9yOiBtZXNzYWdlIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIgJiYgcmVxdWVzdFBhdGggPT09IFwiL2FwaS9hc3NldHMvYWNjZXNzXCIpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYm9keSA9IGF3YWl0IHJlYWRKc29uQm9keShyZXEpO1xuICAgICAgICAgICAgY29uc3QgZmlsZW5hbWUgPSB0eXBlb2YgYm9keS5maWxlbmFtZSA9PT0gXCJzdHJpbmdcIiA/IGJvZHkuZmlsZW5hbWUgOiBcIlwiO1xuICAgICAgICAgICAgY29uc3QgYWNjZXNzID0gYm9keS5hY2Nlc3MgPT09IFwicHVibGljXCIgfHwgYm9keS5hY2Nlc3MgPT09IFwicHJpdmF0ZVwiID8gYm9keS5hY2Nlc3MgOiBudWxsO1xuXG4gICAgICAgICAgICBpZiAoIWFjY2Vzcykge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgQXNzZXRNYW5hZ2VyRXJyb3IoXCJNaXNzaW5nIGFjY2VzcyB2YWx1ZS5cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRBY2Nlc3MgPSBhd2FpdCBzZXRBc3NldEFjY2Vzc0xldmVsKGFzc2V0RGlyZWN0b3J5LCBmaWxlbmFtZSwgYWNjZXNzKTtcbiAgICAgICAgICAgIHdyaXRlSnNvbihyZXMsIDIwMCwgeyBmaWxlbmFtZSwgYWNjZXNzOiB1cGRhdGVkQWNjZXNzIH0pO1xuICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBc3NldE1hbmFnZXJFcnJvcikge1xuICAgICAgICAgICAgICB3cml0ZUpzb24ocmVzLCBlcnJvci5zdGF0dXNDb2RlLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiVW5hYmxlIHRvIHVwZGF0ZSBhY2Nlc3MuXCI7XG4gICAgICAgICAgICB3cml0ZUpzb24ocmVzLCA1MDAsIHsgZXJyb3I6IG1lc3NhZ2UgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIkdFVFwiICYmIHJlcXVlc3RQYXRoID09PSBcIi9hcGkvYXNzZXRzL2NvcHlcIikge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBjb3B5ID0gYXdhaXQgcmVhZEFzc2V0UGFnZUNvcHkoYXNzZXREaXJlY3RvcnkpO1xuICAgICAgICAgICAgd3JpdGVKc29uKHJlcywgMjAwLCB7IGNvcHksIHJlYWRPbmx5OiBmYWxzZSB9KTtcbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJVbmFibGUgdG8gbG9hZCBwYWdlIGNvcHkuXCI7XG4gICAgICAgICAgICB3cml0ZUpzb24ocmVzLCA1MDAsIHsgZXJyb3I6IG1lc3NhZ2UgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIiAmJiByZXF1ZXN0UGF0aCA9PT0gXCIvYXBpL2Fzc2V0cy9jb3B5XCIpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYm9keSA9IGF3YWl0IHJlYWRKc29uQm9keShyZXEpO1xuICAgICAgICAgICAgY29uc3QgY29weSA9IGF3YWl0IHdyaXRlQXNzZXRQYWdlQ29weShhc3NldERpcmVjdG9yeSwgYm9keS5jb3B5KTtcbiAgICAgICAgICAgIHdyaXRlSnNvbihyZXMsIDIwMCwgeyBjb3B5LCByZWFkT25seTogZmFsc2UgfSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEFzc2V0TWFuYWdlckVycm9yKSB7XG4gICAgICAgICAgICAgIHdyaXRlSnNvbihyZXMsIGVycm9yLnN0YXR1c0NvZGUsIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJVbmFibGUgdG8gdXBkYXRlIHBhZ2UgY29weS5cIjtcbiAgICAgICAgICAgIHdyaXRlSnNvbihyZXMsIDUwMCwgeyBlcnJvcjogbWVzc2FnZSB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgfTtcbn1cblxuY29uc3QgcGx1Z2lucyA9IFtyZWFjdCgpLCB0YWlsd2luZGNzcygpLCBqc3hMb2NQbHVnaW4oKSwgdml0ZVBsdWdpbk1hbnVzUnVudGltZSgpLCBhc3NldEFwaVBsdWdpbigpXTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2lucyxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKGltcG9ydC5tZXRhLmRpcm5hbWUsIFwiY2xpZW50XCIsIFwic3JjXCIpLFxuICAgICAgXCJAc2hhcmVkXCI6IHBhdGgucmVzb2x2ZShpbXBvcnQubWV0YS5kaXJuYW1lLCBcInNoYXJlZFwiKSxcbiAgICAgIFwiQGFzc2V0c1wiOiBwYXRoLnJlc29sdmUoaW1wb3J0Lm1ldGEuZGlybmFtZSwgXCJhdHRhY2hlZF9hc3NldHNcIiksXG4gICAgfSxcbiAgfSxcbiAgZW52RGlyOiBwYXRoLnJlc29sdmUoaW1wb3J0Lm1ldGEuZGlybmFtZSksXG4gIHJvb3Q6IHBhdGgucmVzb2x2ZShpbXBvcnQubWV0YS5kaXJuYW1lLCBcImNsaWVudFwiKSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6IHBhdGgucmVzb2x2ZShpbXBvcnQubWV0YS5kaXJuYW1lLCBcImRpc3QvcHVibGljXCIpLFxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIHN0cmljdFBvcnQ6IGZhbHNlLCAvLyBXaWxsIGZpbmQgbmV4dCBhdmFpbGFibGUgcG9ydCBpZiAzMDAwIGlzIGJ1c3lcbiAgICBob3N0OiB0cnVlLFxuICAgIGFsbG93ZWRIb3N0czogW1xuICAgICAgXCIubWFudXNwcmUuY29tcHV0ZXJcIixcbiAgICAgIFwiLm1hbnVzLmNvbXB1dGVyXCIsXG4gICAgICBcIi5tYW51cy1hc2lhLmNvbXB1dGVyXCIsXG4gICAgICBcIi5tYW51c2NvbXB1dGVyLmFpXCIsXG4gICAgICBcIi5tYW51c3ZtLmNvbXB1dGVyXCIsXG4gICAgICBcImxvY2FsaG9zdFwiLFxuICAgICAgXCIxMjcuMC4wLjFcIixcbiAgICBdLFxuICAgIGZzOiB7XG4gICAgICBzdHJpY3Q6IHRydWUsXG4gICAgICBkZW55OiBbXCIqKi8uKlwiXSxcbiAgICB9LFxuICB9LFxufSk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9kdXN0aW4vRG9jdW1lbnRzL05ldyBwcm9qZWN0L3doYWxlLW9wcy0yL3NlcnZlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2R1c3Rpbi9Eb2N1bWVudHMvTmV3IHByb2plY3Qvd2hhbGUtb3BzLTIvc2VydmVyL2Fzc2V0TWFuYWdlci50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZHVzdGluL0RvY3VtZW50cy9OZXclMjBwcm9qZWN0L3doYWxlLW9wcy0yL3NlcnZlci9hc3NldE1hbmFnZXIudHNcIjtpbXBvcnQgZnMgZnJvbSBcIm5vZGU6ZnMvcHJvbWlzZXNcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IGdldEFjY2Vzc01ldGFkYXRhRmlsZU5hbWUgfSBmcm9tIFwiLi9hc3NldEFjY2Vzcy5qc1wiO1xuXG5jb25zdCBJTUFHRV9FWFRFTlNJT05TID0gbmV3IFNldChbXCIucG5nXCIsIFwiLmpwZ1wiLCBcIi5qcGVnXCIsIFwiLmdpZlwiLCBcIi53ZWJwXCIsIFwiLnN2Z1wiLCBcIi5hdmlmXCIsIFwiLmJtcFwiLCBcIi5pY29cIl0pO1xuY29uc3QgVklERU9fRVhURU5TSU9OUyA9IG5ldyBTZXQoW1wiLm1wNFwiLCBcIi5tb3ZcIiwgXCIud2VibVwiLCBcIi5tNHZcIiwgXCIuYXZpXCIsIFwiLm1rdlwiXSk7XG5jb25zdCBBVURJT19FWFRFTlNJT05TID0gbmV3IFNldChbXCIubXAzXCIsIFwiLndhdlwiLCBcIi5vZ2dcIiwgXCIubTRhXCIsIFwiLmFhY1wiLCBcIi5mbGFjXCJdKTtcblxuY29uc3QgREVGQVVMVF9BU1NFVF9SRUxBVElWRV9ESVIgPSBwYXRoLmpvaW4oXCJjbGllbnRcIiwgXCJwdWJsaWNcIiwgXCJpbWFnZXNcIik7XG5jb25zdCBFWENMVURFRF9GSUxFTkFNRVMgPSBuZXcgU2V0KFtcImFzc2V0cy1tYW5pZmVzdC5qc29uXCIsIGdldEFjY2Vzc01ldGFkYXRhRmlsZU5hbWUoKV0pO1xuXG5leHBvcnQgY29uc3QgTUFYX1VQTE9BRF9CWVRFUyA9IDIwMCAqIDEwMjQgKiAxMDI0O1xuXG5leHBvcnQgdHlwZSBBc3NldEtpbmQgPSBcImltYWdlXCIgfCBcInZpZGVvXCIgfCBcImF1ZGlvXCIgfCBcIm90aGVyXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXNzZXRJbmZvIHtcbiAgZmlsZW5hbWU6IHN0cmluZztcbiAgdXJsOiBzdHJpbmc7XG4gIHR5cGU6IEFzc2V0S2luZDtcbiAgc2l6ZUJ5dGVzOiBudW1iZXI7XG4gIHVwZGF0ZWRBdDogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgQXNzZXRNYW5hZ2VyRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIHJlYWRvbmx5IHN0YXR1c0NvZGU6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIHN0YXR1c0NvZGUgPSA0MDApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSBcIkFzc2V0TWFuYWdlckVycm9yXCI7XG4gICAgdGhpcy5zdGF0dXNDb2RlID0gc3RhdHVzQ29kZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRBc3NldEtpbmQoZmlsZW5hbWU6IHN0cmluZyk6IEFzc2V0S2luZCB7XG4gIGNvbnN0IGV4dCA9IHBhdGguZXh0bmFtZShmaWxlbmFtZSkudG9Mb3dlckNhc2UoKTtcbiAgaWYgKElNQUdFX0VYVEVOU0lPTlMuaGFzKGV4dCkpIHtcbiAgICByZXR1cm4gXCJpbWFnZVwiO1xuICB9XG4gIGlmIChWSURFT19FWFRFTlNJT05TLmhhcyhleHQpKSB7XG4gICAgcmV0dXJuIFwidmlkZW9cIjtcbiAgfVxuICBpZiAoQVVESU9fRVhURU5TSU9OUy5oYXMoZXh0KSkge1xuICAgIHJldHVybiBcImF1ZGlvXCI7XG4gIH1cbiAgcmV0dXJuIFwib3RoZXJcIjtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVGaWxlbmFtZShmaWxlbmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCFmaWxlbmFtZSB8fCB0eXBlb2YgZmlsZW5hbWUgIT09IFwic3RyaW5nXCIpIHtcbiAgICB0aHJvdyBuZXcgQXNzZXRNYW5hZ2VyRXJyb3IoXCJNaXNzaW5nIGZpbGVuYW1lLlwiKTtcbiAgfVxuXG4gIGNvbnN0IGNsZWFuID0gcGF0aC5iYXNlbmFtZShmaWxlbmFtZS50cmltKCkpO1xuICBpZiAoIWNsZWFuIHx8IGNsZWFuID09PSBcIi5cIiB8fCBjbGVhbiA9PT0gXCIuLlwiIHx8IGNsZWFuICE9PSBmaWxlbmFtZS50cmltKCkpIHtcbiAgICB0aHJvdyBuZXcgQXNzZXRNYW5hZ2VyRXJyb3IoXCJJbnZhbGlkIGZpbGVuYW1lLlwiKTtcbiAgfVxuXG4gIHJldHVybiBjbGVhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFzc2V0RGlyZWN0b3J5RnJvbVJvb3Qocm9vdERpcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGgucmVzb2x2ZShyb290RGlyLCBERUZBVUxUX0FTU0VUX1JFTEFUSVZFX0RJUik7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVBc3NldFBhdGgoYXNzZXREaXJlY3Rvcnk6IHN0cmluZywgZmlsZW5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHNhZmVOYW1lID0gdmFsaWRhdGVGaWxlbmFtZShmaWxlbmFtZSk7XG4gIGNvbnN0IGFzc2V0RGlyID0gcGF0aC5yZXNvbHZlKGFzc2V0RGlyZWN0b3J5KTtcbiAgY29uc3QgcmVzb2x2ZWQgPSBwYXRoLnJlc29sdmUoYXNzZXREaXIsIHNhZmVOYW1lKTtcblxuICBpZiAoIShyZXNvbHZlZCA9PT0gYXNzZXREaXIgfHwgcmVzb2x2ZWQuc3RhcnRzV2l0aChgJHthc3NldERpcn0ke3BhdGguc2VwfWApKSkge1xuICAgIHRocm93IG5ldyBBc3NldE1hbmFnZXJFcnJvcihcIkludmFsaWQgYXNzZXQgcGF0aC5cIik7XG4gIH1cblxuICByZXR1cm4gcmVzb2x2ZWQ7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHRvQXNzZXRJbmZvKHJvb3REaXI6IHN0cmluZywgZmlsZW5hbWU6IHN0cmluZyk6IFByb21pc2U8QXNzZXRJbmZvPiB7XG4gIGNvbnN0IGFic29sdXRlUGF0aCA9IHJlc29sdmVBc3NldFBhdGgocm9vdERpciwgZmlsZW5hbWUpO1xuICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLnN0YXQoYWJzb2x1dGVQYXRoKTtcblxuICByZXR1cm4ge1xuICAgIGZpbGVuYW1lLFxuICAgIHVybDogYC9pbWFnZXMvJHtmaWxlbmFtZX1gLFxuICAgIHR5cGU6IGdldEFzc2V0S2luZChmaWxlbmFtZSksXG4gICAgc2l6ZUJ5dGVzOiBzdGF0cy5zaXplLFxuICAgIHVwZGF0ZWRBdDogc3RhdHMubXRpbWUudG9JU09TdHJpbmcoKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlY29kZUJhc2U2NFBheWxvYWQoY29udGVudEJhc2U2NDogc3RyaW5nLCBtYXhCeXRlcyA9IE1BWF9VUExPQURfQllURVMpOiBCdWZmZXIge1xuICBpZiAoIWNvbnRlbnRCYXNlNjQgfHwgdHlwZW9mIGNvbnRlbnRCYXNlNjQgIT09IFwic3RyaW5nXCIpIHtcbiAgICB0aHJvdyBuZXcgQXNzZXRNYW5hZ2VyRXJyb3IoXCJNaXNzaW5nIGZpbGUgY29udGVudC5cIik7XG4gIH1cblxuICBjb25zdCBub3JtYWxpemVkID0gY29udGVudEJhc2U2NC5pbmNsdWRlcyhcIixcIilcbiAgICA/IGNvbnRlbnRCYXNlNjQuc2xpY2UoY29udGVudEJhc2U2NC5pbmRleE9mKFwiLFwiKSArIDEpXG4gICAgOiBjb250ZW50QmFzZTY0O1xuXG4gIGNvbnN0IGRhdGEgPSBCdWZmZXIuZnJvbShub3JtYWxpemVkLCBcImJhc2U2NFwiKTtcblxuICBpZiAoZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgQXNzZXRNYW5hZ2VyRXJyb3IoXCJVcGxvYWRlZCBmaWxlIGlzIGVtcHR5LlwiKTtcbiAgfVxuXG4gIGlmIChkYXRhLmxlbmd0aCA+IG1heEJ5dGVzKSB7XG4gICAgdGhyb3cgbmV3IEFzc2V0TWFuYWdlckVycm9yKFwiRmlsZSBpcyB0b28gbGFyZ2UuXCIsIDQxMyk7XG4gIH1cblxuICByZXR1cm4gZGF0YTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RBc3NldHMocm9vdERpcjogc3RyaW5nKTogUHJvbWlzZTxBc3NldEluZm9bXT4ge1xuICBjb25zdCBhc3NldERpciA9IGdldEFzc2V0RGlyZWN0b3J5RnJvbVJvb3Qocm9vdERpcik7XG4gIHJldHVybiBsaXN0QXNzZXRzRnJvbURpcmVjdG9yeShhc3NldERpcik7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0QXNzZXRzRnJvbURpcmVjdG9yeShhc3NldERpcmVjdG9yeTogc3RyaW5nKTogUHJvbWlzZTxBc3NldEluZm9bXT4ge1xuICBjb25zdCBhc3NldERpciA9IHBhdGgucmVzb2x2ZShhc3NldERpcmVjdG9yeSk7XG4gIGF3YWl0IGZzLm1rZGlyKGFzc2V0RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuICBjb25zdCBlbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihhc3NldERpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICBjb25zdCBmaWxlcyA9IGVudHJpZXNcbiAgICAuZmlsdGVyKChlbnRyeSkgPT4gZW50cnkuaXNGaWxlKCkgJiYgIWVudHJ5Lm5hbWUuc3RhcnRzV2l0aChcIi5cIikgJiYgIUVYQ0xVREVEX0ZJTEVOQU1FUy5oYXMoZW50cnkubmFtZSkpXG4gICAgLm1hcCgoZW50cnkpID0+IGVudHJ5Lm5hbWUpXG4gICAgLnNvcnQoKGEsIGIpID0+IGEubG9jYWxlQ29tcGFyZShiKSk7XG5cbiAgcmV0dXJuIFByb21pc2UuYWxsKGZpbGVzLm1hcCgobmFtZSkgPT4gdG9Bc3NldEluZm8oYXNzZXREaXIsIG5hbWUpKSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXBsYWNlQXNzZXQocm9vdERpcjogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nLCBmaWxlQ29udGVudDogQnVmZmVyKTogUHJvbWlzZTxBc3NldEluZm8+IHtcbiAgY29uc3QgYXNzZXREaXIgPSBnZXRBc3NldERpcmVjdG9yeUZyb21Sb290KHJvb3REaXIpO1xuICByZXR1cm4gcmVwbGFjZUFzc2V0SW5EaXJlY3RvcnkoYXNzZXREaXIsIGZpbGVuYW1lLCBmaWxlQ29udGVudCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXBsYWNlQXNzZXRJbkRpcmVjdG9yeShcbiAgYXNzZXREaXJlY3Rvcnk6IHN0cmluZyxcbiAgZmlsZW5hbWU6IHN0cmluZyxcbiAgZmlsZUNvbnRlbnQ6IEJ1ZmZlcixcbik6IFByb21pc2U8QXNzZXRJbmZvPiB7XG4gIGlmIChmaWxlQ29udGVudC5sZW5ndGggPiBNQVhfVVBMT0FEX0JZVEVTKSB7XG4gICAgdGhyb3cgbmV3IEFzc2V0TWFuYWdlckVycm9yKFwiRmlsZSBpcyB0b28gbGFyZ2UuXCIsIDQxMyk7XG4gIH1cblxuICBjb25zdCBhc3NldERpciA9IHBhdGgucmVzb2x2ZShhc3NldERpcmVjdG9yeSk7XG4gIGNvbnN0IGFic29sdXRlUGF0aCA9IHJlc29sdmVBc3NldFBhdGgoYXNzZXREaXIsIGZpbGVuYW1lKTtcbiAgYXdhaXQgZnMubWtkaXIoYXNzZXREaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gIGF3YWl0IGZzLndyaXRlRmlsZShhYnNvbHV0ZVBhdGgsIGZpbGVDb250ZW50KTtcblxuICByZXR1cm4gdG9Bc3NldEluZm8oYXNzZXREaXIsIHZhbGlkYXRlRmlsZW5hbWUoZmlsZW5hbWUpKTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2R1c3Rpbi9Eb2N1bWVudHMvTmV3IHByb2plY3Qvd2hhbGUtb3BzLTIvc2VydmVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvZHVzdGluL0RvY3VtZW50cy9OZXcgcHJvamVjdC93aGFsZS1vcHMtMi9zZXJ2ZXIvYXNzZXRBY2Nlc3MudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2R1c3Rpbi9Eb2N1bWVudHMvTmV3JTIwcHJvamVjdC93aGFsZS1vcHMtMi9zZXJ2ZXIvYXNzZXRBY2Nlc3MudHNcIjtpbXBvcnQgZnMgZnJvbSBcIm5vZGU6ZnMvcHJvbWlzZXNcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IEFzc2V0TWFuYWdlckVycm9yIH0gZnJvbSBcIi4vYXNzZXRNYW5hZ2VyLmpzXCI7XG5cbmV4cG9ydCB0eXBlIEFjY2Vzc0xldmVsID0gXCJwdWJsaWNcIiB8IFwicHJpdmF0ZVwiO1xuXG5jb25zdCBBQ0NFU1NfRklMRV9OQU1FID0gXCIuYXNzZXQtYWNjZXNzLmpzb25cIjtcblxuZnVuY3Rpb24gaXNSZWNvcmQodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgdmFsdWUgIT09IG51bGwgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBpc0FjY2Vzc0xldmVsKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgQWNjZXNzTGV2ZWwge1xuICByZXR1cm4gdmFsdWUgPT09IFwicHVibGljXCIgfHwgdmFsdWUgPT09IFwicHJpdmF0ZVwiO1xufVxuXG5mdW5jdGlvbiBnZXRBY2Nlc3NGaWxlUGF0aChhc3NldERpcmVjdG9yeTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGgucmVzb2x2ZShhc3NldERpcmVjdG9yeSwgQUNDRVNTX0ZJTEVfTkFNRSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkQXNzZXRBY2Nlc3NNYXAoYXNzZXREaXJlY3Rvcnk6IHN0cmluZyk6IFByb21pc2U8UmVjb3JkPHN0cmluZywgQWNjZXNzTGV2ZWw+PiB7XG4gIGNvbnN0IGZpbGVQYXRoID0gZ2V0QWNjZXNzRmlsZVBhdGgoYXNzZXREaXJlY3RvcnkpO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcmF3ID0gYXdhaXQgZnMucmVhZEZpbGUoZmlsZVBhdGgsIFwidXRmOFwiKTtcbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJhdykgYXMgdW5rbm93bjtcbiAgICBpZiAoIWlzUmVjb3JkKHBhcnNlZCkpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBvdXRwdXQ6IFJlY29yZDxzdHJpbmcsIEFjY2Vzc0xldmVsPiA9IHt9O1xuICAgIGZvciAoY29uc3QgW2ZpbGVuYW1lLCBsZXZlbF0gb2YgT2JqZWN0LmVudHJpZXMocGFyc2VkKSkge1xuICAgICAgaWYgKCFmaWxlbmFtZS5zdGFydHNXaXRoKFwiLlwiKSAmJiBpc0FjY2Vzc0xldmVsKGxldmVsKSkge1xuICAgICAgICBvdXRwdXRbZmlsZW5hbWVdID0gbGV2ZWw7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgaWYgKGNvZGUgPT09IFwiRU5PRU5UXCIpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gd3JpdGVBc3NldEFjY2Vzc01hcChhc3NldERpcmVjdG9yeTogc3RyaW5nLCBtYXA6IFJlY29yZDxzdHJpbmcsIEFjY2Vzc0xldmVsPik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBmaWxlUGF0aCA9IGdldEFjY2Vzc0ZpbGVQYXRoKGFzc2V0RGlyZWN0b3J5KTtcbiAgY29uc3Qgbm9ybWFsaXplZCA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgICBPYmplY3QuZW50cmllcyhtYXApXG4gICAgICAuZmlsdGVyKChbZmlsZW5hbWUsIGxldmVsXSkgPT4gIWZpbGVuYW1lLnN0YXJ0c1dpdGgoXCIuXCIpICYmIGlzQWNjZXNzTGV2ZWwobGV2ZWwpKVxuICAgICAgLnNvcnQoKFthXSwgW2JdKSA9PiBhLmxvY2FsZUNvbXBhcmUoYikpLFxuICApO1xuICBhd2FpdCBmcy5ta2Rpcihhc3NldERpcmVjdG9yeSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIGF3YWl0IGZzLndyaXRlRmlsZShmaWxlUGF0aCwgYCR7SlNPTi5zdHJpbmdpZnkobm9ybWFsaXplZCwgbnVsbCwgMil9XFxuYCwgXCJ1dGY4XCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXNzZXRBY2Nlc3NMZXZlbChhY2Nlc3NNYXA6IFJlY29yZDxzdHJpbmcsIEFjY2Vzc0xldmVsPiwgZmlsZW5hbWU6IHN0cmluZyk6IEFjY2Vzc0xldmVsIHtcbiAgcmV0dXJuIGFjY2Vzc01hcFtmaWxlbmFtZV0gPz8gXCJwdWJsaWNcIjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldEFzc2V0QWNjZXNzTGV2ZWwoXG4gIGFzc2V0RGlyZWN0b3J5OiBzdHJpbmcsXG4gIGZpbGVuYW1lOiBzdHJpbmcsXG4gIGFjY2VzczogQWNjZXNzTGV2ZWwsXG4pOiBQcm9taXNlPEFjY2Vzc0xldmVsPiB7XG4gIGlmICghaXNBY2Nlc3NMZXZlbChhY2Nlc3MpKSB7XG4gICAgdGhyb3cgbmV3IEFzc2V0TWFuYWdlckVycm9yKFwiSW52YWxpZCBhY2Nlc3MgdmFsdWUuXCIpO1xuICB9XG5cbiAgaWYgKCFmaWxlbmFtZSB8fCBmaWxlbmFtZS5zdGFydHNXaXRoKFwiLlwiKSkge1xuICAgIHRocm93IG5ldyBBc3NldE1hbmFnZXJFcnJvcihcIkludmFsaWQgZmlsZW5hbWUuXCIpO1xuICB9XG5cbiAgY29uc3QgYWNjZXNzTWFwID0gYXdhaXQgcmVhZEFzc2V0QWNjZXNzTWFwKGFzc2V0RGlyZWN0b3J5KTtcbiAgYWNjZXNzTWFwW2ZpbGVuYW1lXSA9IGFjY2VzcztcbiAgYXdhaXQgd3JpdGVBc3NldEFjY2Vzc01hcChhc3NldERpcmVjdG9yeSwgYWNjZXNzTWFwKTtcbiAgcmV0dXJuIGFjY2Vzcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFjY2Vzc01ldGFkYXRhRmlsZU5hbWUoKTogc3RyaW5nIHtcbiAgcmV0dXJuIEFDQ0VTU19GSUxFX05BTUU7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9kdXN0aW4vRG9jdW1lbnRzL05ldyBwcm9qZWN0L3doYWxlLW9wcy0yL3NlcnZlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2R1c3Rpbi9Eb2N1bWVudHMvTmV3IHByb2plY3Qvd2hhbGUtb3BzLTIvc2VydmVyL2Fzc2V0UGFnZUNvcHkudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2R1c3Rpbi9Eb2N1bWVudHMvTmV3JTIwcHJvamVjdC93aGFsZS1vcHMtMi9zZXJ2ZXIvYXNzZXRQYWdlQ29weS50c1wiO2ltcG9ydCBmcyBmcm9tIFwibm9kZTpmcy9wcm9taXNlc1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHsgQXNzZXRNYW5hZ2VyRXJyb3IgfSBmcm9tIFwiLi9hc3NldE1hbmFnZXIuanNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBBc3NldFBhZ2VDb3B5IHtcbiAgbG9hZGluZ1ByZXNzQW55S2V5OiBzdHJpbmc7XG4gIGxvYWRpbmdPckNsaWNrOiBzdHJpbmc7XG4gIGxvYWRpbmdFbnRlcmluZzogc3RyaW5nO1xuICBsb2FkaW5nVmVyc2lvbjogc3RyaW5nO1xuICBob21lTWVudVN0YXJ0OiBzdHJpbmc7XG4gIGhvbWVNZW51RW1vdGVzOiBzdHJpbmc7XG4gIGhvbWVNZW51Um9hZG1hcDogc3RyaW5nO1xuICBob21lTWVudUFzc2V0czogc3RyaW5nO1xuICBob21lU3RhcnRUb29sdGlwOiBzdHJpbmc7XG4gIGhvbWVMb2JieUxhYmVsOiBzdHJpbmc7XG4gIGhvbWVQbGF5ZXJDb3VudDogc3RyaW5nO1xuICBob21lUGxheWVyTmFtZTogc3RyaW5nO1xuICBob21lU3BsaXRTY3JlZW5IaW50OiBzdHJpbmc7XG4gIGhvbWVNYXBOYW1lOiBzdHJpbmc7XG4gIGhvbWVNYXBNb2RlOiBzdHJpbmc7XG4gIGhvbWVQYXJ0eUxlYWRlcjogc3RyaW5nO1xuICBob21lUGFydHlQcml2YWN5OiBzdHJpbmc7XG4gIGhvbWVMb2FkaW5nUHJlZml4OiBzdHJpbmc7XG4gIGhvbWVUcmFpbGVyQ2xpY2tMYWJlbDogc3RyaW5nO1xuICBob21lVHJhaWxlclRpdGxlOiBzdHJpbmc7XG4gIGhvbWVUcmFpbGVyU3VidGl0bGU6IHN0cmluZztcbiAgZW1vdGVzQXJtb3J5TGFiZWw6IHN0cmluZztcbiAgZW1vdGVzVGl0bGU6IHN0cmluZztcbiAgZW1vdGVzQmFja0J1dHRvbjogc3RyaW5nO1xuICBlbW90ZXNTZWxlY3RUb1ByZXZpZXc6IHN0cmluZztcbiAgZW1vdGVzTm9TZWxlY3Rpb246IHN0cmluZztcbiAgZW1vdGVzU2VsZWN0UHJvbXB0OiBzdHJpbmc7XG4gIGVtb3Rlc0F2YWlsYWJsZVRpdGxlOiBzdHJpbmc7XG4gIGVtb3Rlc0xlZ2VuZGFyeUxhYmVsOiBzdHJpbmc7XG4gIGVtb3Rlc0VwaWNMYWJlbDogc3RyaW5nO1xuICBlbW90ZXNSYXJlTGFiZWw6IHN0cmluZztcbiAgZW1vdGVzRm9vdGVyQ29weXJpZ2h0OiBzdHJpbmc7XG4gIHJvYWRtYXBIZWFkZXJMYWJlbDogc3RyaW5nO1xuICByb2FkbWFwVGl0bGU6IHN0cmluZztcbiAgcm9hZG1hcEJhY2tCdXR0b246IHN0cmluZztcbiAgcm9hZG1hcE9iamVjdGl2ZXNMYWJlbDogc3RyaW5nO1xuICByb2FkbWFwQ2xpY2tDb2xsYXBzZTogc3RyaW5nO1xuICByb2FkbWFwQ2xpY2tFeHBhbmQ6IHN0cmluZztcbiAgdG9vbHNMYWJlbDogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xuICBzdWJ0aXRsZTogc3RyaW5nO1xuICBvd25lckFjY2Vzc0xhYmVsOiBzdHJpbmc7XG4gIHVubG9ja1RpdGxlOiBzdHJpbmc7XG4gIHVubG9ja0Rlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIHVubG9ja1BsYWNlaG9sZGVyOiBzdHJpbmc7XG4gIHVubG9ja0J1dHRvbjogc3RyaW5nO1xuICBiYWNrQnV0dG9uOiBzdHJpbmc7XG4gIGxvY2tCdXR0b246IHN0cmluZztcbiAgc2VhcmNoUGxhY2Vob2xkZXI6IHN0cmluZztcbiAgcmVhZE9ubHlUZXh0OiBzdHJpbmc7XG4gIHdyaXRhYmxlVGV4dDogc3RyaW5nO1xuICByZWZyZXNoQnV0dG9uOiBzdHJpbmc7XG4gIHNlY3Rpb25Bc3NldDogc3RyaW5nO1xuICBzZWN0aW9uUHJldmlldzogc3RyaW5nO1xuICBzZWN0aW9uVHlwZTogc3RyaW5nO1xuICBzZWN0aW9uU2l6ZTogc3RyaW5nO1xuICBzZWN0aW9uQWNjZXNzOiBzdHJpbmc7XG4gIHNlY3Rpb25VcGRhdGVkOiBzdHJpbmc7XG4gIHNlY3Rpb25BY3Rpb246IHN0cmluZztcbiAgZWRpdG9yVGl0bGU6IHN0cmluZztcbiAgZWRpdG9yRGVzY3JpcHRpb246IHN0cmluZztcbiAgZWRpdG9yU2F2ZTogc3RyaW5nO1xuICBlZGl0b3JSZXNldDogc3RyaW5nO1xuICBmb290ZXJOb3RlOiBzdHJpbmc7XG59XG5cbmNvbnN0IENPUFlfRklMRV9OQU1FID0gXCIuYXNzZXQtcGFnZS1jb3B5Lmpzb25cIjtcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfQVNTRVRfUEFHRV9DT1BZOiBBc3NldFBhZ2VDb3B5ID0ge1xuICBsb2FkaW5nUHJlc3NBbnlLZXk6IFwiUFJFU1MgQU5ZIEtFWSBUTyBFTlRFUlwiLFxuICBsb2FkaW5nT3JDbGljazogXCJPUiBDTElDSyBBTllXSEVSRVwiLFxuICBsb2FkaW5nRW50ZXJpbmc6IFwiRU5URVJJTkdcIixcbiAgbG9hZGluZ1ZlcnNpb246IFwiUkVEIFdISVRFICYgQkxVRVx1MjEyMiB2MS4wXCIsXG4gIGhvbWVNZW51U3RhcnQ6IFwiU1RBUlQgR0FNRVwiLFxuICBob21lTWVudUVtb3RlczogXCJFTU9URVNcIixcbiAgaG9tZU1lbnVSb2FkbWFwOiBcIlJPQURNQVBcIixcbiAgaG9tZU1lbnVBc3NldHM6IFwiQVNTRVQgTUFOQUdFUlwiLFxuICBob21lU3RhcnRUb29sdGlwOiBcIkNPTUlORyBTT09OXCIsXG4gIGhvbWVMb2JieUxhYmVsOiBcIkxPQkJZXCIsXG4gIGhvbWVQbGF5ZXJDb3VudDogXCIxIFBsYXllcnMgKDE4IE1heClcIixcbiAgaG9tZVBsYXllck5hbWU6IFwiRE9OQUxEIFRSVU1QXCIsXG4gIGhvbWVTcGxpdFNjcmVlbkhpbnQ6IFwiQWRkIGNvbnRyb2xsZXIgZm9yIFNwbGl0IFNjcmVlblwiLFxuICBob21lTWFwTmFtZTogXCJJUkFOXCIsXG4gIGhvbWVNYXBNb2RlOiBcIlBWUFwiLFxuICBob21lUGFydHlMZWFkZXI6IFwiWW91IGFyZSBQYXJ0eSBMZWFkZXJcIixcbiAgaG9tZVBhcnR5UHJpdmFjeTogXCJQYXJ0eSBQcml2YWN5OiBPcGVuXCIsXG4gIGhvbWVMb2FkaW5nUHJlZml4OiBcIklOSVRJQUxJWklORyBUQUNUSUNBTCBJTlRFUkZBQ0UuLi5cIixcbiAgaG9tZVRyYWlsZXJDbGlja0xhYmVsOiBcIkNsaWNrIHRvIFdhdGNoIFRyYWlsZXJcIixcbiAgaG9tZVRyYWlsZXJUaXRsZTogXCJSRUQgV0hJVEUgJiBCTFVFIFRSQUlMRVJcIixcbiAgaG9tZVRyYWlsZXJTdWJ0aXRsZTogXCJPRkZJQ0lBTCBQUkVWSUVXXCIsXG4gIGVtb3Rlc0FybW9yeUxhYmVsOiBcIkFSTU9SWVwiLFxuICBlbW90ZXNUaXRsZTogXCJFTU9URVNcIixcbiAgZW1vdGVzQmFja0J1dHRvbjogXCJcdTIxOTAgQkFDSyBUTyBMT0JCWVwiLFxuICBlbW90ZXNTZWxlY3RUb1ByZXZpZXc6IFwiU0VMRUNUIEFOIEVNT1RFIFRPIFBSRVZJRVdcIixcbiAgZW1vdGVzTm9TZWxlY3Rpb246IFwiTk8gRU1PVEUgU0VMRUNURURcIixcbiAgZW1vdGVzU2VsZWN0UHJvbXB0OiBcIlNFTEVDVCBBTiBFTU9URVwiLFxuICBlbW90ZXNBdmFpbGFibGVUaXRsZTogXCJBVkFJTEFCTEUgRU1PVEVTXCIsXG4gIGVtb3Rlc0xlZ2VuZGFyeUxhYmVsOiBcIkxFR0VOREFSWVwiLFxuICBlbW90ZXNFcGljTGFiZWw6IFwiRVBJQ1wiLFxuICBlbW90ZXNSYXJlTGFiZWw6IFwiUkFSRVwiLFxuICBlbW90ZXNGb290ZXJDb3B5cmlnaHQ6IFwiMjAyNiBSRUQgV0hJVEUgJiBCTFVFXCIsXG4gIHJvYWRtYXBIZWFkZXJMYWJlbDogXCJNSVNTSU9OIEJSSUVGSU5HXCIsXG4gIHJvYWRtYXBUaXRsZTogXCJST0FETUFQXCIsXG4gIHJvYWRtYXBCYWNrQnV0dG9uOiBcIlx1MjE5MCBCQUNLXCIsXG4gIHJvYWRtYXBPYmplY3RpdmVzTGFiZWw6IFwiT0JKRUNUSVZFU1wiLFxuICByb2FkbWFwQ2xpY2tDb2xsYXBzZTogXCJDTElDSyBUTyBDT0xMQVBTRVwiLFxuICByb2FkbWFwQ2xpY2tFeHBhbmQ6IFwiQ0xJQ0sgVE8gRVhQQU5EXCIsXG4gIHRvb2xzTGFiZWw6IFwiVE9PTFNcIixcbiAgdGl0bGU6IFwiQVNTRVQgTUFOQUdFUlwiLFxuICBzdWJ0aXRsZTogXCJQcml2YXRlIG1hbmFnZXIgd2l0aCBwcmV2aWV3LCByZXBsYWNlbWVudCwgYW5kIHBlci1maWxlIGFjY2VzcyBjb250cm9scy5cIixcbiAgb3duZXJBY2Nlc3NMYWJlbDogXCJPV05FUiBBQ0NFU1NcIixcbiAgdW5sb2NrVGl0bGU6IFwiVW5sb2NrIEFzc2V0IE1hbmFnZXJcIixcbiAgdW5sb2NrRGVzY3JpcHRpb246IFwiVGhpcyBwYWdlIGlzIGxvY2tlZC4gRW50ZXIgeW91ciBBU1NFVF9NQU5BR0VSX0tFWSB0byBtYW5hZ2UgZmlsZXMuXCIsXG4gIHVubG9ja1BsYWNlaG9sZGVyOiBcIkVudGVyIG1hbmFnZXIga2V5XCIsXG4gIHVubG9ja0J1dHRvbjogXCJVTkxPQ0tcIixcbiAgYmFja0J1dHRvbjogXCJCQUNLIFRPIExPQkJZXCIsXG4gIGxvY2tCdXR0b246IFwiTE9DS1wiLFxuICBzZWFyY2hQbGFjZWhvbGRlcjogXCJTZWFyY2ggYXNzZXRzIGJ5IGZpbGVuYW1lLi4uXCIsXG4gIHJlYWRPbmx5VGV4dDogXCJSZWFkLW9ubHkgZGVwbG95bWVudCBtb2RlIGFjdGl2ZS5cIixcbiAgd3JpdGFibGVUZXh0OiBcIldyaXRlIGFjY2VzcyBlbmFibGVkLlwiLFxuICByZWZyZXNoQnV0dG9uOiBcIlJFRlJFU0hcIixcbiAgc2VjdGlvbkFzc2V0OiBcIkFTU0VUXCIsXG4gIHNlY3Rpb25QcmV2aWV3OiBcIlBSRVZJRVdcIixcbiAgc2VjdGlvblR5cGU6IFwiVFlQRVwiLFxuICBzZWN0aW9uU2l6ZTogXCJTSVpFXCIsXG4gIHNlY3Rpb25BY2Nlc3M6IFwiQUNDRVNTXCIsXG4gIHNlY3Rpb25VcGRhdGVkOiBcIlVQREFURURcIixcbiAgc2VjdGlvbkFjdGlvbjogXCJBQ1RJT05cIixcbiAgZWRpdG9yVGl0bGU6IFwiUGFnZSBDb3B5IEVkaXRvclwiLFxuICBlZGl0b3JEZXNjcmlwdGlvbjogXCJFZGl0IGFsbW9zdCBhbGwgdGV4dCBzaG93biBvbiB0aGlzIHBhZ2UuIE9ubHkgdXNlcnMgd2l0aCB5b3VyIG1hbmFnZXIga2V5IGNhbiBlZGl0IHRoaXMuXCIsXG4gIGVkaXRvclNhdmU6IFwiU0FWRSBDT1BZXCIsXG4gIGVkaXRvclJlc2V0OiBcIlJFU0VUIERFRkFVTFRTXCIsXG4gIGZvb3Rlck5vdGU6IFwiT25seSBhdXRob3JpemVkIHVzZXJzIHNob3VsZCBoYXZlIHlvdXIgbWFuYWdlciBrZXkuXCIsXG59O1xuXG5jb25zdCBDT1BZX0tFWVMgPSBPYmplY3Qua2V5cyhERUZBVUxUX0FTU0VUX1BBR0VfQ09QWSkgYXMgQXJyYXk8a2V5b2YgQXNzZXRQYWdlQ29weT47XG5cbmZ1bmN0aW9uIGdldENvcHlGaWxlUGF0aChhc3NldERpcmVjdG9yeTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGgucmVzb2x2ZShhc3NldERpcmVjdG9yeSwgQ09QWV9GSUxFX05BTUUpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVDb3B5KHJhdzogdW5rbm93bik6IEFzc2V0UGFnZUNvcHkge1xuICBjb25zdCBuZXh0OiBBc3NldFBhZ2VDb3B5ID0geyAuLi5ERUZBVUxUX0FTU0VUX1BBR0VfQ09QWSB9O1xuICBpZiAoIXJhdyB8fCB0eXBlb2YgcmF3ICE9PSBcIm9iamVjdFwiIHx8IEFycmF5LmlzQXJyYXkocmF3KSkge1xuICAgIHJldHVybiBuZXh0O1xuICB9XG5cbiAgZm9yIChjb25zdCBrZXkgb2YgQ09QWV9LRVlTKSB7XG4gICAgY29uc3QgdmFsdWUgPSAocmF3IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtrZXldO1xuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIG5leHRba2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXh0O1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUNvcHkoY29weTogQXNzZXRQYWdlQ29weSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IGtleSBvZiBDT1BZX0tFWVMpIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNvcHlba2V5XTtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aHJvdyBuZXcgQXNzZXRNYW5hZ2VyRXJyb3IoYEludmFsaWQgY29weSBmaWVsZDogJHtTdHJpbmcoa2V5KX1gKTtcbiAgICB9XG5cbiAgICBpZiAodmFsdWUubGVuZ3RoID4gNDAwKSB7XG4gICAgICB0aHJvdyBuZXcgQXNzZXRNYW5hZ2VyRXJyb3IoYENvcHkgZmllbGQgaXMgdG9vIGxvbmc6ICR7U3RyaW5nKGtleSl9YCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkQXNzZXRQYWdlQ29weShhc3NldERpcmVjdG9yeTogc3RyaW5nKTogUHJvbWlzZTxBc3NldFBhZ2VDb3B5PiB7XG4gIGNvbnN0IGZpbGVQYXRoID0gZ2V0Q29weUZpbGVQYXRoKGFzc2V0RGlyZWN0b3J5KTtcblxuICB0cnkge1xuICAgIGNvbnN0IHJhdyA9IGF3YWl0IGZzLnJlYWRGaWxlKGZpbGVQYXRoLCBcInV0ZjhcIik7XG4gICAgcmV0dXJuIG5vcm1hbGl6ZUNvcHkoSlNPTi5wYXJzZShyYXcpKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBjb2RlID0gKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZTtcbiAgICBpZiAoY29kZSA9PT0gXCJFTk9FTlRcIikge1xuICAgICAgcmV0dXJuIHsgLi4uREVGQVVMVF9BU1NFVF9QQUdFX0NPUFkgfTtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlQXNzZXRQYWdlQ29weShhc3NldERpcmVjdG9yeTogc3RyaW5nLCByYXdDb3B5OiB1bmtub3duKTogUHJvbWlzZTxBc3NldFBhZ2VDb3B5PiB7XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVDb3B5KHJhd0NvcHkpO1xuICB2YWxpZGF0ZUNvcHkobm9ybWFsaXplZCk7XG5cbiAgY29uc3QgZmlsZVBhdGggPSBnZXRDb3B5RmlsZVBhdGgoYXNzZXREaXJlY3RvcnkpO1xuICBhd2FpdCBmcy5ta2Rpcihhc3NldERpcmVjdG9yeSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIGF3YWl0IGZzLndyaXRlRmlsZShmaWxlUGF0aCwgYCR7SlNPTi5zdHJpbmdpZnkobm9ybWFsaXplZCwgbnVsbCwgMil9XFxuYCwgXCJ1dGY4XCIpO1xuICByZXR1cm4gbm9ybWFsaXplZDtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2R1c3Rpbi9Eb2N1bWVudHMvTmV3IHByb2plY3Qvd2hhbGUtb3BzLTIvc2VydmVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvZHVzdGluL0RvY3VtZW50cy9OZXcgcHJvamVjdC93aGFsZS1vcHMtMi9zZXJ2ZXIvZ2l0aHViU3luYy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZHVzdGluL0RvY3VtZW50cy9OZXclMjBwcm9qZWN0L3doYWxlLW9wcy0yL3NlcnZlci9naXRodWJTeW5jLnRzXCI7aW1wb3J0IHBhdGggZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHsgQXNzZXRNYW5hZ2VyRXJyb3IsIGRlY29kZUJhc2U2NFBheWxvYWQgfSBmcm9tIFwiLi9hc3NldE1hbmFnZXIuanNcIjtcblxuY29uc3QgR0lUSFVCX0FQSV9CQVNFID0gXCJodHRwczovL2FwaS5naXRodWIuY29tXCI7XG5jb25zdCBNQVhfR0lUSFVCX1VQTE9BRF9CWVRFUyA9IDkwICogMTAyNCAqIDEwMjQ7XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2l0SHViQ2xpcFN5bmNSZXN1bHQge1xuICBicmFuY2g6IHN0cmluZztcbiAgY29tbWl0U2hhOiBzdHJpbmc7XG4gIGNvbW1pdFVybDogc3RyaW5nO1xuICBwYXRoOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBHaXRIdWJDb25maWcge1xuICB0b2tlbjogc3RyaW5nO1xuICBvd25lcjogc3RyaW5nO1xuICByZXBvOiBzdHJpbmc7XG4gIGJyYW5jaDogc3RyaW5nO1xuICBhc3NldERpcjogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBlbmNvZGVSZXBvUGF0aChyZXBvUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJlcG9QYXRoXG4gICAgLnNwbGl0KFwiL1wiKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChzZWdtZW50KSA9PiBlbmNvZGVVUklDb21wb25lbnQoc2VnbWVudCkpXG4gICAgLmpvaW4oXCIvXCIpO1xufVxuXG5mdW5jdGlvbiByZWFkR2l0SHViQ29uZmlnKCk6IEdpdEh1YkNvbmZpZyB7XG4gIGNvbnN0IHRva2VuID0gcHJvY2Vzcy5lbnYuR0lUSFVCX1NZTkNfVE9LRU4/LnRyaW0oKSA/PyBwcm9jZXNzLmVudi5HSVRIVUJfVE9LRU4/LnRyaW0oKSA/PyBcIlwiO1xuICBjb25zdCBvd25lciA9IHByb2Nlc3MuZW52LkdJVEhVQl9TWU5DX09XTkVSPy50cmltKCkgPz8gXCJcIjtcbiAgY29uc3QgcmVwbyA9IHByb2Nlc3MuZW52LkdJVEhVQl9TWU5DX1JFUE8/LnRyaW0oKSA/PyBcIlwiO1xuICBjb25zdCBicmFuY2ggPSBwcm9jZXNzLmVudi5HSVRIVUJfU1lOQ19CUkFOQ0g/LnRyaW0oKSB8fCBcIm1haW5cIjtcbiAgY29uc3QgYXNzZXREaXIgPSBwcm9jZXNzLmVudi5HSVRIVUJfU1lOQ19BU1NFVF9ESVI/LnRyaW0oKSB8fCBcImNsaWVudC9wdWJsaWMvaW1hZ2VzXCI7XG5cbiAgaWYgKCF0b2tlbikge1xuICAgIHRocm93IG5ldyBBc3NldE1hbmFnZXJFcnJvcihcIkdJVEhVQl9TWU5DX1RPS0VOIGlzIG5vdCBjb25maWd1cmVkIG9uIHNlcnZlci5cIiwgNTAzKTtcbiAgfVxuICBpZiAoIW93bmVyIHx8ICFyZXBvKSB7XG4gICAgdGhyb3cgbmV3IEFzc2V0TWFuYWdlckVycm9yKFwiR0lUSFVCX1NZTkNfT1dORVIgYW5kIEdJVEhVQl9TWU5DX1JFUE8gbXVzdCBiZSBjb25maWd1cmVkLlwiLCA1MDMpO1xuICB9XG5cbiAgcmV0dXJuIHsgdG9rZW4sIG93bmVyLCByZXBvLCBicmFuY2gsIGFzc2V0RGlyIH07XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlRmlsZW5hbWUoZmlsZW5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICghZmlsZW5hbWUgfHwgdHlwZW9mIGZpbGVuYW1lICE9PSBcInN0cmluZ1wiKSB7XG4gICAgdGhyb3cgbmV3IEFzc2V0TWFuYWdlckVycm9yKFwiTWlzc2luZyBmaWxlbmFtZS5cIik7XG4gIH1cblxuICBjb25zdCBjbGVhbiA9IHBhdGguYmFzZW5hbWUoZmlsZW5hbWUudHJpbSgpKTtcbiAgaWYgKCFjbGVhbiB8fCBjbGVhbiAhPT0gZmlsZW5hbWUudHJpbSgpIHx8IGNsZWFuLnN0YXJ0c1dpdGgoXCIuXCIpKSB7XG4gICAgdGhyb3cgbmV3IEFzc2V0TWFuYWdlckVycm9yKFwiSW52YWxpZCBmaWxlbmFtZS5cIik7XG4gIH1cblxuICByZXR1cm4gY2xlYW47XG59XG5cbmZ1bmN0aW9uIGJ1aWxkQ29tbWl0TWVzc2FnZShmaWxlbmFtZTogc3RyaW5nLCBub3RlPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgYmFzZSA9IGBBc3NldCBtYW5hZ2VyIGNsaXAgdXBkYXRlOiAke2ZpbGVuYW1lfWA7XG4gIGNvbnN0IGNsZWFuTm90ZSA9IHR5cGVvZiBub3RlID09PSBcInN0cmluZ1wiID8gbm90ZS50cmltKCkgOiBcIlwiO1xuICBpZiAoIWNsZWFuTm90ZSkge1xuICAgIHJldHVybiBiYXNlO1xuICB9XG4gIHJldHVybiBgJHtiYXNlfSAoJHtjbGVhbk5vdGUuc2xpY2UoMCwgMTIwKX0pYDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2l0aHViUmVxdWVzdCh1cmw6IHN0cmluZywgdG9rZW46IHN0cmluZywgaW5pdDogUmVxdWVzdEluaXQgPSB7fSk6IFByb21pc2U8UmVzcG9uc2U+IHtcbiAgcmV0dXJuIGZldGNoKHVybCwge1xuICAgIC4uLmluaXQsXG4gICAgaGVhZGVyczoge1xuICAgICAgQWNjZXB0OiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIranNvblwiLFxuICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3Rva2VufWAsXG4gICAgICBcIlgtR2l0SHViLUFwaS1WZXJzaW9uXCI6IFwiMjAyMi0xMS0yOFwiLFxuICAgICAgLi4uKGluaXQuaGVhZGVycyA/PyB7fSksXG4gICAgfSxcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHBhcnNlRXJyb3JCb2R5KHJlc3BvbnNlOiBSZXNwb25zZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcGF5bG9hZCA9IChhd2FpdCByZXNwb25zZS5qc29uKCkpIGFzIHsgbWVzc2FnZT86IHN0cmluZyB9O1xuICAgIGlmIChwYXlsb2FkPy5tZXNzYWdlKSB7XG4gICAgICByZXR1cm4gcGF5bG9hZC5tZXNzYWdlO1xuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLy8gaWdub3JlXG4gIH1cbiAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1c1RleHQgfHwgXCJHaXRIdWIgcmVxdWVzdCBmYWlsZWQuXCI7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdWJtaXRDbGlwVG9HaXRIdWIoXG4gIGZpbGVuYW1lOiBzdHJpbmcsXG4gIGNvbnRlbnRCYXNlNjQ6IHN0cmluZyxcbiAgbm90ZT86IHN0cmluZyxcbik6IFByb21pc2U8R2l0SHViQ2xpcFN5bmNSZXN1bHQ+IHtcbiAgY29uc3QgY29uZmlnID0gcmVhZEdpdEh1YkNvbmZpZygpO1xuICBjb25zdCBzYWZlRmlsZW5hbWUgPSB2YWxpZGF0ZUZpbGVuYW1lKGZpbGVuYW1lKTtcbiAgY29uc3QgY29udGVudCA9IGRlY29kZUJhc2U2NFBheWxvYWQoY29udGVudEJhc2U2NCwgTUFYX0dJVEhVQl9VUExPQURfQllURVMpLnRvU3RyaW5nKFwiYmFzZTY0XCIpO1xuICBjb25zdCB0YXJnZXRQYXRoID0gcGF0aC5wb3NpeC5qb2luKGNvbmZpZy5hc3NldERpci5zcGxpdChwYXRoLnNlcCkuam9pbihcIi9cIiksIHNhZmVGaWxlbmFtZSk7XG4gIGNvbnN0IGVuY29kZWRQYXRoID0gZW5jb2RlUmVwb1BhdGgodGFyZ2V0UGF0aCk7XG4gIGNvbnN0IGNvbnRlbnRVcmwgPSBgJHtHSVRIVUJfQVBJX0JBU0V9L3JlcG9zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGNvbmZpZy5vd25lcil9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGNvbmZpZy5yZXBvKX0vY29udGVudHMvJHtlbmNvZGVkUGF0aH1gO1xuXG4gIGxldCBzaGE6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgY29uc3QgZ2V0UmVzcG9uc2UgPSBhd2FpdCBnaXRodWJSZXF1ZXN0KGAke2NvbnRlbnRVcmx9P3JlZj0ke2VuY29kZVVSSUNvbXBvbmVudChjb25maWcuYnJhbmNoKX1gLCBjb25maWcudG9rZW4pO1xuICBpZiAoZ2V0UmVzcG9uc2Uuc3RhdHVzID09PSAyMDApIHtcbiAgICBjb25zdCBib2R5ID0gKGF3YWl0IGdldFJlc3BvbnNlLmpzb24oKSkgYXMgeyBzaGE/OiBzdHJpbmcgfTtcbiAgICBzaGEgPSB0eXBlb2YgYm9keS5zaGEgPT09IFwic3RyaW5nXCIgPyBib2R5LnNoYSA6IHVuZGVmaW5lZDtcbiAgfSBlbHNlIGlmIChnZXRSZXNwb25zZS5zdGF0dXMgIT09IDQwNCkge1xuICAgIGNvbnN0IGRldGFpbCA9IGF3YWl0IHBhcnNlRXJyb3JCb2R5KGdldFJlc3BvbnNlKTtcbiAgICB0aHJvdyBuZXcgQXNzZXRNYW5hZ2VyRXJyb3IoYEdpdEh1YiBsb29rdXAgZmFpbGVkOiAke2RldGFpbH1gLCA1MDIpO1xuICB9XG5cbiAgY29uc3QgcHV0Qm9keSA9IHtcbiAgICBtZXNzYWdlOiBidWlsZENvbW1pdE1lc3NhZ2Uoc2FmZUZpbGVuYW1lLCBub3RlKSxcbiAgICBjb250ZW50LFxuICAgIGJyYW5jaDogY29uZmlnLmJyYW5jaCxcbiAgICAuLi4oc2hhID8geyBzaGEgfSA6IHt9KSxcbiAgfTtcblxuICBjb25zdCBwdXRSZXNwb25zZSA9IGF3YWl0IGdpdGh1YlJlcXVlc3QoY29udGVudFVybCwgY29uZmlnLnRva2VuLCB7XG4gICAgbWV0aG9kOiBcIlBVVFwiLFxuICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwdXRCb2R5KSxcbiAgfSk7XG5cbiAgaWYgKCFwdXRSZXNwb25zZS5vaykge1xuICAgIGNvbnN0IGRldGFpbCA9IGF3YWl0IHBhcnNlRXJyb3JCb2R5KHB1dFJlc3BvbnNlKTtcbiAgICB0aHJvdyBuZXcgQXNzZXRNYW5hZ2VyRXJyb3IoYEdpdEh1YiB1cGRhdGUgZmFpbGVkOiAke2RldGFpbH1gLCA1MDIpO1xuICB9XG5cbiAgY29uc3QgcHV0UGF5bG9hZCA9IChhd2FpdCBwdXRSZXNwb25zZS5qc29uKCkpIGFzIHtcbiAgICBjb250ZW50PzogeyBwYXRoPzogc3RyaW5nIH07XG4gICAgY29tbWl0PzogeyBzaGE/OiBzdHJpbmc7IGh0bWxfdXJsPzogc3RyaW5nIH07XG4gIH07XG5cbiAgY29uc3QgY29tbWl0U2hhID0gcHV0UGF5bG9hZC5jb21taXQ/LnNoYTtcbiAgY29uc3QgY29tbWl0VXJsID0gcHV0UGF5bG9hZC5jb21taXQ/Lmh0bWxfdXJsO1xuICBpZiAoIWNvbW1pdFNoYSB8fCAhY29tbWl0VXJsKSB7XG4gICAgdGhyb3cgbmV3IEFzc2V0TWFuYWdlckVycm9yKFwiR2l0SHViIHVwZGF0ZSBmYWlsZWQ6IG1pc3NpbmcgY29tbWl0IGRldGFpbHMuXCIsIDUwMik7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGJyYW5jaDogY29uZmlnLmJyYW5jaCxcbiAgICBjb21taXRTaGEsXG4gICAgY29tbWl0VXJsLFxuICAgIHBhdGg6IHB1dFBheWxvYWQuY29udGVudD8ucGF0aCA/PyB0YXJnZXRQYXRoLFxuICB9O1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFpVSxTQUFTLG9CQUFvQjtBQUM5VixPQUFPLGlCQUFpQjtBQUN4QixPQUFPLFdBQVc7QUFFbEIsT0FBT0EsV0FBVTtBQUNqQixTQUFTLG9CQUFvQjtBQUM3QixTQUFTLDhCQUE4Qjs7O0FDTmlULE9BQU9DLFNBQVE7QUFDdlcsT0FBT0MsV0FBVTs7O0FDRHFVLE9BQU8sUUFBUTtBQUNyVyxPQUFPLFVBQVU7QUFLakIsSUFBTSxtQkFBbUI7QUFFekIsU0FBUyxTQUFTLE9BQWtEO0FBQ2xFLFNBQU8sT0FBTyxVQUFVLFlBQVksVUFBVSxRQUFRLENBQUMsTUFBTSxRQUFRLEtBQUs7QUFDNUU7QUFFQSxTQUFTLGNBQWMsT0FBc0M7QUFDM0QsU0FBTyxVQUFVLFlBQVksVUFBVTtBQUN6QztBQUVBLFNBQVMsa0JBQWtCLGdCQUFnQztBQUN6RCxTQUFPLEtBQUssUUFBUSxnQkFBZ0IsZ0JBQWdCO0FBQ3REO0FBRUEsZUFBc0IsbUJBQW1CLGdCQUE4RDtBQUNyRyxRQUFNLFdBQVcsa0JBQWtCLGNBQWM7QUFFakQsTUFBSTtBQUNGLFVBQU0sTUFBTSxNQUFNLEdBQUcsU0FBUyxVQUFVLE1BQU07QUFDOUMsVUFBTSxTQUFTLEtBQUssTUFBTSxHQUFHO0FBQzdCLFFBQUksQ0FBQyxTQUFTLE1BQU0sR0FBRztBQUNyQixhQUFPLENBQUM7QUFBQSxJQUNWO0FBRUEsVUFBTSxTQUFzQyxDQUFDO0FBQzdDLGVBQVcsQ0FBQyxVQUFVLEtBQUssS0FBSyxPQUFPLFFBQVEsTUFBTSxHQUFHO0FBQ3RELFVBQUksQ0FBQyxTQUFTLFdBQVcsR0FBRyxLQUFLLGNBQWMsS0FBSyxHQUFHO0FBQ3JELGVBQU8sUUFBUSxJQUFJO0FBQUEsTUFDckI7QUFBQSxJQUNGO0FBQ0EsV0FBTztBQUFBLEVBQ1QsU0FBUyxPQUFPO0FBQ2QsVUFBTSxPQUFRLE1BQWdDO0FBQzlDLFFBQUksU0FBUyxVQUFVO0FBQ3JCLGFBQU8sQ0FBQztBQUFBLElBQ1Y7QUFDQSxVQUFNO0FBQUEsRUFDUjtBQUNGO0FBRUEsZUFBZSxvQkFBb0IsZ0JBQXdCLEtBQWlEO0FBQzFHLFFBQU0sV0FBVyxrQkFBa0IsY0FBYztBQUNqRCxRQUFNLGFBQWEsT0FBTztBQUFBLElBQ3hCLE9BQU8sUUFBUSxHQUFHLEVBQ2YsT0FBTyxDQUFDLENBQUMsVUFBVSxLQUFLLE1BQU0sQ0FBQyxTQUFTLFdBQVcsR0FBRyxLQUFLLGNBQWMsS0FBSyxDQUFDLEVBQy9FLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBQUEsRUFDMUM7QUFDQSxRQUFNLEdBQUcsTUFBTSxnQkFBZ0IsRUFBRSxXQUFXLEtBQUssQ0FBQztBQUNsRCxRQUFNLEdBQUcsVUFBVSxVQUFVLEdBQUcsS0FBSyxVQUFVLFlBQVksTUFBTSxDQUFDLENBQUM7QUFBQSxHQUFNLE1BQU07QUFDakY7QUFFTyxTQUFTLG9CQUFvQixXQUF3QyxVQUErQjtBQUN6RyxTQUFPLFVBQVUsUUFBUSxLQUFLO0FBQ2hDO0FBRUEsZUFBc0Isb0JBQ3BCLGdCQUNBLFVBQ0EsUUFDc0I7QUFDdEIsTUFBSSxDQUFDLGNBQWMsTUFBTSxHQUFHO0FBQzFCLFVBQU0sSUFBSSxrQkFBa0IsdUJBQXVCO0FBQUEsRUFDckQ7QUFFQSxNQUFJLENBQUMsWUFBWSxTQUFTLFdBQVcsR0FBRyxHQUFHO0FBQ3pDLFVBQU0sSUFBSSxrQkFBa0IsbUJBQW1CO0FBQUEsRUFDakQ7QUFFQSxRQUFNLFlBQVksTUFBTSxtQkFBbUIsY0FBYztBQUN6RCxZQUFVLFFBQVEsSUFBSTtBQUN0QixRQUFNLG9CQUFvQixnQkFBZ0IsU0FBUztBQUNuRCxTQUFPO0FBQ1Q7QUFFTyxTQUFTLDRCQUFvQztBQUNsRCxTQUFPO0FBQ1Q7OztBRDlFQSxJQUFNLG1CQUFtQixvQkFBSSxJQUFJLENBQUMsUUFBUSxRQUFRLFNBQVMsUUFBUSxTQUFTLFFBQVEsU0FBUyxRQUFRLE1BQU0sQ0FBQztBQUM1RyxJQUFNLG1CQUFtQixvQkFBSSxJQUFJLENBQUMsUUFBUSxRQUFRLFNBQVMsUUFBUSxRQUFRLE1BQU0sQ0FBQztBQUNsRixJQUFNLG1CQUFtQixvQkFBSSxJQUFJLENBQUMsUUFBUSxRQUFRLFFBQVEsUUFBUSxRQUFRLE9BQU8sQ0FBQztBQUVsRixJQUFNLDZCQUE2QkMsTUFBSyxLQUFLLFVBQVUsVUFBVSxRQUFRO0FBQ3pFLElBQU0scUJBQXFCLG9CQUFJLElBQUksQ0FBQyx3QkFBd0IsMEJBQTBCLENBQUMsQ0FBQztBQUVqRixJQUFNLG1CQUFtQixNQUFNLE9BQU87QUFZdEMsSUFBTSxvQkFBTixjQUFnQyxNQUFNO0FBQUEsRUFDbEM7QUFBQSxFQUVULFlBQVksU0FBaUIsYUFBYSxLQUFLO0FBQzdDLFVBQU0sT0FBTztBQUNiLFNBQUssT0FBTztBQUNaLFNBQUssYUFBYTtBQUFBLEVBQ3BCO0FBQ0Y7QUFFQSxTQUFTLGFBQWEsVUFBNkI7QUFDakQsUUFBTSxNQUFNQSxNQUFLLFFBQVEsUUFBUSxFQUFFLFlBQVk7QUFDL0MsTUFBSSxpQkFBaUIsSUFBSSxHQUFHLEdBQUc7QUFDN0IsV0FBTztBQUFBLEVBQ1Q7QUFDQSxNQUFJLGlCQUFpQixJQUFJLEdBQUcsR0FBRztBQUM3QixXQUFPO0FBQUEsRUFDVDtBQUNBLE1BQUksaUJBQWlCLElBQUksR0FBRyxHQUFHO0FBQzdCLFdBQU87QUFBQSxFQUNUO0FBQ0EsU0FBTztBQUNUO0FBRUEsU0FBUyxpQkFBaUIsVUFBMEI7QUFDbEQsTUFBSSxDQUFDLFlBQVksT0FBTyxhQUFhLFVBQVU7QUFDN0MsVUFBTSxJQUFJLGtCQUFrQixtQkFBbUI7QUFBQSxFQUNqRDtBQUVBLFFBQU0sUUFBUUEsTUFBSyxTQUFTLFNBQVMsS0FBSyxDQUFDO0FBQzNDLE1BQUksQ0FBQyxTQUFTLFVBQVUsT0FBTyxVQUFVLFFBQVEsVUFBVSxTQUFTLEtBQUssR0FBRztBQUMxRSxVQUFNLElBQUksa0JBQWtCLG1CQUFtQjtBQUFBLEVBQ2pEO0FBRUEsU0FBTztBQUNUO0FBTUEsU0FBUyxpQkFBaUIsZ0JBQXdCLFVBQTBCO0FBQzFFLFFBQU0sV0FBVyxpQkFBaUIsUUFBUTtBQUMxQyxRQUFNLFdBQVdDLE1BQUssUUFBUSxjQUFjO0FBQzVDLFFBQU0sV0FBV0EsTUFBSyxRQUFRLFVBQVUsUUFBUTtBQUVoRCxNQUFJLEVBQUUsYUFBYSxZQUFZLFNBQVMsV0FBVyxHQUFHLFFBQVEsR0FBR0EsTUFBSyxHQUFHLEVBQUUsSUFBSTtBQUM3RSxVQUFNLElBQUksa0JBQWtCLHFCQUFxQjtBQUFBLEVBQ25EO0FBRUEsU0FBTztBQUNUO0FBRUEsZUFBZSxZQUFZLFNBQWlCLFVBQXNDO0FBQ2hGLFFBQU0sZUFBZSxpQkFBaUIsU0FBUyxRQUFRO0FBQ3ZELFFBQU0sUUFBUSxNQUFNQyxJQUFHLEtBQUssWUFBWTtBQUV4QyxTQUFPO0FBQUEsSUFDTDtBQUFBLElBQ0EsS0FBSyxXQUFXLFFBQVE7QUFBQSxJQUN4QixNQUFNLGFBQWEsUUFBUTtBQUFBLElBQzNCLFdBQVcsTUFBTTtBQUFBLElBQ2pCLFdBQVcsTUFBTSxNQUFNLFlBQVk7QUFBQSxFQUNyQztBQUNGO0FBRU8sU0FBUyxvQkFBb0IsZUFBdUIsV0FBVyxrQkFBMEI7QUFDOUYsTUFBSSxDQUFDLGlCQUFpQixPQUFPLGtCQUFrQixVQUFVO0FBQ3ZELFVBQU0sSUFBSSxrQkFBa0IsdUJBQXVCO0FBQUEsRUFDckQ7QUFFQSxRQUFNLGFBQWEsY0FBYyxTQUFTLEdBQUcsSUFDekMsY0FBYyxNQUFNLGNBQWMsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUNsRDtBQUVKLFFBQU0sT0FBTyxPQUFPLEtBQUssWUFBWSxRQUFRO0FBRTdDLE1BQUksS0FBSyxXQUFXLEdBQUc7QUFDckIsVUFBTSxJQUFJLGtCQUFrQix5QkFBeUI7QUFBQSxFQUN2RDtBQUVBLE1BQUksS0FBSyxTQUFTLFVBQVU7QUFDMUIsVUFBTSxJQUFJLGtCQUFrQixzQkFBc0IsR0FBRztBQUFBLEVBQ3ZEO0FBRUEsU0FBTztBQUNUO0FBT0EsZUFBc0Isd0JBQXdCLGdCQUE4QztBQUMxRixRQUFNLFdBQVdDLE1BQUssUUFBUSxjQUFjO0FBQzVDLFFBQU1DLElBQUcsTUFBTSxVQUFVLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFFNUMsUUFBTSxVQUFVLE1BQU1BLElBQUcsUUFBUSxVQUFVLEVBQUUsZUFBZSxLQUFLLENBQUM7QUFDbEUsUUFBTSxRQUFRLFFBQ1gsT0FBTyxDQUFDLFVBQVUsTUFBTSxPQUFPLEtBQUssQ0FBQyxNQUFNLEtBQUssV0FBVyxHQUFHLEtBQUssQ0FBQyxtQkFBbUIsSUFBSSxNQUFNLElBQUksQ0FBQyxFQUN0RyxJQUFJLENBQUMsVUFBVSxNQUFNLElBQUksRUFDekIsS0FBSyxDQUFDLEdBQUcsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBRXBDLFNBQU8sUUFBUSxJQUFJLE1BQU0sSUFBSSxDQUFDLFNBQVMsWUFBWSxVQUFVLElBQUksQ0FBQyxDQUFDO0FBQ3JFO0FBT0EsZUFBc0Isd0JBQ3BCLGdCQUNBLFVBQ0EsYUFDb0I7QUFDcEIsTUFBSSxZQUFZLFNBQVMsa0JBQWtCO0FBQ3pDLFVBQU0sSUFBSSxrQkFBa0Isc0JBQXNCLEdBQUc7QUFBQSxFQUN2RDtBQUVBLFFBQU0sV0FBV0MsTUFBSyxRQUFRLGNBQWM7QUFDNUMsUUFBTSxlQUFlLGlCQUFpQixVQUFVLFFBQVE7QUFDeEQsUUFBTUMsSUFBRyxNQUFNLFVBQVUsRUFBRSxXQUFXLEtBQUssQ0FBQztBQUU1QyxRQUFNQSxJQUFHLFVBQVUsY0FBYyxXQUFXO0FBRTVDLFNBQU8sWUFBWSxVQUFVLGlCQUFpQixRQUFRLENBQUM7QUFDekQ7OztBRXRKMFYsT0FBT0MsU0FBUTtBQUN6VyxPQUFPQyxXQUFVO0FBc0VqQixJQUFNLGlCQUFpQjtBQUVoQixJQUFNLDBCQUF5QztBQUFBLEVBQ3BELG9CQUFvQjtBQUFBLEVBQ3BCLGdCQUFnQjtBQUFBLEVBQ2hCLGlCQUFpQjtBQUFBLEVBQ2pCLGdCQUFnQjtBQUFBLEVBQ2hCLGVBQWU7QUFBQSxFQUNmLGdCQUFnQjtBQUFBLEVBQ2hCLGlCQUFpQjtBQUFBLEVBQ2pCLGdCQUFnQjtBQUFBLEVBQ2hCLGtCQUFrQjtBQUFBLEVBQ2xCLGdCQUFnQjtBQUFBLEVBQ2hCLGlCQUFpQjtBQUFBLEVBQ2pCLGdCQUFnQjtBQUFBLEVBQ2hCLHFCQUFxQjtBQUFBLEVBQ3JCLGFBQWE7QUFBQSxFQUNiLGFBQWE7QUFBQSxFQUNiLGlCQUFpQjtBQUFBLEVBQ2pCLGtCQUFrQjtBQUFBLEVBQ2xCLG1CQUFtQjtBQUFBLEVBQ25CLHVCQUF1QjtBQUFBLEVBQ3ZCLGtCQUFrQjtBQUFBLEVBQ2xCLHFCQUFxQjtBQUFBLEVBQ3JCLG1CQUFtQjtBQUFBLEVBQ25CLGFBQWE7QUFBQSxFQUNiLGtCQUFrQjtBQUFBLEVBQ2xCLHVCQUF1QjtBQUFBLEVBQ3ZCLG1CQUFtQjtBQUFBLEVBQ25CLG9CQUFvQjtBQUFBLEVBQ3BCLHNCQUFzQjtBQUFBLEVBQ3RCLHNCQUFzQjtBQUFBLEVBQ3RCLGlCQUFpQjtBQUFBLEVBQ2pCLGlCQUFpQjtBQUFBLEVBQ2pCLHVCQUF1QjtBQUFBLEVBQ3ZCLG9CQUFvQjtBQUFBLEVBQ3BCLGNBQWM7QUFBQSxFQUNkLG1CQUFtQjtBQUFBLEVBQ25CLHdCQUF3QjtBQUFBLEVBQ3hCLHNCQUFzQjtBQUFBLEVBQ3RCLG9CQUFvQjtBQUFBLEVBQ3BCLFlBQVk7QUFBQSxFQUNaLE9BQU87QUFBQSxFQUNQLFVBQVU7QUFBQSxFQUNWLGtCQUFrQjtBQUFBLEVBQ2xCLGFBQWE7QUFBQSxFQUNiLG1CQUFtQjtBQUFBLEVBQ25CLG1CQUFtQjtBQUFBLEVBQ25CLGNBQWM7QUFBQSxFQUNkLFlBQVk7QUFBQSxFQUNaLFlBQVk7QUFBQSxFQUNaLG1CQUFtQjtBQUFBLEVBQ25CLGNBQWM7QUFBQSxFQUNkLGNBQWM7QUFBQSxFQUNkLGVBQWU7QUFBQSxFQUNmLGNBQWM7QUFBQSxFQUNkLGdCQUFnQjtBQUFBLEVBQ2hCLGFBQWE7QUFBQSxFQUNiLGFBQWE7QUFBQSxFQUNiLGVBQWU7QUFBQSxFQUNmLGdCQUFnQjtBQUFBLEVBQ2hCLGVBQWU7QUFBQSxFQUNmLGFBQWE7QUFBQSxFQUNiLG1CQUFtQjtBQUFBLEVBQ25CLFlBQVk7QUFBQSxFQUNaLGFBQWE7QUFBQSxFQUNiLFlBQVk7QUFDZDtBQUVBLElBQU0sWUFBWSxPQUFPLEtBQUssdUJBQXVCO0FBRXJELFNBQVMsZ0JBQWdCLGdCQUFnQztBQUN2RCxTQUFPQyxNQUFLLFFBQVEsZ0JBQWdCLGNBQWM7QUFDcEQ7QUFFQSxTQUFTLGNBQWMsS0FBNkI7QUFDbEQsUUFBTSxPQUFzQixFQUFFLEdBQUcsd0JBQXdCO0FBQ3pELE1BQUksQ0FBQyxPQUFPLE9BQU8sUUFBUSxZQUFZLE1BQU0sUUFBUSxHQUFHLEdBQUc7QUFDekQsV0FBTztBQUFBLEVBQ1Q7QUFFQSxhQUFXLE9BQU8sV0FBVztBQUMzQixVQUFNLFFBQVMsSUFBZ0MsR0FBRztBQUNsRCxRQUFJLE9BQU8sVUFBVSxVQUFVO0FBQzdCLFdBQUssR0FBRyxJQUFJO0FBQUEsSUFDZDtBQUFBLEVBQ0Y7QUFFQSxTQUFPO0FBQ1Q7QUFFQSxTQUFTLGFBQWEsTUFBMkI7QUFDL0MsYUFBVyxPQUFPLFdBQVc7QUFDM0IsVUFBTSxRQUFRLEtBQUssR0FBRztBQUN0QixRQUFJLE9BQU8sVUFBVSxVQUFVO0FBQzdCLFlBQU0sSUFBSSxrQkFBa0IsdUJBQXVCLE9BQU8sR0FBRyxDQUFDLEVBQUU7QUFBQSxJQUNsRTtBQUVBLFFBQUksTUFBTSxTQUFTLEtBQUs7QUFDdEIsWUFBTSxJQUFJLGtCQUFrQiwyQkFBMkIsT0FBTyxHQUFHLENBQUMsRUFBRTtBQUFBLElBQ3RFO0FBQUEsRUFDRjtBQUNGO0FBRUEsZUFBc0Isa0JBQWtCLGdCQUFnRDtBQUN0RixRQUFNLFdBQVcsZ0JBQWdCLGNBQWM7QUFFL0MsTUFBSTtBQUNGLFVBQU0sTUFBTSxNQUFNQyxJQUFHLFNBQVMsVUFBVSxNQUFNO0FBQzlDLFdBQU8sY0FBYyxLQUFLLE1BQU0sR0FBRyxDQUFDO0FBQUEsRUFDdEMsU0FBUyxPQUFPO0FBQ2QsVUFBTSxPQUFRLE1BQWdDO0FBQzlDLFFBQUksU0FBUyxVQUFVO0FBQ3JCLGFBQU8sRUFBRSxHQUFHLHdCQUF3QjtBQUFBLElBQ3RDO0FBQ0EsVUFBTTtBQUFBLEVBQ1I7QUFDRjtBQUVBLGVBQXNCLG1CQUFtQixnQkFBd0IsU0FBMEM7QUFDekcsUUFBTSxhQUFhLGNBQWMsT0FBTztBQUN4QyxlQUFhLFVBQVU7QUFFdkIsUUFBTSxXQUFXLGdCQUFnQixjQUFjO0FBQy9DLFFBQU1BLElBQUcsTUFBTSxnQkFBZ0IsRUFBRSxXQUFXLEtBQUssQ0FBQztBQUNsRCxRQUFNQSxJQUFHLFVBQVUsVUFBVSxHQUFHLEtBQUssVUFBVSxZQUFZLE1BQU0sQ0FBQyxDQUFDO0FBQUEsR0FBTSxNQUFNO0FBQy9FLFNBQU87QUFDVDs7O0FDdE1vVixPQUFPQyxXQUFVO0FBR3JXLElBQU0sa0JBQWtCO0FBQ3hCLElBQU0sMEJBQTBCLEtBQUssT0FBTztBQWlCNUMsU0FBUyxlQUFlLFVBQTBCO0FBQ2hELFNBQU8sU0FDSixNQUFNLEdBQUcsRUFDVCxPQUFPLE9BQU8sRUFDZCxJQUFJLENBQUMsWUFBWSxtQkFBbUIsT0FBTyxDQUFDLEVBQzVDLEtBQUssR0FBRztBQUNiO0FBRUEsU0FBUyxtQkFBaUM7QUFDeEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxtQkFBbUIsS0FBSyxLQUFLLFFBQVEsSUFBSSxjQUFjLEtBQUssS0FBSztBQUMzRixRQUFNLFFBQVEsUUFBUSxJQUFJLG1CQUFtQixLQUFLLEtBQUs7QUFDdkQsUUFBTSxPQUFPLFFBQVEsSUFBSSxrQkFBa0IsS0FBSyxLQUFLO0FBQ3JELFFBQU0sU0FBUyxRQUFRLElBQUksb0JBQW9CLEtBQUssS0FBSztBQUN6RCxRQUFNLFdBQVcsUUFBUSxJQUFJLHVCQUF1QixLQUFLLEtBQUs7QUFFOUQsTUFBSSxDQUFDLE9BQU87QUFDVixVQUFNLElBQUksa0JBQWtCLGtEQUFrRCxHQUFHO0FBQUEsRUFDbkY7QUFDQSxNQUFJLENBQUMsU0FBUyxDQUFDLE1BQU07QUFDbkIsVUFBTSxJQUFJLGtCQUFrQiw4REFBOEQsR0FBRztBQUFBLEVBQy9GO0FBRUEsU0FBTyxFQUFFLE9BQU8sT0FBTyxNQUFNLFFBQVEsU0FBUztBQUNoRDtBQUVBLFNBQVNDLGtCQUFpQixVQUEwQjtBQUNsRCxNQUFJLENBQUMsWUFBWSxPQUFPLGFBQWEsVUFBVTtBQUM3QyxVQUFNLElBQUksa0JBQWtCLG1CQUFtQjtBQUFBLEVBQ2pEO0FBRUEsUUFBTSxRQUFRQyxNQUFLLFNBQVMsU0FBUyxLQUFLLENBQUM7QUFDM0MsTUFBSSxDQUFDLFNBQVMsVUFBVSxTQUFTLEtBQUssS0FBSyxNQUFNLFdBQVcsR0FBRyxHQUFHO0FBQ2hFLFVBQU0sSUFBSSxrQkFBa0IsbUJBQW1CO0FBQUEsRUFDakQ7QUFFQSxTQUFPO0FBQ1Q7QUFFQSxTQUFTLG1CQUFtQixVQUFrQixNQUF1QjtBQUNuRSxRQUFNLE9BQU8sOEJBQThCLFFBQVE7QUFDbkQsUUFBTSxZQUFZLE9BQU8sU0FBUyxXQUFXLEtBQUssS0FBSyxJQUFJO0FBQzNELE1BQUksQ0FBQyxXQUFXO0FBQ2QsV0FBTztBQUFBLEVBQ1Q7QUFDQSxTQUFPLEdBQUcsSUFBSSxLQUFLLFVBQVUsTUFBTSxHQUFHLEdBQUcsQ0FBQztBQUM1QztBQUVBLGVBQWUsY0FBYyxLQUFhLE9BQWUsT0FBb0IsQ0FBQyxHQUFzQjtBQUNsRyxTQUFPLE1BQU0sS0FBSztBQUFBLElBQ2hCLEdBQUc7QUFBQSxJQUNILFNBQVM7QUFBQSxNQUNQLFFBQVE7QUFBQSxNQUNSLGVBQWUsVUFBVSxLQUFLO0FBQUEsTUFDOUIsd0JBQXdCO0FBQUEsTUFDeEIsR0FBSSxLQUFLLFdBQVcsQ0FBQztBQUFBLElBQ3ZCO0FBQUEsRUFDRixDQUFDO0FBQ0g7QUFFQSxlQUFlLGVBQWUsVUFBcUM7QUFDakUsTUFBSTtBQUNGLFVBQU0sVUFBVyxNQUFNLFNBQVMsS0FBSztBQUNyQyxRQUFJLFNBQVMsU0FBUztBQUNwQixhQUFPLFFBQVE7QUFBQSxJQUNqQjtBQUFBLEVBQ0YsUUFBUTtBQUFBLEVBRVI7QUFDQSxTQUFPLFNBQVMsY0FBYztBQUNoQztBQUVBLGVBQXNCLG1CQUNwQixVQUNBLGVBQ0EsTUFDK0I7QUFDL0IsUUFBTSxTQUFTLGlCQUFpQjtBQUNoQyxRQUFNLGVBQWVELGtCQUFpQixRQUFRO0FBQzlDLFFBQU0sVUFBVSxvQkFBb0IsZUFBZSx1QkFBdUIsRUFBRSxTQUFTLFFBQVE7QUFDN0YsUUFBTSxhQUFhQyxNQUFLLE1BQU0sS0FBSyxPQUFPLFNBQVMsTUFBTUEsTUFBSyxHQUFHLEVBQUUsS0FBSyxHQUFHLEdBQUcsWUFBWTtBQUMxRixRQUFNLGNBQWMsZUFBZSxVQUFVO0FBQzdDLFFBQU0sYUFBYSxHQUFHLGVBQWUsVUFBVSxtQkFBbUIsT0FBTyxLQUFLLENBQUMsSUFBSSxtQkFBbUIsT0FBTyxJQUFJLENBQUMsYUFBYSxXQUFXO0FBRTFJLE1BQUk7QUFDSixRQUFNLGNBQWMsTUFBTSxjQUFjLEdBQUcsVUFBVSxRQUFRLG1CQUFtQixPQUFPLE1BQU0sQ0FBQyxJQUFJLE9BQU8sS0FBSztBQUM5RyxNQUFJLFlBQVksV0FBVyxLQUFLO0FBQzlCLFVBQU0sT0FBUSxNQUFNLFlBQVksS0FBSztBQUNyQyxVQUFNLE9BQU8sS0FBSyxRQUFRLFdBQVcsS0FBSyxNQUFNO0FBQUEsRUFDbEQsV0FBVyxZQUFZLFdBQVcsS0FBSztBQUNyQyxVQUFNLFNBQVMsTUFBTSxlQUFlLFdBQVc7QUFDL0MsVUFBTSxJQUFJLGtCQUFrQix5QkFBeUIsTUFBTSxJQUFJLEdBQUc7QUFBQSxFQUNwRTtBQUVBLFFBQU0sVUFBVTtBQUFBLElBQ2QsU0FBUyxtQkFBbUIsY0FBYyxJQUFJO0FBQUEsSUFDOUM7QUFBQSxJQUNBLFFBQVEsT0FBTztBQUFBLElBQ2YsR0FBSSxNQUFNLEVBQUUsSUFBSSxJQUFJLENBQUM7QUFBQSxFQUN2QjtBQUVBLFFBQU0sY0FBYyxNQUFNLGNBQWMsWUFBWSxPQUFPLE9BQU87QUFBQSxJQUNoRSxRQUFRO0FBQUEsSUFDUixTQUFTLEVBQUUsZ0JBQWdCLG1CQUFtQjtBQUFBLElBQzlDLE1BQU0sS0FBSyxVQUFVLE9BQU87QUFBQSxFQUM5QixDQUFDO0FBRUQsTUFBSSxDQUFDLFlBQVksSUFBSTtBQUNuQixVQUFNLFNBQVMsTUFBTSxlQUFlLFdBQVc7QUFDL0MsVUFBTSxJQUFJLGtCQUFrQix5QkFBeUIsTUFBTSxJQUFJLEdBQUc7QUFBQSxFQUNwRTtBQUVBLFFBQU0sYUFBYyxNQUFNLFlBQVksS0FBSztBQUszQyxRQUFNLFlBQVksV0FBVyxRQUFRO0FBQ3JDLFFBQU0sWUFBWSxXQUFXLFFBQVE7QUFDckMsTUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXO0FBQzVCLFVBQU0sSUFBSSxrQkFBa0IsaURBQWlELEdBQUc7QUFBQSxFQUNsRjtBQUVBLFNBQU87QUFBQSxJQUNMLFFBQVEsT0FBTztBQUFBLElBQ2Y7QUFBQSxJQUNBO0FBQUEsSUFDQSxNQUFNLFdBQVcsU0FBUyxRQUFRO0FBQUEsRUFDcEM7QUFDRjs7O0FKckpBLElBQU0sbUNBQW1DO0FBaUJ6QyxJQUFNLHdCQUF3QixNQUFNLE9BQU87QUFFM0MsU0FBUyxVQUFVLEtBQXFCLFlBQW9CLFNBQWtCO0FBQzVFLE1BQUksYUFBYTtBQUNqQixNQUFJLFVBQVUsZ0JBQWdCLGtCQUFrQjtBQUNoRCxNQUFJLElBQUksS0FBSyxVQUFVLE9BQU8sQ0FBQztBQUNqQztBQUVBLGVBQWUsYUFBYSxLQUF3RDtBQUNsRixRQUFNLFNBQW1CLENBQUM7QUFDMUIsTUFBSSxhQUFhO0FBRWpCLG1CQUFpQixTQUFTLEtBQUs7QUFDN0IsVUFBTSxjQUFjLE9BQU8sU0FBUyxLQUFLLElBQUksUUFBUSxPQUFPLEtBQUssS0FBSztBQUN0RSxrQkFBYyxZQUFZO0FBQzFCLFFBQUksYUFBYSx1QkFBdUI7QUFDdEMsWUFBTSxJQUFJLGtCQUFrQixpQ0FBaUMsR0FBRztBQUFBLElBQ2xFO0FBQ0EsV0FBTyxLQUFLLFdBQVc7QUFBQSxFQUN6QjtBQUVBLE1BQUksT0FBTyxXQUFXLEdBQUc7QUFDdkIsV0FBTyxDQUFDO0FBQUEsRUFDVjtBQUVBLE1BQUk7QUFDRixXQUFPLEtBQUssTUFBTSxPQUFPLE9BQU8sTUFBTSxFQUFFLFNBQVMsTUFBTSxDQUFDO0FBQUEsRUFDMUQsUUFBUTtBQUNOLFVBQU0sSUFBSSxrQkFBa0IsdUJBQXVCO0FBQUEsRUFDckQ7QUFDRjtBQUVBLFNBQVMsaUJBQWlCO0FBQ3hCLFFBQU0sVUFBVTtBQUNoQixRQUFNLGlCQUFpQkMsTUFBSyxRQUFRLFNBQVMsVUFBVSxVQUFVLFFBQVE7QUFDekUsUUFBTSxhQUFhLFFBQVEsSUFBSSxtQkFBbUIsS0FBSyxLQUFLO0FBRTVELFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLGdCQUFnQixRQUE0STtBQUMxSixhQUFPLFlBQVksSUFBSSxPQUFPLEtBQUssS0FBSyxTQUFTO0FBQy9DLGNBQU0sY0FBYyxJQUFJLEtBQUssTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLO0FBQzlDLFlBQUksSUFBSSxXQUFXLFNBQVMsZ0JBQWdCLHlCQUF5QjtBQUNuRSxjQUFJO0FBQ0Ysa0JBQU0sT0FBTyxNQUFNLGtCQUFrQixjQUFjO0FBQ25ELHNCQUFVLEtBQUssS0FBSyxFQUFFLEtBQUssQ0FBQztBQUFBLFVBQzlCLFNBQVMsT0FBTztBQUNkLGtCQUFNLFVBQVUsaUJBQWlCLFFBQVEsTUFBTSxVQUFVO0FBQ3pELHNCQUFVLEtBQUssS0FBSyxFQUFFLE9BQU8sUUFBUSxDQUFDO0FBQUEsVUFDeEM7QUFDQTtBQUFBLFFBQ0Y7QUFFQSxjQUFNLGtCQUNKLGdCQUFnQixpQkFDaEIsZ0JBQWdCLHlCQUNoQixnQkFBZ0Isd0JBQ2hCLGdCQUFnQixzQkFDaEIsZ0JBQWdCO0FBRWxCLFlBQUksaUJBQWlCO0FBQ25CLGNBQUksQ0FBQyxZQUFZO0FBQ2Ysc0JBQVUsS0FBSyxLQUFLLEVBQUUsT0FBTyxpREFBaUQsQ0FBQztBQUMvRTtBQUFBLFVBQ0Y7QUFFQSxnQkFBTSxhQUFhLElBQUksUUFBUSxxQkFBcUI7QUFDcEQsZ0JBQU0sZ0JBQWdCLE1BQU0sUUFBUSxVQUFVLElBQUksV0FBVyxDQUFDLElBQUk7QUFDbEUsY0FBSSxrQkFBa0IsWUFBWTtBQUNoQyxzQkFBVSxLQUFLLEtBQUssRUFBRSxPQUFPLHVCQUF1QixDQUFDO0FBQ3JEO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFFQSxZQUFJLElBQUksV0FBVyxTQUFTLGdCQUFnQixlQUFlO0FBQ3pELGNBQUk7QUFDRixrQkFBTSxTQUFTLE1BQU0sd0JBQXdCLGNBQWM7QUFDM0Qsa0JBQU0sWUFBWSxNQUFNLG1CQUFtQixjQUFjO0FBQ3pELGtCQUFNLG1CQUFtQixPQUFPLElBQUksQ0FBQyxXQUFXO0FBQUEsY0FDOUMsR0FBRztBQUFBLGNBQ0gsUUFBUSxvQkFBb0IsV0FBVyxNQUFNLFFBQVE7QUFBQSxZQUN2RCxFQUFFO0FBQ0Ysc0JBQVUsS0FBSyxLQUFLLEVBQUUsUUFBUSxrQkFBa0IsVUFBVSxNQUFNLENBQUM7QUFBQSxVQUNuRSxTQUFTLE9BQU87QUFDZCxrQkFBTSxVQUFVLGlCQUFpQixRQUFRLE1BQU0sVUFBVTtBQUN6RCxzQkFBVSxLQUFLLEtBQUssRUFBRSxPQUFPLFFBQVEsQ0FBQztBQUFBLFVBQ3hDO0FBQ0E7QUFBQSxRQUNGO0FBRUEsWUFBSSxJQUFJLFdBQVcsVUFBVSxnQkFBZ0IsdUJBQXVCO0FBQ2xFLGNBQUk7QUFDRixrQkFBTSxPQUFPLE1BQU0sYUFBYSxHQUFHO0FBQ25DLGtCQUFNLFdBQVcsT0FBTyxLQUFLLGFBQWEsV0FBVyxLQUFLLFdBQVc7QUFDckUsa0JBQU0sZ0JBQWdCLE9BQU8sS0FBSyxrQkFBa0IsV0FBVyxLQUFLLGdCQUFnQjtBQUNwRixrQkFBTSxjQUFjLG9CQUFvQixhQUFhO0FBRXJELGtCQUFNLFFBQVEsTUFBTSx3QkFBd0IsZ0JBQWdCLFVBQVUsV0FBVztBQUNqRixzQkFBVSxLQUFLLEtBQUssRUFBRSxNQUFNLENBQUM7QUFBQSxVQUMvQixTQUFTLE9BQU87QUFDZCxnQkFBSSxpQkFBaUIsbUJBQW1CO0FBQ3RDLHdCQUFVLEtBQUssTUFBTSxZQUFZLEVBQUUsT0FBTyxNQUFNLFFBQVEsQ0FBQztBQUN6RDtBQUFBLFlBQ0Y7QUFFQSxrQkFBTSxVQUFVLGlCQUFpQixRQUFRLE1BQU0sVUFBVTtBQUN6RCxzQkFBVSxLQUFLLEtBQUssRUFBRSxPQUFPLFFBQVEsQ0FBQztBQUFBLFVBQ3hDO0FBQ0E7QUFBQSxRQUNGO0FBRUEsWUFBSSxJQUFJLFdBQVcsVUFBVSxnQkFBZ0IsMkJBQTJCO0FBQ3RFLGNBQUk7QUFDRixrQkFBTSxPQUFPLE1BQU0sYUFBYSxHQUFHO0FBQ25DLGtCQUFNLFdBQVcsT0FBTyxLQUFLLGFBQWEsV0FBVyxLQUFLLFdBQVc7QUFDckUsa0JBQU0sZ0JBQWdCLE9BQU8sS0FBSyxrQkFBa0IsV0FBVyxLQUFLLGdCQUFnQjtBQUNwRixrQkFBTSxPQUFPLE9BQU8sS0FBSyxTQUFTLFdBQVcsS0FBSyxPQUFPO0FBQ3pELGtCQUFNLFNBQVMsTUFBTSxtQkFBbUIsVUFBVSxlQUFlLElBQUk7QUFDckUsc0JBQVUsS0FBSyxLQUFLLE1BQU07QUFBQSxVQUM1QixTQUFTLE9BQU87QUFDZCxnQkFBSSxpQkFBaUIsbUJBQW1CO0FBQ3RDLHdCQUFVLEtBQUssTUFBTSxZQUFZLEVBQUUsT0FBTyxNQUFNLFFBQVEsQ0FBQztBQUN6RDtBQUFBLFlBQ0Y7QUFFQSxrQkFBTSxVQUFVLGlCQUFpQixRQUFRLE1BQU0sVUFBVTtBQUN6RCxzQkFBVSxLQUFLLEtBQUssRUFBRSxPQUFPLFFBQVEsQ0FBQztBQUFBLFVBQ3hDO0FBQ0E7QUFBQSxRQUNGO0FBRUEsWUFBSSxJQUFJLFdBQVcsVUFBVSxnQkFBZ0Isc0JBQXNCO0FBQ2pFLGNBQUk7QUFDRixrQkFBTSxPQUFPLE1BQU0sYUFBYSxHQUFHO0FBQ25DLGtCQUFNLFdBQVcsT0FBTyxLQUFLLGFBQWEsV0FBVyxLQUFLLFdBQVc7QUFDckUsa0JBQU0sU0FBUyxLQUFLLFdBQVcsWUFBWSxLQUFLLFdBQVcsWUFBWSxLQUFLLFNBQVM7QUFFckYsZ0JBQUksQ0FBQyxRQUFRO0FBQ1gsb0JBQU0sSUFBSSxrQkFBa0IsdUJBQXVCO0FBQUEsWUFDckQ7QUFFQSxrQkFBTSxnQkFBZ0IsTUFBTSxvQkFBb0IsZ0JBQWdCLFVBQVUsTUFBTTtBQUNoRixzQkFBVSxLQUFLLEtBQUssRUFBRSxVQUFVLFFBQVEsY0FBYyxDQUFDO0FBQUEsVUFDekQsU0FBUyxPQUFPO0FBQ2QsZ0JBQUksaUJBQWlCLG1CQUFtQjtBQUN0Qyx3QkFBVSxLQUFLLE1BQU0sWUFBWSxFQUFFLE9BQU8sTUFBTSxRQUFRLENBQUM7QUFDekQ7QUFBQSxZQUNGO0FBRUEsa0JBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVU7QUFDekQsc0JBQVUsS0FBSyxLQUFLLEVBQUUsT0FBTyxRQUFRLENBQUM7QUFBQSxVQUN4QztBQUNBO0FBQUEsUUFDRjtBQUVBLFlBQUksSUFBSSxXQUFXLFNBQVMsZ0JBQWdCLG9CQUFvQjtBQUM5RCxjQUFJO0FBQ0Ysa0JBQU0sT0FBTyxNQUFNLGtCQUFrQixjQUFjO0FBQ25ELHNCQUFVLEtBQUssS0FBSyxFQUFFLE1BQU0sVUFBVSxNQUFNLENBQUM7QUFBQSxVQUMvQyxTQUFTLE9BQU87QUFDZCxrQkFBTSxVQUFVLGlCQUFpQixRQUFRLE1BQU0sVUFBVTtBQUN6RCxzQkFBVSxLQUFLLEtBQUssRUFBRSxPQUFPLFFBQVEsQ0FBQztBQUFBLFVBQ3hDO0FBQ0E7QUFBQSxRQUNGO0FBRUEsWUFBSSxJQUFJLFdBQVcsVUFBVSxnQkFBZ0Isb0JBQW9CO0FBQy9ELGNBQUk7QUFDRixrQkFBTSxPQUFPLE1BQU0sYUFBYSxHQUFHO0FBQ25DLGtCQUFNLE9BQU8sTUFBTSxtQkFBbUIsZ0JBQWdCLEtBQUssSUFBSTtBQUMvRCxzQkFBVSxLQUFLLEtBQUssRUFBRSxNQUFNLFVBQVUsTUFBTSxDQUFDO0FBQUEsVUFDL0MsU0FBUyxPQUFPO0FBQ2QsZ0JBQUksaUJBQWlCLG1CQUFtQjtBQUN0Qyx3QkFBVSxLQUFLLE1BQU0sWUFBWSxFQUFFLE9BQU8sTUFBTSxRQUFRLENBQUM7QUFDekQ7QUFBQSxZQUNGO0FBRUEsa0JBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVU7QUFDekQsc0JBQVUsS0FBSyxLQUFLLEVBQUUsT0FBTyxRQUFRLENBQUM7QUFBQSxVQUN4QztBQUNBO0FBQUEsUUFDRjtBQUVBLGFBQUs7QUFBQSxNQUNQLENBQUM7QUFBQSxJQUNIO0FBQUEsRUFDRjtBQUNGO0FBRUEsSUFBTSxVQUFVLENBQUMsTUFBTSxHQUFHLFlBQVksR0FBRyxhQUFhLEdBQUcsdUJBQXVCLEdBQUcsZUFBZSxDQUFDO0FBRW5HLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLQSxNQUFLLFFBQVEsa0NBQXFCLFVBQVUsS0FBSztBQUFBLE1BQ3RELFdBQVdBLE1BQUssUUFBUSxrQ0FBcUIsUUFBUTtBQUFBLE1BQ3JELFdBQVdBLE1BQUssUUFBUSxrQ0FBcUIsaUJBQWlCO0FBQUEsSUFDaEU7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRQSxNQUFLLFFBQVEsZ0NBQW1CO0FBQUEsRUFDeEMsTUFBTUEsTUFBSyxRQUFRLGtDQUFxQixRQUFRO0FBQUEsRUFDaEQsT0FBTztBQUFBLElBQ0wsUUFBUUEsTUFBSyxRQUFRLGtDQUFxQixhQUFhO0FBQUEsSUFDdkQsYUFBYTtBQUFBLEVBQ2Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQTtBQUFBLElBQ1osTUFBTTtBQUFBLElBQ04sY0FBYztBQUFBLE1BQ1o7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQSxJQUFJO0FBQUEsTUFDRixRQUFRO0FBQUEsTUFDUixNQUFNLENBQUMsT0FBTztBQUFBLElBQ2hCO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiLCAiZnMiLCAicGF0aCIsICJwYXRoIiwgInBhdGgiLCAiZnMiLCAicGF0aCIsICJmcyIsICJwYXRoIiwgImZzIiwgImZzIiwgInBhdGgiLCAicGF0aCIsICJmcyIsICJwYXRoIiwgInZhbGlkYXRlRmlsZW5hbWUiLCAicGF0aCIsICJwYXRoIl0KfQo=
