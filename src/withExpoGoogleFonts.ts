import { ConfigPlugin } from "expo/config-plugins";
import fs from "node:fs";
import path from "node:path";

type FontStyle = "normal" | "italic";

export interface GoogleFontSpec {
  packageName: string;
  /** `fontFamily` style prop value — defaults to `metadata.json` family (e.g. `"Roboto"`). */
  fontFamily?: string;
  weights?: number[];
  importItalic?: boolean;
}

export interface BuildExpoFontPluginOptionsInput {
  fonts: GoogleFontSpec[];
  projectRoot?: string;
  warnOnMissing?: boolean;
}

interface ExpoFontPluginOptions {
  android: {
    fonts: {
      fontFamily: string;
      fontDefinitions: { path: string; weight: number; style?: "italic" }[];
    }[];
  };
  ios: { fonts: string[] };
}

const TTF_REQUIRE_RE = /require\('\.\/([^']+\.ttf)'\)/g;

const FOLDER_TO_WEIGHT: Record<string, number> = {
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

function warn(message: string) {
  console.warn(`\x1b[33m⚠ expo-google-fonts: ${message}\x1b[0m`);
}

function parseFolder(
  folder: string
): { weight: number; style: FontStyle } | null {
  const italic = folder.endsWith("_Italic");
  const base = italic ? folder.slice(0, -"_Italic".length) : folder;
  if (!(base in FOLDER_TO_WEIGHT)) return null;
  const weight = FOLDER_TO_WEIGHT[base] ?? 400;
  return { weight, style: italic ? "italic" : "normal" };
}

function discoverPackage(
  packageName: string,
  projectRoot: string,
  warnOnMissing: boolean
) {
  let pkgDir: string;
  try {
    pkgDir = path.dirname(
      require.resolve(`@expo-google-fonts/${packageName}/package.json`, {
        paths: [projectRoot],
      })
    );
  } catch {
    if (warnOnMissing) {
      warn(
        `@expo-google-fonts/${packageName} is not installed — run \`npx expo install @expo-google-fonts/${packageName}\`.`
      );
    }
    return null;
  }

  const metadataPath = path.join(pkgDir, "metadata.json");
  const indexPath = path.join(pkgDir, "index.js");
  if (!fs.existsSync(metadataPath) || !fs.existsSync(indexPath)) {
    if (warnOnMissing) {
      warn(
        `@expo-google-fonts/${packageName} is missing metadata.json or index.js.`
      );
    }
    return null;
  }

  const { family } = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as {
    family: string;
  };
  const faces = new Map<
    string,
    { path: string; absPath: string; weight: number; style: FontStyle }
  >();

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
 * Builds the `expo-font` plugin options from installed `@expo-google-fonts/*`
 * packages — Android uses `fontFamily` + weight/style, iOS embeds the resolved
 * file paths. Use this directly only if you want to pass the options to
 * `expo-font` yourself; most projects should use the {@link withExpoGoogleFonts}
 * config plugin instead.
 */
export function buildExpoGoogleFontsOptions({
  fonts,
  projectRoot = process.cwd(),
  warnOnMissing = true,
}: BuildExpoFontPluginOptionsInput): ExpoFontPluginOptions {
  const androidFonts: ExpoFontPluginOptions["android"]["fonts"] = [];
  const iosFonts: string[] = [];

  for (const spec of fonts) {
    const pkg = discoverPackage(spec.packageName, projectRoot, warnOnMissing);
    if (!pkg) continue;

    const fontFamily = spec.fontFamily ?? pkg.fontFamily;
    const weights = spec.weights ?? [400];
    const wanted: { weight: number; style: FontStyle }[] = weights.map(
      (weight) => ({
        weight,
        style: "normal",
      })
    );
    if (spec.importItalic) {
      wanted.push(
        ...weights.map((weight) => ({ weight, style: "italic" as const }))
      );
    }

    const fontDefinitions: ExpoFontPluginOptions["android"]["fonts"][number]["fontDefinitions"] =
      [];

    for (const { weight, style } of wanted) {
      const face = pkg.faces.get(`${weight}:${style}`);
      if (!face) {
        if (warnOnMissing) {
          warn(
            `${fontFamily} weight ${weight}${
              style === "italic" ? " italic" : ""
            } not found in @expo-google-fonts/${spec.packageName}.`
          );
        }
        continue;
      }
      if (!fs.existsSync(face.absPath)) {
        if (warnOnMissing) {
          warn(`${fontFamily} file missing: ${face.absPath}`);
        }
        continue;
      }

      fontDefinitions.push({
        path: face.path,
        weight: face.weight,
        ...(face.style === "italic" ? { style: "italic" as const } : {}),
      });
    }

    if (fontDefinitions.length === 0) {
      if (warnOnMissing) {
        warn(
          `No faces embedded for ${fontFamily} (@expo-google-fonts/${spec.packageName}).`
        );
      }
      continue;
    }

    androidFonts.push({ fontFamily, fontDefinitions });
    iosFonts.push(...fontDefinitions.map((def) => def.path));
  }

  return { android: { fonts: androidFonts }, ios: { fonts: iosFonts } };
}

/**
 * Config plugin that embeds `@expo-google-fonts/*` faces into the native
 * projects. Resolves the requested weights/styles and delegates to `expo-font`,
 * so you don't need a separate `["expo-font", ...]` entry.
 *
 * @example
 * // app.config.ts
 * plugins: [
 *   [
 *     "@vanenshi/expo-plugins/google-fonts",
 *     { fonts: [{ packageName: "roboto", weights: [400, 700], importItalic: true }] },
 *   ],
 * ]
 */
const withExpoGoogleFonts: ConfigPlugin<BuildExpoFontPluginOptionsInput> = (
  config,
  props
) => {
  if (!props?.fonts?.length) return config;

  const options = buildExpoGoogleFontsOptions(props);
  // expo-font ships the real font-embedding plugin; we only resolve the paths.
  const withFonts: ConfigPlugin<ExpoFontPluginOptions> =
    require("expo-font/plugin/build/withFonts").default;

  return withFonts(config, options);
};

export default withExpoGoogleFonts;
