import { AndroidConfig } from "expo/config-plugins";

import withDisplayName from "..";

// Run the plugin and extract the resolved StringsXml mod result.
async function runStringsMod(
  config: any,
  props: { displayName: string },
  modResults: AndroidConfig.Resources.ResourceXML
) {
  const applied = withDisplayName(config, props);
  const mod = applied.mods?.android?.strings as any;
  const result = await mod({ ...applied, modResults, modRequest: {} });
  return result.modResults as AndroidConfig.Resources.ResourceXML;
}

// Run the plugin and extract the resolved InfoPlist mod result.
async function runInfoPlistMod(
  config: any,
  props: { displayName: string },
  modResults: Record<string, unknown> = {}
) {
  const applied = withDisplayName(config, props);
  const mod = applied.mods?.ios?.infoPlist as any;
  const result = await mod({ ...applied, modResults, modRequest: {} });
  return result.modResults as Record<string, unknown>;
}

function emptyStrings(): AndroidConfig.Resources.ResourceXML {
  return {
    resources: { string: [{ $: { name: "app_name" }, _: "Original" }] },
  };
}

describe("withDisplayName", () => {
  describe("Android (strings.xml)", () => {
    it("overwrites app_name with displayName", async () => {
      const result = await runStringsMod(
        {},
        { displayName: "My App (Beta)" },
        emptyStrings()
      );
      expect(
        result.resources.string!.find((s) => s.$.name === "app_name")!._
      ).toBe("My App (Beta)");
    });

    it("adds app_name when the resource is missing", async () => {
      const result = await runStringsMod(
        {},
        { displayName: "Created" },
        { resources: {} }
      );
      expect(
        result.resources.string!.find((s) => s.$.name === "app_name")!._
      ).toBe("Created");
    });

    it("is a no-op without displayName", () => {
      const config = { name: "Internal" } as any;
      const applied = withDisplayName(config);
      expect(applied.mods?.android?.strings).toBeUndefined();
    });
  });

  describe("iOS (Info.plist)", () => {
    it("sets CFBundleDisplayName from displayName", async () => {
      const result = await runInfoPlistMod(
        {},
        { displayName: "My App (Beta)" }
      );
      expect(result.CFBundleDisplayName).toBe("My App (Beta)");
    });

    it("overwrites an existing CFBundleDisplayName", async () => {
      const result = await runInfoPlistMod(
        {},
        { displayName: "New Name" },
        { CFBundleDisplayName: "Old Name" }
      );
      expect(result.CFBundleDisplayName).toBe("New Name");
    });

    it("is a no-op without displayName", () => {
      const config = { name: "Internal" } as any;
      const applied = withDisplayName(config);
      expect(applied.mods?.ios?.infoPlist).toBeUndefined();
    });
  });

  describe("cross-platform", () => {
    it("queues both mods when displayName is provided", () => {
      const config = { name: "Internal" } as any;
      const applied = withDisplayName(config, {
        displayName: "Both Platforms",
      });
      expect(applied.mods?.android?.strings).toBeDefined();
      expect(applied.mods?.ios?.infoPlist).toBeDefined();
    });
  });
});
