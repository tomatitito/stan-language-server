import { createConnection } from "vscode-languageserver/node";

import startLanguageServer from "./lib";

const connection = createConnection(process.stdin, process.stdout);

startLanguageServer(connection);
