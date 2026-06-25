import { ConfigPlugin, createRunOncePlugin } from "expo/config-plugins";
import fs from "node:fs";

import { discoverPackage } from "./discovery";
import { createLogger } from "../utils/logger";

const logger = createLogger("@vanenshi/expo-plugins/google-fonts");

const pkg = require("../../package.json");

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
          logger.warn(
            `${fontFamily} weight ${weight}${
              style === "italic" ? " italic" : ""
            } not found in @expo-google-fonts/${spec.packageName}.`
          );
        }
        continue;
      }
      if (!fs.existsSync(face.absPath)) {
        if (warnOnMissing) {
          logger.warn(`${fontFamily} file missing: ${face.absPath}`);
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
        logger.warn(
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

export interface ExpoGoogleFontsProps {
  fonts?: GoogleFontSpec[];
  projectRoot?: string;
  warnOnMissing?: boolean;
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
const withExpoGoogleFonts: ConfigPlugin<ExpoGoogleFontsProps> = (
  config,
  props
) => {
  if (!props?.fonts?.length) return config;

  const options = buildExpoGoogleFontsOptions(
    props as BuildExpoFontPluginOptionsInput
  );

  const withFonts = require("expo-font/app.plugin").default;
  return withFonts(config, options);
};

export default createRunOncePlugin(
  withExpoGoogleFonts,
  "@vanenshi/expo-plugins/google-fonts",
  pkg.version
);
