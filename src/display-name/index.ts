import {
  ConfigPlugin,
  createRunOncePlugin,
  withInfoPlist,
  withStringsXml,
} from "expo/config-plugins";
import { createLogger } from "../utils/logger";

const logger = createLogger("@vanenshi/expo-plugins/display-name");

const pkg = require("../../package.json");

export interface DisplayNameProps {
  /**
   * Display name shown to users on the home screen. Applied to
   * `CFBundleDisplayName` (iOS) and `app_name` in `strings.xml` (Android).
   * When omitted the plugin is a no-op.
   */
  displayName?: string;
}

/**
 * Sets a custom display name on both iOS and Android without touching the root
 * `name` (which drives bundle structure and internal module naming). Lets you
 * give each build variant (dev, beta, prod) its own user-facing name while
 * keeping internal naming consistent.
 *
 * Underneath:
 * - iOS: sets `CFBundleDisplayName` in `Info.plist` via `withInfoPlist`.
 * - Android: sets `app_name` in `strings.xml` via `withStringsXml`.
 *
 * @example
 * // app.config.ts
 * plugins: [["@vanenshi/expo-plugins/display-name", { displayName: "My App (Beta)" }]]
 */
const withDisplayName: ConfigPlugin<DisplayNameProps | void> = (
  config,
  props,
) => {
  const displayName = props?.displayName;
  if (!displayName) return config;

  // Android
  config = withStringsXml(config, (modConfig) => {
    if (modConfig.name) {
      logger.warnAndroid(
        `displayName is set — ignoring abstract "name": ${modConfig.name}`,
      );
    }

    const strings = modConfig.modResults.resources.string ?? [];
    const entry = strings.find((item) => item.$.name === "app_name");

    if (entry) {
      entry._ = displayName;
    } else {
      strings.push({ $: { name: "app_name" }, _: displayName });
      modConfig.modResults.resources.string = strings;
    }

    return modConfig;
  });

  // iOS
  config = withInfoPlist(config, (modConfig) => {
    if (modConfig.name) {
      logger.warnIOS(
        `displayName is set — ignoring abstract "name": ${modConfig.name}`,
      );
    }

    modConfig.modResults.CFBundleDisplayName = displayName;
    return modConfig;
  });

  return config;
};

export default createRunOncePlugin(
  withDisplayName,
  "@vanenshi/expo-plugins/display-name",
  pkg.version,
);
