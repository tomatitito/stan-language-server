import os
import random
import string
from pathlib import Path
from contextlib import contextmanager
from typing import Optional

import pytest_lsp
from lsprotocol import types
from pytest_lsp import (
    ClientServerConfig,
    LanguageClient,
)

HERE = Path(__file__).parent.resolve()
SERVER = HERE.parent / "bin" / "stan-language-server"

TESTING_WORKSPACE = "file:///testing/"


@pytest_lsp.fixture(
    config=ClientServerConfig(server_command=[os.fspath(SERVER)]),
    scope="module",
)
async def client(lsp_client: LanguageClient):
    params = types.InitializeParams(
        capabilities=types.ClientCapabilities(),
        workspace_folders=[types.WorkspaceFolder(TESTING_WORKSPACE, "Test Workspace")],
    )
    await lsp_client.initialize_session(params)

    try:
        yield
    finally:
        await lsp_client.shutdown_session()


@contextmanager
def make_text_document(
    client: LanguageClient,
    text: str,
    extension: str = "stan",
    filename: Optional[str] = None,
):
    file = filename or "".join(random.choice(string.ascii_lowercase) for _ in range(10))
    uri = f"{TESTING_WORKSPACE}{file}.{extension}"
    client.text_document_did_open(
        types.DidOpenTextDocumentParams(
            text_document=types.TextDocumentItem(
                uri=uri,
                language_id=extension,
                version=1,
                text=text,
            )
        )
    )
    try:
        yield uri
    finally:
        client.text_document_did_close(
            types.DidCloseTextDocumentParams(
                text_document=types.TextDocumentIdentifier(uri=uri)
            )
        )


async def test_completions(client: LanguageClient):

    with make_text_document(client, "model { target += bern") as test_uri:
        results = await client.text_document_completion_async(
            params=types.CompletionParams(
                position=types.Position(line=0, character=22),
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )

    assert results is not None

    assert len(results) > 0
    labels = [item.label for item in results]
    assert "bernoulli_lpmf" in labels


async def test_completions_tilde(client: LanguageClient):

    with make_text_document(client, "model { foo ~") as test_uri:
        results = await client.text_document_completion_async(
            params=types.CompletionParams(
                position=types.Position(line=0, character=13),
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )

    assert results is not None

    assert len(results) > 0
    labels = [item.label for item in results]
    assert "bernoulli" in labels


async def test_diagnostics(client: LanguageClient):

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


async def test_diagnostics_sf(client: LanguageClient):
    func = """real id(real x) { return x; }"""
    with make_text_document(client, func) as test_uri:
        results = await client.text_document_diagnostic_async(
            params=types.DocumentDiagnosticParams(
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )
    # normal stan file, should error because no opening block
    assert 'Expected "functions {"' in results.items[0].message

    with make_text_document(client, func, extension="stanfunctions") as test_uri_sf:
        results_sf = await client.text_document_diagnostic_async(
            params=types.DocumentDiagnosticParams(
                text_document=types.TextDocumentIdentifier(uri=test_uri_sf),
            )
        )
    assert results_sf.items == []  # no errors in stanfunctions file
