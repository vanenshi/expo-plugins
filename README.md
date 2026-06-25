# @vanenshi/expo-plugins

A small collection of [Expo config plugins](https://docs.expo.dev/config-plugins/introduction/).

## Install

```sh
npx expo install @vanenshi/expo-plugins
```

---

## `withDisplayName`

**Goal:** Give each build variant (dev / beta / prod) its own home-screen
display name on both iOS and Android — without touching the internal root `name`
(which drives bundle structure and forces slow clean rebuilds when changed).

**Underneath:**
- **iOS** — sets `CFBundleDisplayName` in `Info.plist` via `withInfoPlist`.
- **Android** — sets `app_name` in `strings.xml` via `withStringsXml`.

```ts
// app.config.ts
export default {
  name: "MyApp", // internal project name — unchanged
  plugins: [
    ["@vanenshi/expo-plugins/display-name", { displayName: "MyApp (Beta)" }],
  ],
};
```

### Options

| Option        | Type     | Description                                        |
| ------------- | -------- | -------------------------------------------------- |
| `displayName` | `string` | Name shown to users on the home screen (required). |

---

## `withExpoGoogleFonts`

**Goal:** Embed `@expo-google-fonts/*` faces into the native projects without
manually listing every font path in your app config. The plugin reads the
weight/style folder layout from your installed packages, resolves the `.ttf`
file paths, and delegates to `expo-font` — so you only declare _which_ font
families and weights you want.

**Underneath:**
- **Discovery** — walks `@expo-google-fonts/<name>` package folders, parses
  folder names like `400Regular` / `700Bold_Italic`, and collects `.ttf` paths.
- **Delegation** — passes the resolved font manifest to `expo-font/app.plugin`
  (`withFonts`), which handles embedding into both Android assets and iOS
  `Info.plist`.

```sh
npx expo install expo-font @expo-google-fonts/roboto @expo-google-fonts/inter
```

```json
{
  "plugins": [
    [
      "@vanenshi/expo-plugins/google-fonts",
      {
        "fonts": [
          { "packageName": "roboto", "weights": [400, 500, 700], "importItalic": true },
          { "packageName": "inter", "weights": [400, 600] }
        ]
      }
    ]
  ]
}
```

No separate `["expo-font", ...]` entry is needed.

> Need the raw `expo-font` options (e.g. to merge with local fonts)? Import
> `buildExpoGoogleFontsOptions(input)` and pass the result to
> `["expo-font", options]` yourself.

### Options

| Option          | Type               | Default         | Description                                            |
| --------------- | ------------------ | --------------- | ------------------------------------------------------ |
| `fonts`         | `GoogleFontSpec[]` | —               | Fonts to embed (see below).                            |
| `projectRoot`   | `string`           | `process.cwd()` | Where to resolve `@expo-google-fonts/*` packages from. |
| `warnOnMissing` | `boolean`          | `true`          | Warn when a package, weight, or `.ttf` is missing.     |

`GoogleFontSpec`: `{ packageName, fontFamily?, weights?, importItalic? }` —
`weights` defaults to `[400]`, `fontFamily` defaults to the package's metadata
family name.

---

## Development

This package uses [`expo-module-scripts`](https://github.com/expo/expo/tree/main/packages/expo-module-scripts) and follows [`expo/config-plugins`](https://github.com/expo/config-plugins) conventions.

```sh
pnpm install
pnpm run build   # compile src/ → build/
pnpm run lint
pnpm test
```

### Example app

`apps/app` is a minimal Expo app wiring both plugins, used to verify plugins
work end-to-end via `expo prebuild`:

```sh
cd apps/app
npm install
npx expo prebuild --clean
grep "Example (Beta)" android/app/src/main/res/values/strings.xml
grep "CFBundleDisplayName" ios/*/Info.plist
```

See [`apps/app/README.md`](apps/app/README.md) for details.

### Publishing

CI publishes to npm on every **GitHub Release** ([`.github/workflows/publish.yml`](.github/workflows/publish.yml)).
Add an `NPM_TOKEN` repo secret (npm Automation token), then:

```sh
pnpm version <patch|minor|major>
git push --follow-tags
# create a GitHub Release from the new tag — CI builds, tests, and publishes
```

---

## Architecture decisions

See [`docs/adr/`](docs/adr/) for the recorded decisions behind this package's design:
package structure ([ADR-0001](docs/adr/0001-single-package.md)),
toolchain ([ADR-0002](docs/adr/0002-expo-module-scripts.md)),
logging ([ADR-0003](docs/adr/0003-warning-aggregator-logger.md)),
font discovery ([ADR-0004](docs/adr/0004-google-fonts-auto-discovery.md)),
folder-per-plugin layout ([ADR-0005](docs/adr/0005-folder-per-plugin-layout.md)),
and cross-platform display name ([ADR-0006](docs/adr/0006-cross-platform-display-name.md)).
