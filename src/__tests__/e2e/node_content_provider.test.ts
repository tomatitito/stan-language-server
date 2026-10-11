import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "bun:test";
import { DiagnosticSeverity } from "vscode-languageserver-protocol";
import { URI } from "vscode-uri";
import { LSPTestClient } from "./lsp-client";

describe("Node content provider integration", () => {
  it("stops searching removed workspace folders for includes", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sls-removed-workspace-"));
    const client = new LSPTestClient();
    const modelUri = URI.file(path.join(root, "nested", "model.stan")).toString();
    try {
      // Only the workspace root contains this include, not the model's directory.
      await writeFile(path.join(root, "body.stan"), "model {}");
      await client.start();
      await client.initialize(URI.file(root).toString());
      await client.initialized();
      await client.didOpen(modelUri, "stan", "#include body.stan");
      expect(client.diagnostics(modelUri)).resolves.toEqual({
            kind: "full",
            items: [],
        });

      await client.didChangeWorkspaceFolders(null);
      const result = await client.diagnostics(modelUri);
      expect(result.kind).toBe("full");
      if (result.kind !== "full") {
        throw new Error("Expected a full diagnostic report");
      }
      expect(result.items.some((item) => item.severity === DiagnosticSeverity.Error))
        .toBe(true);

      // Adding the folder back makes its files available again.
      await client.didChangeWorkspaceFolders(URI.file(root).toString());
      expect(client.diagnostics(modelUri)).resolves.toEqual({
            kind: "full",
            items: [],
        });
      await client.shutdown();
      await client.exit();
    } finally {
      await client.stop();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reads unopened includes from disk and prefers open documents until they close", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sls-node-provider-"));
    const client = new LSPTestClient();
    const includePath = path.join(root, "body.stan");
    const includeUri = URI.file(includePath).toString();
    const modelUri = URI.file(path.join(root, "model.stan")).toString();
    const validContent = "model {}";
    const invalidContent = "model { invalid syntax }";

    const expectValid = async () => {
      expect(await client.diagnostics(modelUri)).toEqual({
        kind: "full",
        items: [],
      });
    };
    const expectInvalid = async () => {
      const result = await client.diagnostics(modelUri);
      expect(result.kind).toBe("full");
      if (result.kind !== "full") {
        throw new Error("Expected a full diagnostic report");
      }
      expect(result.items.some((item) => item.severity === DiagnosticSeverity.Error))
        .toBe(true);
    };

    try {
      await writeFile(includePath, validContent);
      await client.start();
      await client.initialize(URI.file(root).toString());
      await client.initialized();
      await client.didOpen(modelUri, "stan", "#include body.stan");

      // The include was never opened: success requires the CLI's disk provider.
      await expectValid();

      // A subsequent request must read the changed disk content.
      await writeFile(includePath, invalidContent);
      await expectInvalid();

      // Unsaved editor content overrides the invalid file on disk.
      await client.didOpen(includeUri, "stan", validContent);
      await expectValid();

      // Closing the editor restores the filesystem fallback.
      await client.didClose(includeUri);
      await expectInvalid();
      await writeFile(includePath, validContent);
      await expectValid();

      await client.shutdown();
      await client.exit();
    } finally {
      await client.stop();
      await rm(root, { recursive: true, force: true });
    }
  });
});
