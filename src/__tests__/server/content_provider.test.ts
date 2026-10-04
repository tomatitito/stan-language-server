import { promises as fs } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, spyOn } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import {
  listWorkspaceFiles,
  readWorkspaceFile,
} from "../../server/node_content_provider";
import {
  changeDocument,
  closeDocument,
  emptyDocumentState,
  openDocument,
} from "../../server/document_state";
import {
  createServerWorkspaceState,
  createWorkspaceFileReader,
} from "../../server/workspace_state";

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
};

describe("content provider", () => {
  it("never accesses disk for non-file URIs but still reads open documents", async () => {
    const readFile = spyOn(fs, "readFile");
    const stat = spyOn(fs, "stat");
    try {
      for (const uri of [
        "memfs:/workspace/model.stan",
        "https://example.com/workspace/model.stan",
        "untitled:Untitled-1",
      ]) {
        expect(readWorkspaceFile(uri, new Map())).resolves.toBeNull();
        expect(listWorkspaceFiles([{ uri, name: "virtual" }]))
              .resolves.toEqual([]);
        const document = TextDocument.create(uri, "stan", 1, "model {}");
        expect(readWorkspaceFile(uri, new Map([[uri, document]])))
              .resolves.toEqual({
                  uri,
                  text: "model {}",
                  version: 1,
                  location: "documentStore",
              });
      }
      expect(readFile).not.toHaveBeenCalled();
      expect(stat).not.toHaveBeenCalled();
    } finally {
      readFile.mockRestore();
      stat.mockRestore();
    }
  });

  it("discovers supported files with stable ordering and duplicated-folder deduplication", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sls-discovery-"));
    try {
      await mkdir(path.join(root, "nested"));
      await writeFile(path.join(root, "z.stanfunctions"), "");
      await writeFile(path.join(root, "nested", "a.stan"), "model {}");
      await writeFile(path.join(root, "notes.txt"), "ignored");
      const rootUri = URI.file(root).toString();

      expect(listWorkspaceFiles([
        { uri: rootUri, name: "first" },
        { uri: rootUri, name: "duplicate" },
      ])).resolves.toEqual([
        URI.file(path.join(root, "nested", "a.stan")).toString(),
        URI.file(path.join(root, "z.stanfunctions")).toString(),
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("tolerates empty workspaces and unreadable roots", async () => {
    expect(listWorkspaceFiles([])).resolves.toEqual([]);
    expect(listWorkspaceFiles([
          { uri: URI.file("/missing/sls-workspace").toString(), name: "missing" },
      ])).resolves.toEqual([]);
  });

  it("uses current open document instead of disk", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sls-open-overlay-"));
    try {
      const filePath = path.join(root, "model.stan");
      const uri = URI.file(filePath).toString();
      await writeFile(filePath, "disk");
      const document = TextDocument.create(uri, "stan", 7, "open");
      const documentStore = new Map([[uri, document]])

      expect(readWorkspaceFile(uri, documentStore))
            .resolves.toEqual({
                uri,
                text: "open",
                version: 7,
                location: "documentStore",
            });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rechecks the current immutable document state after awaited disk reads", async () => {
    const uri = URI.file("/pending/model.stan").toString();
    const state = createServerWorkspaceState();
    const originalDocuments = state.documents;
    const readFile = createWorkspaceFileReader(state, {
      listWorkspaceFiles,
      readWorkspaceFile,
    });
    const diskRead = createDeferred<string>();
    const mockedReadFile = spyOn(fs as any, "readFile").mockImplementation(
      async () => await diskRead.promise,
    );

    try {
      const read = readFile(uri);
      expect(mockedReadFile).toHaveBeenCalledTimes(1);
      const opened = openDocument(state.documents, {
        textDocument: {
          uri,
          languageId: "stan",
          version: 3,
          text: "opened while reading",
        },
      });
      expect(opened.accepted).toBe(true);
      state.documents = opened.state;
      expect(state.documents).not.toBe(originalDocuments);
      expect(originalDocuments.get(uri)).toBeUndefined();
      diskRead.resolve("stale disk");

      expect(read).resolves.toMatchObject({
            text: "opened while reading",
            version: 3,
            location: "documentStore",
        });

      const changed = changeDocument(state.documents, {
        textDocument: { uri, version: 4 },
        contentChanges: [{ text: "edited after opening" }],
      });
      expect(changed.accepted).toBe(true);
      state.documents = changed.state;
      expect(readFile(uri)).resolves.toMatchObject({
            text: "edited after opening",
            version: 4,
            location: "documentStore",
        });
      expect(mockedReadFile).toHaveBeenCalledTimes(1);

      const closed = closeDocument(state.documents, { textDocument: { uri } });
      expect(closed.accepted).toBe(true);
      state.documents = closed.state;
      expect(readFile(uri)).resolves.toMatchObject({
            text: "stale disk",
            location: "disk",
        });
      expect(mockedReadFile).toHaveBeenCalledTimes(2);
    } finally {
      diskRead.resolve("stale disk");
      mockedReadFile.mockRestore();
    }
  });

  it("tracks document changes and falls back to disk after close", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sls-overlay-"));
    try {
      const filePath = path.join(root, "model.stan");
      const uri = URI.file(filePath).toString();
      await writeFile(filePath, "disk");
      let state = emptyDocumentState();

      const opened = openDocument(state, {
        textDocument: {
          uri,
          languageId: "stan",
          version: 1,
          text: "real foo;",
        },
      });
      expect(opened.accepted).toBeTrue();
      state = opened.state;

      const ranged = changeDocument(state, {
        textDocument: { uri, version: 2 },
        contentChanges: [{
          range: {
            start: { line: 0, character: 5 },
            end: { line: 0, character: 8 },
          },
          text: "bar",
        }],
      });
      expect(ranged.accepted).toBeTrue();
      state = ranged.state;
      expect(readWorkspaceFile(uri, state)).resolves.toMatchObject({
            text: "real bar;",
            version: 2,
        });

      const replaced = changeDocument(state, {
        textDocument: { uri, version: 3 },
        contentChanges: [{ text: "real baz;" }],
      });
      expect(replaced.accepted).toBeTrue();
      state = replaced.state;

      const closed = closeDocument(state, { textDocument: { uri } });
      expect(closed.accepted).toBeTrue();
      expect(readWorkspaceFile(uri, closed.state)).resolves.toMatchObject({
            text: "disk",
            location: "disk",
        });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reads explicitly referenced files excluded from discovery", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sls-explicit-"));
    try {
      const filePath = path.join(root, "fragment.inc");
      const uri = URI.file(filePath).toString();
      await writeFile(filePath, "real x;");

      expect(listWorkspaceFiles([
            { uri: URI.file(root).toString(), name: "workspace" },
        ])).resolves.toEqual([]);
      expect(readWorkspaceFile(uri, new Map())).resolves.toMatchObject({
            uri,
            text: "real x;",
            location: "disk",
        });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("handles encoded and Unicode file URIs", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sls-unicode-"));
    try {
      const nested = path.join(root, "space ü");
      const filePath = path.join(nested, "model %.stan");
      await mkdir(nested);
      await writeFile(filePath, "parameters { real x; }");
      const uri = URI.file(filePath).toString();

      expect(listWorkspaceFiles([
            { uri: URI.file(root).toString(), name: "workspace" },
        ])).resolves.toEqual([uri]);
      expect(readWorkspaceFile(uri, new Map())).resolves.toMatchObject({
            text: "parameters { real x; }",
            location: "disk",
        });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
