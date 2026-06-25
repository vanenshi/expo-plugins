import chalk from "chalk";

const warned = new Set<string>();

/**
 * Scoped logger for Expo config plugins.
 */
export function createLogger(scope: string) {
  return {
    warnAndroid(text: string) {
      const warning = formatWarning({
        platform: "android",
        scope,
        warning: text,
      });

      if (warned.has(warning)) return;
      warned.add(warning);
      console.warn(warning);
    },
    warnIOS(text: string) {
      const warning = formatWarning({
        platform: "ios",
        scope,
        warning: text,
      });

      if (warned.has(warning)) return;
      warned.add(warning);
      console.warn(warning);
    },
    warn(text: string) {
      const warning = formatWarning({ warning: text });

      if (warned.has(warning)) return;
      warned.add(warning);
      console.warn(formatWarning({ warning: text }));
    },
  };
}

/**
 * » @expo-google-fonts/inter is not installed — run: npx expo install @expo-google-fonts/inter
 * » @vanenshi/expo-plugins/display-name[android]: displayName is set — ignoring abstract "name": example-internal
 * » @vanenshi/expo-plugins/display-name[ios]: displayName is set — ignoring abstract "name": example-internal
 */
function formatWarning({
  platform,
  scope,
  warning,
}: {
  warning: string;
  platform?: string;
  scope?: string;
}) {
  let prefix = "» ";

  if (scope && platform) {
    prefix += chalk.bold(`${scope}[${chalk.bold(platform)}]: `);
  } else if (scope) {
    prefix += chalk.bold(`${scope}: `);
  } else if (platform) {
    prefix += chalk.bold(`${platform}: `);
  }

  return chalk.yellow(`${prefix}${warning}`);
}
