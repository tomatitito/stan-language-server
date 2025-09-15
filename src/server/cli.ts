import { createConnection } from "vscode-languageserver/node";
import startLanguageServer from "./index.ts";
import process from "node:process";

const connection = createConnection(process.stdin, process.stdout);

startLanguageServer(connection);
