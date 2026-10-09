import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { DiagnosticSeverity, TextDocuments, type RemoteConsole } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { SERVER_ID } from "../../constants";
import * as compilationModule from "../../handlers/compilation/compilation";
import { handleDiagnostics } from "../../handlers/diagnostics";


describe("Diagnostic Handler", () => {
    const defaultSettings = { maxLineLength: 78, includePaths: [], warnPedantic: false };
    const documentUri = "file:///test.stan";
    const document = TextDocument.create(documentUri, "stan", 1, "stan code here");
    const params = {
        textDocument: { uri: documentUri },
    };

    const mockDocuments = {
        get: (uri: string) => (uri === documentUri ? document : undefined),
    } as TextDocuments<TextDocument>;

    let mockLogger: RemoteConsole;
    let mockHandleCompilation: any;

    beforeEach(() => {
        mockLogger = {
            warn: mock(() => { }),
        } as any;
        mockHandleCompilation = spyOn(compilationModule, "checkWithStanc").mockResolvedValue([{
            errors: [],
            warnings: []
        }, {}]);

    });

    afterEach(() => {
        mockHandleCompilation?.mockRestore();
    });

    it("should return empty array for successful compilation without warnings", async () => {

        const result = await handleDiagnostics(params, mockDocuments, [], defaultSettings, mockLogger);

        expect(result.items).toHaveLength(0);
    });


    it("should return empty array when document is not found", async () => {
        const missingDocumentParams = {
            textDocument: { uri: "file:///missing.stan" },
        };
        const result = await handleDiagnostics(
            missingDocumentParams,
            mockDocuments,
            [],
            defaultSettings,
            mockLogger
        );

        expect(result.items).toEqual([]);
        expect(mockHandleCompilation).not.toHaveBeenCalled();
    });

});
