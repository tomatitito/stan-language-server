import { spawn, type ChildProcess } from "child_process";
import type {
  CompletionItem,
  CompletionList,
  CompletionParams,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
  DocumentDiagnosticParams,
  DocumentDiagnosticReport,
  DocumentFormattingParams,
  Hover,
  HoverParams,
  InitializeParams,
  InitializeResult,
  LSPAny,
  TextEdit,
} from "vscode-languageserver-protocol";

export interface LSPMessage {
  jsonrpc: "2.0";
  id?: number | string;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class LSPTestClient {
  private server: ChildProcess | null = null;
  private messageId = 1;
  private pendingRequests = new Map<number, {
    resolve: (result: any) => void;
    reject: (error: any) => void;
  }>();
  private buffer = "";
  private currentSettings: any = {};
  private workspaceUri: string | null = null;
  private registrationResolve: (() => void) | null = null;

  serverMessages: LSPMessage[] = [];
  numRefreshRequest: number = 0;

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = spawn("bun", ["run", "src/server/cli.ts", "--stdio"], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, NODE_ENV: "test" },
      });

      if (!this.server.stdin || !this.server.stdout || !this.server.stderr) {
        reject(new Error("Failed to create server process streams"));
        return;
      }

      this.server.stdout.on("data", (data: Buffer) => {
        this.handleServerMessage(data.toString());
      });

      this.server.stderr.on("data", (data: Buffer) => {
        console.error("Server stderr:", data.toString());
      });

      this.server.on("error", (error) => {
        reject(error);
      });

      this.server.on("exit", (code) => {
        // console.log(`Server exited with code ${code}`);
      });

      // Give server time to start
      setTimeout(resolve, 100);
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.kill();
      this.server = null;
    }
    this.pendingRequests.clear();
    this.serverMessages = [];
    this.numRefreshRequest = 0;
    this.currentSettings = {};
  }

  private handleServerMessage(data: string): void {
    this.buffer += data;

    // Process complete messages
    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;

      const headerPart = this.buffer.substring(0, headerEnd);
      const contentLengthMatch = headerPart.match(/Content-Length: (\d+)/);

      if (!contentLengthMatch) {
        console.error("Invalid LSP message format");
        this.buffer = this.buffer.substring(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1] ?? "0");
      const messageStart = headerEnd + 4;

      if (this.buffer.length < messageStart + contentLength) {
        // Wait for complete message
        break;
      }

      const messageContent = this.buffer.substring(messageStart, messageStart + contentLength);
      this.buffer = this.buffer.substring(messageStart + contentLength);

      try {
        const message: LSPMessage = JSON.parse(messageContent);
        this.serverMessages.push(message);
        this.handleMessage(message);
      } catch (error) {
        console.error("Failed to parse LSP message:", error, "Content:", messageContent);
      }
    }
  }

  private handleMessage(message: LSPMessage): void {
    if (message.id && this.pendingRequests.has(message.id as number)) {
      const request = this.pendingRequests.get(message.id as number)!;
      this.pendingRequests.delete(message.id as number);

      if (message.error) {
        request.reject(new Error(`LSP Error: ${message.error.message}`));
      } else {
        request.resolve(message.result);
      }
    } else if (message.method) {
      if (message.method === 'workspace/diagnostic/refresh') {
        this.handleDiagnosticRefresh(message);
      } else if (message.method === 'workspace/configuration') {
        this.handleConfigurationRequest(message);
      } else if (message.method === 'workspace/workspaceFolders') {
        this.handleWorkspaceFoldersRequest(message);
      } else if (message.method === 'client/registerCapability') {
        this.handleRegisterCapability(message);
      }
      // Notifications/requests from server are handled above
    }
  }

  private handleDiagnosticRefresh(message: LSPMessage): void {
    // Server is requesting a diagnostic refresh
    this.numRefreshRequest += 1;
  }

  private handleConfigurationRequest(message: LSPMessage): void {
    // Server sends workspace/configuration with params.items array
    // We need to respond with an array of configuration values (same length as items)
    const items = message.params?.items || [];
    const result = items.map((item: any) =>
      item.section === 'stan-language-server' ? this.currentSettings : null
    );

    this.sendMessage({
      jsonrpc: "2.0",
      id: message.id,
      result,
    });
  }

  private handleWorkspaceFoldersRequest(message: LSPMessage): void {
    const result = this.workspaceUri ? [
      {
        uri: this.workspaceUri,
        name: "test-workspace"
      }
    ] : [];

    this.sendMessage({
      jsonrpc: "2.0",
      id: message.id,
      result: result,
    });
  }

  private handleRegisterCapability(message: LSPMessage): void {
    // Server is requesting to register a capability - just acknowledge
    this.sendMessage({
      jsonrpc: "2.0",
      id: message.id,
      result: null,
    });

    // Resolve any waiting promise, solely for testing purposes
    if (this.registrationResolve) {
      this.registrationResolve();
      this.registrationResolve = null;
    }
  }

  private sendMessage(message: LSPMessage): void {
    if (!this.server?.stdin) {
      throw new Error("Server not started");
    }

    const content = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
    this.server.stdin.write(header + content);
  }

  private sendRequest<T = any>(method: string, params?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      this.pendingRequests.set(id, { resolve, reject });

      this.sendMessage({
        jsonrpc: "2.0",
        id,
        method,
        params,
      });

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 3000);
    });
  }

  private sendNotification(method: string, params?: any): void {
    this.sendMessage({
      jsonrpc: "2.0",
      method,
      params,
    });
  }

  async initialize(workspaceUri?: string, dynamicRegistration: boolean = true): Promise<InitializeResult> {
    // Store workspace URI so we can respond to workspace/workspaceFolders requests
    this.workspaceUri = workspaceUri || null;

    const params: InitializeParams = {
      processId: process.pid,
      rootUri: workspaceUri || null,
      capabilities: {
        textDocument: {
          completion: {
            completionItem: {
              snippetSupport: true,
            },
          },
          hover: {},
          formatting: {},
        },
        workspace: {
          workspaceFolders: true,
          configuration: true,
          didChangeConfiguration: {
            dynamicRegistration,
          },
        },
      },
      workspaceFolders: workspaceUri ? [{ uri: workspaceUri, name: "test" }] : null,
    };

    return this.sendRequest<InitializeResult>("initialize", params);
  }

  async initialized(): Promise<void> {
    this.sendNotification("initialized");
  }

  async waitForRegistration(timeout: number = 2000): Promise<void> {
    // Check if we already received a registration
    const hasRegistration = this.serverMessages.some(
      msg => msg.method === "client/registerCapability"
    );

    if (hasRegistration) {
      return Promise.resolve();
    }

    // Create a promise that will be resolved when registration arrives
    return new Promise((resolve, reject) => {
      this.registrationResolve = resolve;

      setTimeout(() => {
        if (this.registrationResolve === resolve) {
          this.registrationResolve = null;
          reject(new Error("Timeout waiting for registration"));
        }
      }, timeout);
    });
  }

  async shutdown(): Promise<void> {
    await this.sendRequest("shutdown");
  }

  async exit(): Promise<void> {
    this.sendNotification("exit");
  }

  async didOpen(uri: string, languageId: string, text: string): Promise<void> {
    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri,
        languageId,
        version: 1,
        text,
      },
    };
    this.sendNotification("textDocument/didOpen", params);
  }

  async didChange(uri: string, text: string, version: number): Promise<void> {
    const params: DidChangeTextDocumentParams = {
      textDocument: { uri, version },
      contentChanges: [{ text }],
    };
    this.sendNotification("textDocument/didChange", params);
  }

  async didClose(uri: string): Promise<void> {
    const params: DidCloseTextDocumentParams = {
      textDocument: { uri },
    };
    this.sendNotification("textDocument/didClose", params);
  }

  async didChangeConfiguration(settings?: LSPAny): Promise<void> {
    // Update our stored settings so we can respond to workspace/configuration requests
    if (settings) {
      this.currentSettings = { ...this.currentSettings, ...settings };
    }
    const params = { settings: settings ? settings : {} };
    this.sendNotification("workspace/didChangeConfiguration", params);
  }

  async completion(uri: string, line: number, character: number): Promise<CompletionList | CompletionItem[]> {
    const params: CompletionParams = {
      textDocument: { uri },
      position: { line, character },
    };
    return this.sendRequest<CompletionList | CompletionItem[]>("textDocument/completion", params);
  }

  async formatting(uri: string): Promise<TextEdit[]> {
    const params: DocumentFormattingParams = {
      textDocument: { uri },
      options: {
        tabSize: 2,
        insertSpaces: true,
      },
    };
    return this.sendRequest<TextEdit[]>("textDocument/formatting", params);
  }

  async hover(uri: string, line: number, character: number): Promise<Hover | null> {
    const params: HoverParams = {
      textDocument: { uri },
      position: { line, character },
    };
    return this.sendRequest<Hover | null>("textDocument/hover", params);
  }

  async diagnostics(uri: string): Promise<DocumentDiagnosticReport> {
    const params: DocumentDiagnosticParams = {
      textDocument: { uri },
    };
    return this.sendRequest<DocumentDiagnosticReport>("textDocument/diagnostic", params);
  }
}
