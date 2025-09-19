import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { LSPTestClient } from "./lsp-client";
import path from "path";
import { promises as fs } from "fs";
import { DiagnosticSeverity, type Diagnostic, type DocumentDiagnosticReport } from "vscode-languageserver";

const fixturesDir = path.resolve(__dirname, "../../__fixtures__/");
const workspaceUri = `file://${fixturesDir}`;

describe("Diagnostics", () => {
  let client: LSPTestClient;

  beforeEach(async () => {
    client = new LSPTestClient();
    await fs.access(fixturesDir).catch(async () => {
      await fs.mkdir(fixturesDir, { recursive: true });
    });

    await client.start();
  });

  afterEach(async () => {
    try {
      await client.shutdown();
      await client.exit();
    } catch (error) {
      // Server might already be stopped
    }
    await client.stop();
  });


  it("should provide a warning", async () => {
    const uri = `${workspaceUri}/diagnostics.warning.stan`;
    const content = await fs.readFile(path.join(fixturesDir, "diagnostics.warning.stan"), "utf-8");
    await client.didOpen(uri, "stan", content);

    const result = await client.diagnostics(uri);

    expect(result).toBeDefined();

    if (result.kind === "full") {
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.map(item => item.message.match(/Values will be rounded towards zero/))).toBeTruthy();
      expect(new Set(result.items.map(item => item.severity))).toContain(DiagnosticSeverity.Warning);
      expect(result.items.map(item => item.range.start.line)).toContain(0);
      expect(result.items.map(item => item.range.start.character)).toContain(18);
    }

  })

  it("should report an error", async () => {
    const uri = `${workspaceUri}/diagnostics.error.stan`;
    const content = await fs.readFile(path.join(fixturesDir, "diagnostics.error.stan"), "utf-8");
    await client.didOpen(uri, "stan", content);

    const result = await client.diagnostics(uri);

    expect(result).toBeDefined();

    if (result.kind === "full") {
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.map(item => item.message.match(/'foo' not in scope/))).toBeTruthy();
      expect(new Set(result.items.map(item => item.severity))).toContain(DiagnosticSeverity.Error);
      expect(result.items.map(item => item.range.start.line)).toContain(0);
      expect(result.items.map(item => item.range.start.character)).toContain(8);
    }
  })

  it("should not report diagnostics with a valid stanfunctions file", async () => {
    const uri = `${workspaceUri}/valid.stanfunctions`;
    const content = await fs.readFile(path.join(fixturesDir, "valid.stanfunctions"), "utf-8");
    await client.didOpen(uri, "stan", content);

    const result = await client.diagnostics(uri);

    expect(result).toBeDefined();
    if (result.kind === "full") {
      expect(result.items.length).toEqual(0);
    }
  });

  it("should report an error when included file is not found", async () => {
    const uri = `${workspaceUri}/diagnostics.include.failing.stan`;
    const content = await fs.readFile(path.join(fixturesDir, "diagnostics.include.failing.stan"), "utf-8");

    await client.didOpen(uri, "stan", content);

    const result = await client.diagnostics(uri);

    expect(result).toBeDefined();

    if (result.kind === "full") {
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.map(item => item.message.match(/could not find include file 'foo.stan'/))).toBeTruthy();
      expect(new Set(result.items.map(item => item.severity))).toContain(DiagnosticSeverity.Error);
      expect(result.items.map(item => item.range.start.line)).toContain(0);
      expect(result.items.map(item => item.range.start.character)).toContain(0);
    }
  })

  it("should not report diagnostics when included file is found", async () => {
    const uri = `${workspaceUri}/diagnostics.include.stan`;
    const content = await fs.readFile(path.join(fixturesDir, "diagnostics.include.stan"), "utf-8");

    await client.didOpen(uri, "stan", content);

    const result = await client.diagnostics(uri);

    expect(result).toBeDefined();

    if (result.kind === "full") {
      expect(result.items.length).toEqual(0);
    }
  })

  it("should pick up a configuration change", async () => {
    const uri = `${workspaceUri}/diagnostics.error.stan`;
    const content = await fs.readFile(path.join(fixturesDir, "diagnostics.error.stan"), "utf-8");

    await client.didOpen(uri, "stan", content);

    let result = await client.diagnostics(uri);

    expect(result).toBeDefined();
    expect(result.kind).toBe("full");
    if (result.kind === "full") {
      expect(result.items.length).toBeGreaterThan(0);
    }

    const initialRefreshCount = client.numRefreshRequest;

    await client.didChangeConfiguration({ "stan-language-server": { maxLineLength: 100 } });

    // Wait a bit for the server to process the configuration change
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(client.numRefreshRequest).toBeGreaterThan(initialRefreshCount);

    result = await client.diagnostics(uri);
    expect(result.kind).toBeDefined();
    if (result.kind === "full") {
      expect(result.items.length).toBeGreaterThan(0);
    }
  })

})
