import { describe, beforeEach, afterEach, expect, it, test } from "bun:test";
import { LSPTestClient } from "./lsp-client";
import path from "path";
import { promises as fs } from "fs";


const FUNCTION_CODE = "model { real foo = beta(1,2); }";
const DISTRIBUTION_CODE = "model { foo ~ std_normal(); }";

describe("Hover", () => {
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

  describe("Function hover", () => {
    test.each([19, 20, 21, 22])("should show hover at character %p", async (character) => {
      const uri = `file:///hover-function.stan`;
      await client.didOpen(uri, "stan", FUNCTION_CODE);

      const result = await client.hover(uri, 0, character);

      expect(result).not.toBeNull();
      expect(result?.contents).toBeDefined();
      if (result?.contents && typeof result.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain("Jump to Stan Functions Reference index entry for beta");
      }
    });

    test.each([18, 24])("should not show hover outside word at character %p", async (character) => {
      const uri = `file:///hover-function.stan`;
      await client.didOpen(uri, "stan", FUNCTION_CODE);

      const result = await client.hover(uri, 0, character);

      expect(result).toBeNull();
    });

    it("should be whitespace insensitive", async () => {
      const code = `model {
real foo =
beta
(1,2);
}`;
      const uri = `file:///hover-function-whitespace.stan`;
      await client.didOpen(uri, "stan", code);

      const result = await client.hover(uri, 2, 2);

      expect(result).not.toBeNull();
      expect(result?.contents).toBeDefined();
      if (result?.contents && typeof result.contents === 'object' && 'value' in result.contents) {
        expect(result.contents.value).toContain("Jump to Stan Functions Reference index entry for beta");
      }
    });
  });

  describe("Distribution hover", () => {
    test.each([14, 15, 16, 17, 18, 19, 20, 21, 22, 23])(
      "should show hover at character %p",
      async (character) => {
        const uri = `file:///hover-distribution.stan`;
        await client.didOpen(uri, "stan", DISTRIBUTION_CODE);

        const result = await client.hover(uri, 0, character);

        expect(result).not.toBeNull();
        expect(result?.contents).toBeDefined();
        if (result?.contents && typeof result.contents === 'object' && 'value' in result.contents) {
          expect(result.contents.value).toContain("Jump to Stan Functions Reference index entry for std_normal_lpdf");
        }
      }
    );

    test.each([13, 25])("should not show hover outside word at character %p", async (character) => {
      const uri = `file:///hover-distribution.stan`;
      await client.didOpen(uri, "stan", DISTRIBUTION_CODE);

      const result = await client.hover(uri, 0, character);

      expect(result).toBeNull();
    });
  });
});
