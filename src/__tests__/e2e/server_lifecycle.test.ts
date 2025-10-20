import { afterEach, describe, expect, it } from "bun:test";
import { TextDocumentSyncKind, type InitializeResult } from "vscode-languageserver-protocol";
import { LSPTestClient } from "./lsp-client";

describe("Server Lifecycle", () => {
  let client: LSPTestClient;

  afterEach(async () => {
    try {
      await client.shutdown();
      await client.exit();
    } catch (error) {
      // Server might already be stopped
    }
    await client.stop();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      client = new LSPTestClient();
      await client.start();

      const result: InitializeResult = await client.initialize("file://stan-project");

      expect(result.capabilities).toBeDefined();
      expect(result.capabilities.textDocumentSync).toEqual(TextDocumentSyncKind.Incremental);
      expect(result.capabilities.completionProvider?.triggerCharacters).toContain("~");
      expect(result.capabilities.completionProvider?.resolveProvider).toBeFalse();
      expect(result.capabilities.documentFormattingProvider).toBeTrue();
      expect(result.capabilities.hoverProvider).toBeTrue();
      expect(result.capabilities.diagnosticProvider?.interFileDependencies).toBeTrue();
      expect(result.capabilities.diagnosticProvider?.workspaceDiagnostics).toBeFalse();
      expect(result.capabilities.workspace?.workspaceFolders?.supported).toEqual(true);
      expect(client.serverMessages.map(message => message.params?.message)).toContain("Initializing Stan language server...");
    });

    it("should respond to initialized notification", async () => {
      client = new LSPTestClient();
      await client.start();

      await client.initialize("file://stan-project");
      await client.initialized();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(client.serverMessages.map(message => message.params?.message)).toContain("Stan language server is initialized");
    });
  });

  describe("Dynamic Capability Registration", () => {
    it("should register for didChangeConfiguration when dynamic registration is enabled", async () => {
      client = new LSPTestClient();
      await client.start();

      await client.initialize("file://stan-project", true);
      await client.initialized();

      await client.waitForRegistration();

      const registerCapabilityMessages = client.serverMessages.filter(
        msg => msg.method === "client/registerCapability"
      );

      const didChangeConfigRegistrations = registerCapabilityMessages.filter(msg =>
        msg.params?.registrations?.some(
          (reg: any) => reg.method === "workspace/didChangeConfiguration"
        )
      );

      expect(didChangeConfigRegistrations.length).toBe(1);
    });

    it("should not register for didChangeConfiguration when dynamic registration is disabled", async () => {
      client = new LSPTestClient();
      await client.start();

      await client.initialize("file://stan-project", false);
      await client.initialized();

      // Try to wait for registration - it should timeout since server won't send one
      let registrationTimedOut = false;
      try {
        await client.waitForRegistration(500);
      } catch (error) {
        registrationTimedOut = true;
      }

      expect(registrationTimedOut).toBe(true);

      const registerCapabilityMessages = client.serverMessages.filter(
        msg => msg.method === "client/registerCapability"
      );

      const didChangeConfigRegistrations = registerCapabilityMessages.filter(msg =>
        msg.params?.registrations?.some(
          (reg: any) => reg.method === "workspace/didChangeConfiguration"
        )
      );

      expect(didChangeConfigRegistrations.length).toBe(0);
    });
  });

  describe("Document Lifecycle", () => {
    it("should handle document close events", async () => {
      client = new LSPTestClient();
      await client.start();

      await client.initialize("file://stan-project");
      await client.initialized();

      const uri = `file://stan-project/close-test.stan`;
      const content = "model { real x = beta(1, 2); }";

      await client.didOpen(uri, "stan", content);

      // Verify document is open by requesting hover (should work)
      let hoverResult = await client.hover(uri, 0, 17); // hover over "beta"
      expect(hoverResult).not.toBeNull();

      await client.didClose(uri);

      hoverResult = await client.hover(uri, 0, 17);
      expect(hoverResult).toBeNull();
    });
  });
});
