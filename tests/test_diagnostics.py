from lsprotocol import types
from pytest_lsp import LanguageClient

from utils import make_text_document, client


async def test_basic_warning(client: LanguageClient):

    with make_text_document(client, "model {real foo = 1 / 2;}") as test_uri:
        results = await client.text_document_diagnostic_async(
            params=types.DocumentDiagnosticParams(
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )

    assert results is not None
    assert len(results.items) == 1
    diagnostic = results.items[0]
    assert "Values will be rounded towards zero" in diagnostic.message
    assert diagnostic.severity == types.DiagnosticSeverity.Warning


async def test_basic_error(client: LanguageClient):

    with make_text_document(client, "model { foo ~ std_normal(); }") as test_uri:
        results = await client.text_document_diagnostic_async(
            params=types.DocumentDiagnosticParams(
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )

    assert results is not None
    assert len(results.items) == 1
    diagnostic = results.items[0]
    assert "'foo' not in scope" in diagnostic.message
    assert diagnostic.severity == types.DiagnosticSeverity.Error


async def test_stanfunctions(client: LanguageClient):
    func = """real id(real x) { return x; }"""
    with make_text_document(client, func) as test_uri:
        results = await client.text_document_diagnostic_async(
            params=types.DocumentDiagnosticParams(
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )
    # normal stan file, should error because no opening block
    diagnostic = results.items[0]
    assert 'Expected "functions {"' in diagnostic.message
    assert diagnostic.severity == types.DiagnosticSeverity.Error

    with make_text_document(client, func, extension="stanfunctions") as test_uri_sf:
        results_sf = await client.text_document_diagnostic_async(
            params=types.DocumentDiagnosticParams(
                text_document=types.TextDocumentIdentifier(uri=test_uri_sf),
            )
        )
    assert results_sf.items == []  # no errors in stanfunctions file
