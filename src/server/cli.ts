import { promises } from "fs";

import { createConnection, type Connection } from "vscode-languageserver/node";
import startLanguageServer from "./index";

const printUsage = () => {
  console.log("Usage: stan-language-server -- [options]");
  console.log("");
  console.log("Options:");

  console.log("  -h,--help\t\tShow this help message");

  // the following are parsed by the createConnection() call:
  // https://github.com/microsoft/vscode-languageserver-node/blob/3412a17149850f445bf35b4ad71148cfe5f8411e/server/src/node/main.ts#L196
  console.log("  --stdio\t\tUse stdio for communication");
  console.log("  --node-ipc\t\tUse node IPC for communication");
  console.log(
    "  --socket={number}\t\tUse a socket on port {number} for communication"
  );
  console.log(
    "  --pipe={path}\t\tUse a named pipe or socket file {path} for communication"
  );
};

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  printUsage();
  process.exit(0);
}

let connection: Connection;
try {
  connection = createConnection();
} catch (e) {
  if (
    e instanceof Error &&
    e.message.includes("Use arguments of createConnection")
  ) {
    console.error("Error: Missing communication method");
    printUsage();
  } else {
    console.error("Failed to create connection:", e);
  }
  process.exit(1);
}
startLanguageServer(connection, (f) => promises.readFile(f, "utf-8"));
