import { createConnection } from "vscode-languageserver/node";

import setUpLanguageServer from "./lib";

const connection = createConnection(process.stdin, process.stdout);

setUpLanguageServer(connection);
