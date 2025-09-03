import { createConnection, TextDocuments } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import setUpLanguageServer from "./lib";

const connection = createConnection(process.stdin, process.stdout);

setUpLanguageServer(connection);
