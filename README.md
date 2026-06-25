# @vanenshi/expo-plugins

A small collection of [Expo config plugins](https://docs.expo.dev/config-plugins/introduction/).

## Install

```sh
npx expo install @vanenshi/expo-plugins
```

---

## `withAndroidCustomAppName`

Sets a custom Android **display name** (the `app_name` string resource) without
touching the root `name`. The root `name` drives bundle structure and internal
module naming — this plugin only changes what the user sees on the home screen,
so each build variant (dev / beta / prod) can have its own name.

```ts
// app.config.ts
export default {
  name: "MyApp", // internal name — unchanged
  android: {
    appName: "MyApp (Beta)", // home-screen display name
    package: "com.myapp.beta",
  },
  plugins: ["@vanenshi/expo-plugins/android-custom-app-name"],
};
```

You can also pass the name explicitly instead of reading `android.appName`:

```ts
plugins: [["@vanenshi/expo-plugins/android-custom-app-name", { appName: "MyApp (Beta)" }]];
```

---

## `withExpoGoogleFonts`

Generates the `["expo-font", options]` plugin entry from installed
[`@expo-google-fonts/*`](https://github.com/expo/google-fonts) packages. It
discovers the `.ttf` files for the weights/styles you ask for and wires up both
platforms — Android via `fontFamily` + weight/style, iOS via embedded paths.

```ts
// app.config.ts
import { withExpoGoogleFonts } from "@vanenshi/expo-plugins";

export default {
  name: "MyApp",
  plugins: [
    [
      "expo-font",
      withExpoGoogleFonts({
        fonts: [
          { packageName: "roboto", weights: [400, 500, 700], importItalic: true },
          { packageName: "inter", weights: [400, 600] },
        ],
      }),
    ],
  ],
};
```

Install the font packages you reference:

```sh
npx expo install @expo-google-fonts/roboto @expo-google-fonts/inter
```

### Options

| Option          | Type             | Default          | Description                                             |
| --------------- | ---------------- | ---------------- | ------------------------------------------------------- |
| `fonts`         | `GoogleFontSpec[]` | —              | Fonts to embed (see below).                             |
| `projectRoot`   | `string`         | `process.cwd()`  | Where to resolve `@expo-google-fonts/*` packages from.  |
| `warnOnMissing` | `boolean`        | `true`           | Warn when a package, weight, or `.ttf` is missing.      |

`GoogleFontSpec`: `{ packageName, fontFamily?, weights?, importItalic? }` —
`weights` defaults to `[400]`, `fontFamily` defaults to the package's metadata
family.

---

## Development

This package follows the [`expo/config-plugins`](https://github.com/expo/config-plugins)
conventions and uses [`expo-module-scripts`](https://github.com/expo/expo/tree/main/packages/expo-module-scripts).

```sh
pnpm install
pnpm build   # compile src/ -> build/
pnpm lint
pnpm test
```

### Publishing

CI publishes to npm on every **GitHub Release** ([`.github/workflows/publish.yml`](.github/workflows/publish.yml)).
Add an `NPM_TOKEN` repo secret (npm Automation token), then:

```sh
pnpm version <patch|minor|major>
git push --follow-tags
# create a GitHub Release from the new tag — CI builds, tests, and publishes
```
