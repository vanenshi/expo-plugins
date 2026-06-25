import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { parseFolder, parsePackage, resolvePackageDir } from "../discovery";

const FIXTURE_DIR = path.join(__dirname, "fixtures", "roboto");

describe("parseFolder", () => {
  it("parses standard weight folders", () => {
    expect(parseFolder("400Regular")).toEqual({ weight: 400, style: "normal" });
    expect(parseFolder("700Bold")).toEqual({ weight: 700, style: "normal" });
  });

  it("parses italic variant folders", () => {
    expect(parseFolder("400Regular_Italic")).toEqual({
      weight: 400,
      style: "italic",
    });
  });

  it("returns null for unknown folders", () => {
    expect(parseFolder("Unknown")).toBeNull();
  });
});

describe("parsePackage", () => {
  it("parses the committed roboto fixture", () => {
    const result = parsePackage(FIXTURE_DIR, "roboto");
    expect(result).not.toBeNull();
    expect(result!.fontFamily).toBe("Roboto");
    expect(result!.faces.size).toBe(3);
    expect(result!.faces.has("400:normal")).toBe(true);
    expect(result!.faces.has("700:normal")).toBe(true);
    expect(result!.faces.has("400:italic")).toBe(true);
  });

  it("returns null and warns when metadata.json is missing", () => {
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "discovery-"));
    // Create only index.js, no metadata.json
    fs.writeFileSync(path.join(empty, "index.js"), "");
    const result = parsePackage(empty, "missing-meta");
    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("missing-meta"));
    spy.mockRestore();
  });
});

describe("resolvePackageDir (thin seam test)", () => {
  it("resolves a real package dir from a project root with node_modules", () => {
    // Build a minimal node_modules layout in tmpdir
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-"));
    const pkgDir = path.join(
      root,
      "node_modules",
      "@expo-google-fonts",
      "test"
    );
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "@expo-google-fonts/test" })
    );

    const resolved = resolvePackageDir("test", root);
    // Use fs.realpathSync to handle macOS /var -> /private/var symlink
    expect(resolved).toBe(fs.realpathSync(pkgDir));
  });

  it("returns null for packages not installed", () => {
    const result = resolvePackageDir("does-not-exist-xyz", process.cwd());
    expect(result).toBeNull();
  });
});
