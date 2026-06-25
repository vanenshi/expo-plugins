import { AndroidConfig } from "expo/config-plugins";

import withAndroidCustomAppName from "../withAndroidCustomAppName";

// Run a config plugin and return the resolved StringsXml mod result. This mimics
// how @config-plugins packages exercise mods: call the plugin, then run the
// queued mod against a mock modResults object.
async function runStringsMod(
  config: any,
  modResults: AndroidConfig.Resources.ResourceXML
) {
  const applied = withAndroidCustomAppName(config);
  const mod = applied.mods!.android!.strings as any;
  const result = await mod({ ...applied, modResults, modRequest: {} });
  return result.modResults as AndroidConfig.Resources.ResourceXML;
}

function emptyStrings(): AndroidConfig.Resources.ResourceXML {
  return {
    resources: { string: [{ $: { name: "app_name" }, _: "Original" }] },
  };
}

describe(withAndroidCustomAppName, () => {
  it("overwrites app_name from android.appName", async () => {
    const result = await runStringsMod(
      { name: "Internal", android: { appName: "My App (Beta)" } },
      emptyStrings()
    );
    expect(
      result.resources.string!.find((s) => s.$.name === "app_name")!._
    ).toBe("My App (Beta)");
  });

  it("prefers the appName passed as a plugin option", async () => {
    const applied = withAndroidCustomAppName(
      { android: { appName: "FromConfig" } } as any,
      { appName: "FromOption" }
    );
    const mod = applied.mods!.android!.strings as any;
    const result = await mod({
      ...applied,
      modResults: emptyStrings(),
      modRequest: {},
    });
    expect(
      result.modResults.resources.string.find(
        (s: any) => s.$.name === "app_name"
      )._
    ).toBe("FromOption");
  });

  it("adds app_name when the resource is missing", async () => {
    const result = await runStringsMod(
      { android: { appName: "Created" } },
      { resources: {} }
    );
    expect(
      result.resources.string!.find((s) => s.$.name === "app_name")!._
    ).toBe("Created");
  });

  it("is a no-op without a custom name", async () => {
    const result = await runStringsMod({ name: "Internal" }, emptyStrings());
    expect(
      result.resources.string!.find((s) => s.$.name === "app_name")!._
    ).toBe("Original");
  });
});
