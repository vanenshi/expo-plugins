import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { withExpoGoogleFonts } from "../withExpoGoogleFonts";

// Build a throwaway project with a fake @expo-google-fonts/test package so the
// plugin's require.resolve + file discovery runs against real files on disk.
function makeFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "google-fonts-"));
  const pkgDir = path.join(root, "node_modules", "@expo-google-fonts", "test");

  const faces = [
    ["400Regular", "Test_400Regular.ttf"],
    ["700Bold", "Test_700Bold.ttf"],
    ["400Regular_Italic", "Test_400Regular_Italic.ttf"],
  ];

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

describe(withExpoGoogleFonts, () => {
  let projectRoot: string;
  beforeAll(() => {
    projectRoot = makeFixture();
  });

  it("resolves requested weights for android and ios", () => {
    const options = withExpoGoogleFonts({
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
    const options = withExpoGoogleFonts({
      projectRoot,
      fonts: [{ packageName: "test", weights: [400], importItalic: true }],
    });

    const styles = options.android.fonts[0]!.fontDefinitions.map(
      (d) => d.style
    );
    expect(styles).toContain("italic");
  });

  it("honors a custom fontFamily override", () => {
    const options = withExpoGoogleFonts({
      projectRoot,
      fonts: [{ packageName: "test", fontFamily: "Custom", weights: [400] }],
    });
    expect(options.android.fonts[0]!.fontFamily).toBe("Custom");
  });

  it("skips packages that are not installed", () => {
    const options = withExpoGoogleFonts({
      projectRoot,
      warnOnMissing: false,
      fonts: [{ packageName: "does-not-exist", weights: [400] }],
    });
    expect(options.android.fonts).toHaveLength(0);
    expect(options.ios.fonts).toHaveLength(0);
  });
});
