import asyncio
import pytest
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
    assert diagnostic.range.start.line == 0
    assert diagnostic.range.start.character == 18


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
    assert diagnostic.range.start.line == 0
    assert diagnostic.range.start.character == 8
    assert diagnostic.range.end.line == 0
    assert diagnostic.range.end.character == 11


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


async def test_include(client: LanguageClient):
    main = """
    #include "foo.stan"
    model { foo ~ std_normal(); }
    """
    with make_text_document(client, main) as test_uri:
        results = await client.text_document_diagnostic_async(
            params=types.DocumentDiagnosticParams(
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )
        # should error because include file not found
        diagnostic = results.items[0]
        assert "Could not find include file 'foo.stan'" in diagnostic.message
        assert diagnostic.severity == types.DiagnosticSeverity.Error
        assert diagnostic.range.start.line == 1
        assert diagnostic.range.start.character == 4

        other = "parameters { real foo; }"
        with make_text_document(client, other, filename="foo"):
            results_inc = await client.text_document_diagnostic_async(
                params=types.DocumentDiagnosticParams(
                    text_document=types.TextDocumentIdentifier(uri=test_uri),
                )
            )
        assert results_inc.items == []  # no errors once include file is opened

@pytest.mark.xfail(reason="Nested includes currently not found")
async def test_nested_includes(client: LanguageClient):
    main = """
    #include "foo.stan"
    model { foo ~ std_normal(); }
    """
    second = "#include <bar.stan>"
    third = "parameters { real foo; }"
    with (
        make_text_document(client, main) as test_uri,
        make_text_document(client, second, filename="foo"),
        make_text_document(client, third, filename="bar"),
    ):
        results_inc = await client.text_document_diagnostic_async(
            params=types.DocumentDiagnosticParams(
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )
        assert results_inc.items == []  # no errors once include file is opened


async def test_include_error(client: LanguageClient):
    main = """
    #include "foo.stan"
    model { foo ~ std_normal(); }
    """
    other = "parameters { real foo }"
    with make_text_document(client, main) as test_uri, make_text_document(
        client, other, filename="foo"
    ):
        results = await client.text_document_diagnostic_async(
            params=types.DocumentDiagnosticParams(
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )
    diagnostic = results.items[0]
    assert diagnostic.severity == types.DiagnosticSeverity.Error
    assert diagnostic.message.startswith("Error in included file:")
    assert diagnostic.range.start.line == 1
    assert diagnostic.range.start.character == 4


async def test_include_warning(client: LanguageClient):
    main = """
    #include "foo.stan"
    model { foo ~ std_normal(); }
    """
    other = "parameters { real foo; } transformed parameters { real bar = 1 / 2; }"
    with make_text_document(client, main) as test_uri, make_text_document(
        client, other, filename="foo"
    ):
        results = await client.text_document_diagnostic_async(
            params=types.DocumentDiagnosticParams(
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )
    diagnostic = results.items[0]
    assert diagnostic.severity == types.DiagnosticSeverity.Warning
    assert diagnostic.message.startswith("Warning in included file:")
    assert diagnostic.range.start.line == 1
    assert diagnostic.range.start.character == 4


async def test_configuration_change(client: LanguageClient):

    prev_requests = client.refresh_requests

    with make_text_document(client, "model {real foo = 1 / 2;}"):
        client.workspace_did_change_configuration(
            types.DidChangeConfigurationParams({})
        )
        await asyncio.sleep(0.5)  # wait for the server to process the change
        assert client.refresh_requests == prev_requests + 1
