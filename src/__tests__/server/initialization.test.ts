import { describe, expect, it } from "bun:test";
import { workspaceFoldersFromInitialize } from "../../server/initialization";

describe("server initialization", () => {
  it("uses rootUri when workspace folders are unavailable", () => {
    expect(workspaceFoldersFromInitialize({
      workspaceFolders: null,
      rootUri: "file:///workspace",
    })).toEqual([
      {
        uri: "file:///workspace",
        name: "file:///workspace",
      },
    ]);
  });
});
