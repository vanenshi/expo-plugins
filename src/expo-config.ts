// Augments the Expo config types with the custom `android.appName` field that
// `withAndroidCustomAppName` reads. Importing this package applies it, so
// `android: { appName: "..." }` type-checks in your app config.
import "@expo/config-types";

declare module "@expo/config-types" {
  interface Android {
    /** Custom Android display name, written to `strings.xml` by `withAndroidCustomAppName`. */
    appName?: string;
  }
}
