import { describe, expect, test } from "bun:test";
import { parse } from "../../../language/ast/parser.ts";

// Requires generated WASM data. If this fails to import, run `bun run generate:wasm` first.

describe("AST parser singleton", () => {
  test("lazily initializes from generated WASM data and parses a simple Stan program", async () => {
    const source = 
`data {
  int N;
}
parameters {
  real y;
}
model {
  y ~ normal(0, 1);
}
`;

    const tree = await parse(source);

    expect(tree.rootNode).toBeDefined();
    expect(tree.rootNode.type).toBe("program");
    expect(tree.rootNode.hasError).toBe(false);
    expect(tree.rootNode.namedChildren.map((node) => node.type)).toEqual([
      "data",
      "parameters",
      "model",
    ]);
  });

});
