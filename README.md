# stan-language-server

A language server for the Stan probabilistic programming language written in TypeScript and using Bun to build an executable binary. This is work in progress. 

To install dependencies:

```bash
bun install
```

To run the language server:

```bash
bun run server.ts
```

Building a binary executable:

```bash
bun build server.ts --compile --outfile stan-language-server
```
