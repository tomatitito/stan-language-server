import { describe, expect, it } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  createWorkspaceIndex,
  getSemanticIndexEntry,
  upsertSemanticIndexEntry,
} from "../../../language/ast/workspace_index";
import { provideRename } from "../../../language/rename/provider";

const createIndexedEntry = async (text: string) => {
  const document = TextDocument.create(
    "file:///rename-provider-test.stan",
    "stan",
    1,
    text,
  );
  const index = await upsertSemanticIndexEntry(
    createWorkspaceIndex(),
    document,
  );
  const entry = getSemanticIndexEntry(index, document);
  if (entry === null) {
    throw new Error("Expected indexed entry");
  }
  return entry;
};

describe("provideRename", () => {
  const stanProgram = `
parameters {
  real alpha;
  real gamma;
}
model {
  alpha ~ normal(0, 1);
  gamma ~ normal(alpha, 1);
}
`.trimStart();

  const alphaOccurrences = [
    {
      range: {
        start: { line: 1, character: 7 },
        end: { line: 1, character: 12 },
      },
    },
    {
      range: {
        start: { line: 5, character: 2 },
        end: { line: 5, character: 7 },
      },
    },
    {
      range: {
        start: { line: 6, character: 17 },
        end: { line: 6, character: 22 },
      },
    },
  ];

  it("renaming a declaration renames it and all references", async () => {
    const entry = await createIndexedEntry(stanProgram);

    const result = provideRename(entry, {
      line: 1,
      character: 8,
    });

    expect(result).toEqual(alphaOccurrences);
  });

  it("renaming a reference renames its declaration and all other references", async () => {
    const entry = await createIndexedEntry(stanProgram);

    const result = provideRename(entry, {
      line: 5,
      character: 3,
    });

    expect(result).toEqual(alphaOccurrences);
  });

  it("renaming a non-renamable symbol does not rename anything", async () => {
    const entry = await createIndexedEntry(stanProgram);

    const result = provideRename(entry, {
      line: 5,
      character: 11,
    });

    expect(result).toEqual([]);
  });

  it("renames transformed parameters variables referenced in model", async () => {
    const entry = await createIndexedEntry(`
parameters {
  real sigma;
}
transformed parameters {
  real sigma_sq = sigma * sigma;
}
model {
  sigma_sq ~ normal(0, 1);
}
`.trimStart());

    const occurrences = [
      {
        range: {
          start: { line: 4, character: 7 },
          end: { line: 4, character: 15 },
        },
      },
      {
        range: {
          start: { line: 7, character: 2 },
          end: { line: 7, character: 10 },
        },
      },
    ];

    expect(provideRename(entry, { line: 4, character: 8 })).toEqual(
      occurrences,
    );
    expect(provideRename(entry, { line: 7, character: 3 })).toEqual(
      occurrences,
    );
  });

  it("renames transformed parameters variables referenced in generated quantities", async () => {
    const entry = await createIndexedEntry(`
parameters {
  real sigma;
}
transformed parameters {
  real sigma_sq = sigma * sigma;
}
generated quantities {
  real draw = sigma_sq;
}
`.trimStart());

    const occurrences = [
      {
        range: {
          start: { line: 4, character: 7 },
          end: { line: 4, character: 15 },
        },
      },
      {
        range: {
          start: { line: 7, character: 14 },
          end: { line: 7, character: 22 },
        },
      },
    ];

    expect(provideRename(entry, { line: 4, character: 8 })).toEqual(
      occurrences,
    );
    expect(provideRename(entry, { line: 7, character: 15 })).toEqual(
      occurrences,
    );
  });

  it("does not rename model locals from generated quantities", async () => {
    const entry = await createIndexedEntry(`
model {
  real local_only;
}
generated quantities {
  real draw = local_only;
}
`.trimStart());

    expect(provideRename(entry, { line: 1, character: 8 })).toEqual([
      {
        range: {
          start: { line: 1, character: 7 },
          end: { line: 1, character: 17 },
        },
      },
    ]);
    expect(provideRename(entry, { line: 4, character: 15 })).toEqual([]);
  });

  it("does not export nested transformed parameters locals to model", async () => {
    const entry = await createIndexedEntry(`
transformed parameters {
  real exported;
  {
    real nested;
    exported = nested;
  }
}
model {
  exported ~ normal(0, 1);
  nested ~ normal(0, 1);
}
`.trimStart());

    expect(provideRename(entry, { line: 1, character: 8 })).toEqual([
      {
        range: {
          start: { line: 1, character: 7 },
          end: { line: 1, character: 15 },
        },
      },
      {
        range: {
          start: { line: 4, character: 4 },
          end: { line: 4, character: 12 },
        },
      },
      {
        range: {
          start: { line: 8, character: 2 },
          end: { line: 8, character: 10 },
        },
      },
    ]);
    expect(provideRename(entry, { line: 3, character: 9 })).toEqual([
      {
        range: {
          start: { line: 3, character: 9 },
          end: { line: 3, character: 15 },
        },
      },
      {
        range: {
          start: { line: 4, character: 15 },
          end: { line: 4, character: 21 },
        },
      },
    ]);
    expect(provideRename(entry, { line: 9, character: 3 })).toEqual([]);
  });

  it("renames transformed data variables referenced in later blocks", async () => {
    const entry = await createIndexedEntry(`
transformed data {
  real td;
}
parameters {
  real<lower=td> theta;
}
model {
  theta ~ normal(td, 1);
}
`.trimStart());

    const tdOccurrences = [
      {
        range: {
          start: { line: 1, character: 7 },
          end: { line: 1, character: 9 },
        },
      },
      {
        range: {
          start: { line: 4, character: 13 },
          end: { line: 4, character: 15 },
        },
      },
      {
        range: {
          start: { line: 7, character: 17 },
          end: { line: 7, character: 19 },
        },
      },
    ];

    expect(provideRename(entry, { line: 1, character: 8 })).toEqual(
      tdOccurrences,
    );
    expect(provideRename(entry, { line: 4, character: 14 })).toEqual(
      tdOccurrences,
    );
    expect(provideRename(entry, { line: 7, character: 18 })).toEqual(
      tdOccurrences,
    );
  });

  it("does not rename invalid references from earlier blocks to later declarations", async () => {
    const entry = await createIndexedEntry(`
transformed data {
  real x = theta;
}
parameters {
  real theta;
}
model {
  theta ~ normal(0, 1);
}
`.trimStart());

    const thetaOccurrences = [
      {
        range: {
          start: { line: 4, character: 7 },
          end: { line: 4, character: 12 },
        },
      },
      {
        range: {
          start: { line: 7, character: 2 },
          end: { line: 7, character: 7 },
        },
      },
    ];

    expect(provideRename(entry, { line: 1, character: 11 })).toEqual([]);
    expect(provideRename(entry, { line: 4, character: 8 })).toEqual(
      thetaOccurrences,
    );
    expect(provideRename(entry, { line: 7, character: 3 })).toEqual(
      thetaOccurrences,
    );
  });

  it("renames model locals referenced by later model statements", async () => {
    const entry = await createIndexedEntry(`
model {
  real local;
  local = 1;
}
`.trimStart());

    const occurrences = [
      {
        range: {
          start: { line: 1, character: 7 },
          end: { line: 1, character: 12 },
        },
      },
      {
        range: {
          start: { line: 2, character: 2 },
          end: { line: 2, character: 7 },
        },
      },
    ];

    expect(provideRename(entry, { line: 1, character: 8 })).toEqual(
      occurrences,
    );
    expect(provideRename(entry, { line: 2, character: 3 })).toEqual(
      occurrences,
    );
  });

  it("renames generated quantities locals referenced by later generated quantities statements", async () => {
    const entry = await createIndexedEntry(`
generated quantities {
  real first;
  real second = first;
}
`.trimStart());

    const occurrences = [
      {
        range: {
          start: { line: 1, character: 7 },
          end: { line: 1, character: 12 },
        },
      },
      {
        range: {
          start: { line: 2, character: 16 },
          end: { line: 2, character: 21 },
        },
      },
    ];

    expect(provideRename(entry, { line: 1, character: 8 })).toEqual(
      occurrences,
    );
    expect(provideRename(entry, { line: 2, character: 17 })).toEqual(
      occurrences,
    );
  });

  it("renames user-defined functions from standalone function statements", async () => {
    const entry = await createIndexedEntry(`
functions {
  void foo(real x) {}
}
generated quantities {
  foo(3.14);
}
`.trimStart());

    const occurrences = [
      {
        range: {
          start: { line: 1, character: 7 },
          end: { line: 1, character: 10 },
        },
      },
      {
        range: {
          start: { line: 4, character: 2 },
          end: { line: 4, character: 5 },
        },
      },
    ];

    expect(provideRename(entry, { line: 1, character: 8 })).toEqual(
      occurrences,
    );
    expect(provideRename(entry, { line: 4, character: 3 })).toEqual(
      occurrences,
    );
  });

  it("renames forward references to user-defined functions", async () => {
    const entry = await createIndexedEntry(`
functions {
  real f(real x) {
    return g(x);
  }

  real g(real x) {
    return x;
  }
}
`.trimStart());

    const occurrences = [
      {
        range: {
          start: { line: 5, character: 7 },
          end: { line: 5, character: 8 },
        },
      },
      {
        range: {
          start: { line: 2, character: 11 },
          end: { line: 2, character: 12 },
        },
      },
    ];

    expect(provideRename(entry, { line: 2, character: 11 })).toEqual(
      occurrences,
    );
    expect(provideRename(entry, { line: 5, character: 7 })).toEqual(
      occurrences,
    );
  });

  const mapRectProgram = `
functions {
  vector beta(vector theta, vector phi, array[] real x_r, array[] int x_i) {
    return theta;
  }
}
parameters {
  vector[2] beta;
}
transformed parameters {
  vector[2] y;
  y = map_rect(beta, beta, beta, rep_array(0.0, 0), rep_array(0, 0))[1:2];
}
`.trimStart();

  const mapRectFunctionBetaOccurrences = [
    {
      range: {
        start: { line: 1, character: 9 },
        end: { line: 1, character: 13 },
      },
    },
    {
      range: {
        start: { line: 10, character: 15 },
        end: { line: 10, character: 19 },
      },
    },
  ];

  const mapRectParameterBetaOccurrences = [
    {
      range: {
        start: { line: 6, character: 12 },
        end: { line: 6, character: 16 },
      },
    },
    {
      range: {
        start: { line: 10, character: 21 },
        end: { line: 10, character: 25 },
      },
    },
    {
      range: {
        start: { line: 10, character: 27 },
        end: { line: 10, character: 31 },
      },
    },
  ];

  it("renames the map_rect function argument without renaming same-named variables", async () => {
    const entry = await createIndexedEntry(mapRectProgram);

    expect(provideRename(entry, { line: 1, character: 10 })).toEqual(
      mapRectFunctionBetaOccurrences,
    );
  });

  it("renames higher-order Stan function arguments as user-defined functions", async () => {
    const entry = await createIndexedEntry(`
functions {
  real partial_sum(array[] real slice, int start, int end, vector beta) {
    return 0;
  }
}
parameters {
  vector[2] partial_sum;
}
model {
  target += reduce_sum(partial_sum, to_array_1d(partial_sum), 1, partial_sum);
}
`.trimStart());

    expect(provideRename(entry, { line: 1, character: 9 })).toEqual([
      {
        range: {
          start: { line: 1, character: 7 },
          end: { line: 1, character: 18 },
        },
      },
      {
        range: {
          start: { line: 9, character: 23 },
          end: { line: 9, character: 34 },
        },
      },
    ]);

    expect(provideRename(entry, { line: 6, character: 13 })).toEqual([
      {
        range: {
          start: { line: 6, character: 12 },
          end: { line: 6, character: 23 },
        },
      },
      {
        range: {
          start: { line: 9, character: 48 },
          end: { line: 9, character: 59 },
        },
      },
      {
        range: {
          start: { line: 9, character: 65 },
          end: { line: 9, character: 76 },
        },
      },
    ]);
  });

  it("renames the map_rect parameters block beta without renaming other betas", async () => {
    const entry = await createIndexedEntry(mapRectProgram);

    expect(provideRename(entry, { line: 6, character: 13 })).toEqual(
      mapRectParameterBetaOccurrences,
    );
  });

  it("renames a map_rect beta reference without renaming the function beta", async () => {
    const entry = await createIndexedEntry(mapRectProgram);

    expect(provideRename(entry, { line: 10, character: 22 })).toEqual(
      mapRectParameterBetaOccurrences,
    );
  });
});
