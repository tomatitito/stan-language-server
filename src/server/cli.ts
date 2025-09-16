import { createConnection } from "vscode-languageserver/node";
import startLanguageServer from "./index";

const connection = createConnection(process.stdin, process.stdout);

startLanguageServer(connection);
