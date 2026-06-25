# Example app

Minimal Expo app for verifying `@vanenshi/expo-plugins` config plugins via
`expo prebuild`.

## Prebuild smoke check

```bash
cd apps/app
npm install          # or pnpm / yarn
npx expo prebuild --clean
```

Then assert the plugins ran:

```bash
# Android — display name
grep "Example (Beta)" android/app/src/main/res/values/strings.xml

# iOS — display name
grep "CFBundleDisplayName" ios/*/Info.plist
```

Both checks passing means `withDisplayName` applied correctly on both platforms.

> Native `android/` and `ios/` dirs are gitignored — regenerated on demand via prebuild.
