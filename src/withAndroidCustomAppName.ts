import { ConfigPlugin, withStringsXml } from "expo/config-plugins";

export interface AndroidCustomAppNameProps {
  /**
   * Display name to write to `app_name` in `strings.xml`. When omitted, the
   * plugin reads `android.appName` from the Expo config.
   */
  appName?: string;
}

function warn(message: string) {
  console.warn(`\x1b[33m⚠ android-custom-app-name: ${message}\x1b[0m`);
}

/**
 * Sets a custom Android display name via the `app_name` string resource without
 * touching the root `name` (which drives bundle structure / internal module
 * naming). Lets you give each build variant (dev, beta, prod) its own
 * user-facing name while keeping internal naming consistent.
 *
 * Reads the name from the plugin options, falling back to `android.appName` in
 * the Expo config.
 *
 * @example
 * // app.config.ts
 * android: { appName: "AppName (Beta)", package: "com.appname.beta" }
 * plugins: ["@vanenshi/expo-plugins/android-custom-app-name"]
 */
const withAndroidCustomAppName: ConfigPlugin<
  AndroidCustomAppNameProps | void
> = (config, props) => {
  return withStringsXml(config, (modConfig) => {
    // `appName` is a custom, non-standard field on the Android config.
    const appName =
      props?.appName ?? (modConfig.android as { appName?: string })?.appName;
    if (!appName) return modConfig;

    if (modConfig.name) {
      warn(
        `config.android.appName is set — ignoring abstract "name": ${modConfig.name}`
      );
    }

    const strings = modConfig.modResults.resources.string ?? [];
    const entry = strings.find((item) => item.$.name === "app_name");

    if (entry) {
      entry._ = appName;
    } else {
      strings.push({ $: { name: "app_name" }, _: appName });
      modConfig.modResults.resources.string = strings;
    }

    return modConfig;
  });
};

export default withAndroidCustomAppName;
