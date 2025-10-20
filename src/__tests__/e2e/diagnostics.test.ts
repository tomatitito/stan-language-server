import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { DiagnosticSeverity } from "vscode-languageserver";
import { LSPTestClient } from "./lsp-client";

describe("Diagnostics", () => {
  let client: LSPTestClient;

  beforeEach(async () => {
    client = new LSPTestClient();
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
    const content = "model {real foo = 1 / 2;}";
    const uri = "file:///test/warning.stan";
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

    await client.didClose(uri);
  });

  it("should report an error", async () => {
    const content = "model { foo ~ std_normal(); }";
    const uri = "file:///test/error.stan";
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

    await client.didClose(uri);
  });

  it("should not report diagnostics with a valid stanfunctions file", async () => {
    const content = "real id(real x) { return x; }";
    const uri = "file:///test/valid.stanfunctions";
    await client.didOpen(uri, "stanfunctions", content);

    const result = await client.diagnostics(uri);

    expect(result).toBeDefined();
    if (result.kind === "full") {
      expect(result.items.length).toEqual(0);
    }

    await client.didClose(uri);
  });

  it("should report an error when included file is not found", async () => {
    const content = `#include "foo.stan"
model { foo ~ std_normal(); }`;
    const uri = "file:///test/include-failing.stan";
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

    await client.didClose(uri);
  });

  it("should not report diagnostics when included file is found", async () => {
    const mainContent = `#include "included.stan"
model { foo ~ std_normal(); }`;
    const includedContent = "parameters { real foo; }";

    // Open the included file first
    const includedUri = "file:///test/included.stan";
    await client.didOpen(includedUri, "stan", includedContent);

    // Then open the main file
    const mainUri = "file:///test/main.stan";
    await client.didOpen(mainUri, "stan", mainContent);

    const result = await client.diagnostics(mainUri);

    expect(result).toBeDefined();

    if (result.kind === "full") {
      expect(result.items.length).toEqual(0);
    }

    await client.didClose(mainUri);
    await client.didClose(includedUri);
  });

  it("should pick up a configuration change", async () => {
    const content = "model { foo ~ std_normal(); }";
    const uri = "file:///test/config-change.stan";
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

    await client.didClose(uri);
  });
});
