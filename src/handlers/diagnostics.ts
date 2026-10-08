import {
    Diagnostic,
    DiagnosticSeverity,
    type Location,
    WorkspaceFolder,
    type DocumentDiagnosticParams,
    type RemoteConsole,
    type RelatedFullDocumentDiagnosticReport,
    type FullDocumentDiagnosticReport
} from "vscode-languageserver";

import type { FileSystemReader, TextDocumentProvider } from "../types";
import { SERVER_ID } from "../constants";
import type { CheckResult, Diagnostic as StancDiagnostic } from "stanc3";
import { checkWithStanc, type Settings } from "./compilation/compilation";
import { URI } from "vscode-uri";


export async function handleDiagnostics(
    params: DocumentDiagnosticParams,
    documents: TextDocumentProvider,
    workspaceFolders: WorkspaceFolder[],
    settings: Settings,
    logger: RemoteConsole,
    reader?: FileSystemReader
): Promise<RelatedFullDocumentDiagnosticReport> {
    const document = documents.get(params.textDocument.uri);
    if (!document || !document.languageId.startsWith("stan")) {
        return { kind: "full", items: [] };
    }

    const compilerResult = await checkWithStanc(
        document,
        documents,
        workspaceFolders,
        settings,
        logger,
        reader,
    );

    const diagnostics = provideDiagnostics(compilerResult)
    let items: Diagnostic[] = [];
    const relatedDocuments: { [uri: string]: FullDocumentDiagnosticReport } = {};
    for (const uri in diagnostics) {
        if (uri === params.textDocument.uri) {
            items = diagnostics[uri] ?? [];
        } else {
            // TODO this uri is wrong and leads to no diagnostic atm
            // need to make it a full path somehow?
            // maybe map from included name to uri needs to be returned from the compilation function?
            relatedDocuments[uri] =
            {
                kind: "full",
                items: diagnostics[uri] ?? []
            }
        }
    }

    return {
        kind: "full",
        items,
        relatedDocuments,
    };


}


function convertSeverity(severity: StancDiagnostic['severity']): DiagnosticSeverity {
    switch (severity) {
        case "help": return DiagnosticSeverity.Hint;
        case "note": return DiagnosticSeverity.Information;
        case "warning": return DiagnosticSeverity.Warning;
        default: return DiagnosticSeverity.Error;
    }
}

function convertRange(range: StancDiagnostic['labels'][0]['range']): Location {

    return {
        uri: URI.file(range.source ?? "string").toString(),
        range: {
            start: { line: range.start.line - 1, character: range.start.column - 1 },
            end: { line: range.end.line - 1, character: range.end.column - 1 }
        }
    };
}

function convertDiagnostics(compilerDiagnostic: StancDiagnostic): { [uri: string]: Diagnostic[] } {

    const diagnostics: { [uri: string]: Diagnostic[] } = {};

    for (const label of compilerDiagnostic.labels) {
        const { range, uri } = convertRange(label.range);
        if (diagnostics[uri] === undefined) diagnostics[uri] = [];

        if (label.priority === "primary") {
            let message = compilerDiagnostic.message;
            if (label.message != message && label.message != "here.") {
                message += "\n" + label.message;

            }
            for (const note of compilerDiagnostic.notes) {
                message += "\n" + note;
            }
            if (message.includes('given information about')) {
                message += "\nTry opening the included file and making the Stan language server aware of it."
            }


            diagnostics[uri].push(
                {
                    range,
                    message,
                    severity: convertSeverity(compilerDiagnostic.severity),
                    code: compilerDiagnostic.error_code,
                    source: SERVER_ID,
                });
        } else {
            // TODO: once more clients support it, this could be DiagnosticRelatedInformation
            diagnostics[uri].push(
                {
                    range,
                    message: label.message,
                    severity: DiagnosticSeverity.Information,
                    code: compilerDiagnostic.error_code,
                    source: SERVER_ID,
                });
        }
    }

    return diagnostics;
}

function merge<T>(maps: { [key: string]: T[] }[]): { [key: string]: T[] } {
    const ret: { [key: string]: T[] } = {};
    for (const map of maps) {
        for (const key of Object.keys(map)) {
            if (ret[key] === undefined) ret[key] = [];
            ret[key].push(...(map[key] ?? []));
        }
    }
    return ret;
}

function provideDiagnostics(compilerResult: CheckResult) {
    return merge([...compilerResult.errors.map(convertDiagnostics),
    ...compilerResult.warnings.map(convertDiagnostics),
    ]);
}
