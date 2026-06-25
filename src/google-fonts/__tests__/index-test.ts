import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildExpoGoogleFontsOptions } from "..";

// Build a throwaway project with a fake @expo-google-fonts/test package so
// discoverPackage's require.resolve runs against real files on disk.
function makeFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "google-fonts-"));
  const pkgDir = path.join(root, "node_modules", "@expo-google-fonts", "test");

  const faces = [
    ["400Regular", "Test_400Regular.ttf"],
    ["700Bold", "Test_700Bold.ttf"],
    ["400Regular_Italic", "Test_400Regular_Italic.ttf"],
  ] as const;

  for (const [folder, file] of faces) {
    fs.mkdirSync(path.join(pkgDir, folder), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, folder, file), "ttf");
  }

  fs.writeFileSync(
    path.join(pkgDir, "package.json"),
    JSON.stringify({ name: "@expo-google-fonts/test", main: "index.js" })
  );
  fs.writeFileSync(
    path.join(pkgDir, "metadata.json"),
    JSON.stringify({ family: "Test" })
  );
  fs.writeFileSync(
    path.join(pkgDir, "index.js"),
    faces.map(([folder, file]) => `require('./${folder}/${file}')`).join("\n")
  );

  return root;
}

describe("buildExpoGoogleFontsOptions", () => {
  let projectRoot: string;
  beforeAll(() => {
    projectRoot = makeFixture();
  });

  it("resolves requested weights for android and ios", () => {
    const options = buildExpoGoogleFontsOptions({
      projectRoot,
      fonts: [{ packageName: "test", weights: [400, 700] }],
    });

    expect(options.android.fonts).toHaveLength(1);
    expect(options.android.fonts[0]!.fontFamily).toBe("Test");
    expect(
      options.android.fonts[0]!.fontDefinitions.map((d) => d.weight)
    ).toEqual([400, 700]);
    expect(options.ios.fonts).toHaveLength(2);
  });

  it("includes italic faces when importItalic is set", () => {
    const options = buildExpoGoogleFontsOptions({
      projectRoot,
      fonts: [{ packageName: "test", weights: [400], importItalic: true }],
    });

    const styles = options.android.fonts[0]!.fontDefinitions.map(
      (d) => d.style
    );
    expect(styles).toContain("italic");
  });

  it("honors a custom fontFamily override", () => {
    const options = buildExpoGoogleFontsOptions({
      projectRoot,
      fonts: [{ packageName: "test", fontFamily: "Custom", weights: [400] }],
    });
    expect(options.android.fonts[0]!.fontFamily).toBe("Custom");
  });

  it("skips packages that are not installed", () => {
    const options = buildExpoGoogleFontsOptions({
      projectRoot,
      warnOnMissing: false,
      fonts: [{ packageName: "does-not-exist", weights: [400] }],
    });
    expect(options.android.fonts).toHaveLength(0);
    expect(options.ios.fonts).toHaveLength(0);
  });
});

describe("withExpoGoogleFonts delegation", () => {
  it("delegates to expo-font/app.plugin with the built options", () => {
    const mockWithFonts = jest.fn((config: any) => ({
      ...config,
      _delegated: true,
    }));

    let withExpoGoogleFonts!: typeof import("..").default;
    jest.isolateModules(() => {
      jest.mock("expo-font/app.plugin", () => ({ default: mockWithFonts }), {
        virtual: true,
      });
      withExpoGoogleFonts = require("..").default;
    });

    const projectRoot = makeFixture();
    const result = withExpoGoogleFonts({ name: "App" } as any, {
      fonts: [{ packageName: "test", weights: [400] }],
      projectRoot,
    });

    expect(mockWithFonts).toHaveBeenCalledTimes(1);
    const passedOptions = mockWithFonts.mock.calls[0]![1] as any;
    expect(passedOptions.android.fonts).toHaveLength(1);
    expect(passedOptions.android.fonts[0]!.fontFamily).toBe("Test");
    expect((result as any)._delegated).toBe(true);
  });

  it("is a no-op when fonts array is empty", () => {
    const config = { name: "App" } as any;
    // Use the already-imported default export — expo-font is not called when fonts=[]
    const { default: withExpoGoogleFonts } = require("..");
    const result = withExpoGoogleFonts(config, { fonts: [] });
    expect(result).toBe(config);
  });
});
