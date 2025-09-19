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
