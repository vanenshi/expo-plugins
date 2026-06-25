import fs from "node:fs";
import path from "node:path";

import { createLogger } from "../utils/logger";

const logger = createLogger("@vanenshi/expo-plugins/google-fonts");

type FontStyle = "normal" | "italic";

export interface FontFace {
  path: string;
  absPath: string;
  weight: number;
  style: FontStyle;
}

export interface DiscoveredPackage {
  fontFamily: string;
  faces: Map<string, FontFace>;
}

export const TTF_REQUIRE_RE = /require\(['"]\.\/([^'"]+\.ttf)['"]\)/g;

export const FOLDER_TO_WEIGHT: Record<string, number> = {
  "100Thin": 100,
  "200ExtraLight": 200,
  "300Light": 300,
  "400Regular": 400,
  "500Medium": 500,
  "600SemiBold": 600,
  "700Bold": 700,
  "800ExtraBold": 800,
  "900Black": 900,
};

export function parseFolder(
  folder: string,
): { weight: number; style: FontStyle } | null {
  const italic = folder.endsWith("_Italic");
  const base = italic ? folder.slice(0, -"_Italic".length) : folder;
  if (!(base in FOLDER_TO_WEIGHT)) return null;
  const weight = FOLDER_TO_WEIGHT[base] ?? 400;
  return { weight, style: italic ? "italic" : "normal" };
}

/**
 * Parses an already-resolved `@expo-google-fonts/*` package directory.
 * Pure: no `require.resolve`, no network. Suitable for unit testing with a
 * committed fixture directory.
 */
export function parsePackage(
  pkgDir: string,
  packageName: string,
): DiscoveredPackage | null {
  const metadataPath = path.join(pkgDir, "metadata.json");
  const indexPath = path.join(pkgDir, "index.js");
  if (!fs.existsSync(metadataPath) || !fs.existsSync(indexPath)) {
    logger.warn(
      `@expo-google-fonts/${packageName} is missing metadata.json or index.js.`,
    );
    return null;
  }

  const { family } = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as {
    family: string;
  };
  const faces = new Map<string, FontFace>();

  for (const match of fs
    .readFileSync(indexPath, "utf8")
    .matchAll(TTF_REQUIRE_RE)) {
    const relPath = match[1]!;
    const parsed = parseFolder(path.dirname(relPath));
    if (!parsed) continue;

    faces.set(`${parsed.weight}:${parsed.style}`, {
      ...parsed,
      path: `./node_modules/@expo-google-fonts/${packageName}/${relPath}`,
      absPath: path.join(pkgDir, relPath),
    });
  }

  return { fontFamily: family, faces };
}

/**
 * Resolves the `@expo-google-fonts/<packageName>` package directory via
 * `require.resolve`. This is the only side-effectful seam; keep it thin.
 */
export function resolvePackageDir(
  packageName: string,
  projectRoot: string,
): string | null {
  try {
    return path.dirname(
      require.resolve(`@expo-google-fonts/${packageName}/package.json`, {
        paths: [projectRoot],
      }),
    );
  } catch {
    return null;
  }
}

/**
 * Discovers a Google Fonts package: resolves it then parses its contents.
 * Emits a warning and returns null when the package is missing or malformed.
 */
export function discoverPackage(
  packageName: string,
  projectRoot: string,
  warnOnMissing: boolean,
): DiscoveredPackage | null {
  const pkgDir = resolvePackageDir(packageName, projectRoot);

  if (!pkgDir) {
    if (warnOnMissing) {
      logger.warn(
        `@expo-google-fonts/${packageName} is not installed — run: npx expo install @expo-google-fonts/${packageName}`,
      );
    }
    return null;
  }
  return parsePackage(pkgDir, packageName);
}
