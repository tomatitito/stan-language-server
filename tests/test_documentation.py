from lsprotocol import types
import pytest
from pytest_lsp import LanguageClient

from utils import make_text_document, client

FUNCTION_CODE = "model { real foo = beta(1,2); }"


@pytest.mark.parametrize("character", range(19, 23))
async def test_function_hover(client: LanguageClient, character: int):

    with make_text_document(client, FUNCTION_CODE) as test_uri:
        results = await client.text_document_hover_async(
            params=types.HoverParams(
                position=types.Position(line=0, character=character),
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )

    assert results is not None
    assert (
        "Jump to Stan Functions Reference index entry for beta"
        in results.contents.value
    )


@pytest.mark.parametrize("character", [18, 24])
async def test_function_hover_outside_word(client: LanguageClient, character: int):

    with make_text_document(client, FUNCTION_CODE) as test_uri:
        results = await client.text_document_hover_async(
            params=types.HoverParams(
                position=types.Position(line=0, character=character),
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )
    assert results is None


DISTRIBUTION_CODE = "model { foo ~ std_normal(); }"


@pytest.mark.parametrize("character", range(14, 24))
async def test_distribution_hover(client: LanguageClient, character: int):

    with make_text_document(client, DISTRIBUTION_CODE) as test_uri:
        results = await client.text_document_hover_async(
            params=types.HoverParams(
                position=types.Position(line=0, character=character),
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )

    assert results is not None
    assert (
        "Jump to Stan Functions Reference index entry for std_normal_lpdf"
        in results.contents.value
    )


@pytest.mark.parametrize("character", [13, 25])
async def test_distribution_hover_outside_word(client: LanguageClient, character: int):

    with make_text_document(client, DISTRIBUTION_CODE) as test_uri:
        results = await client.text_document_hover_async(
            params=types.HoverParams(
                position=types.Position(line=0, character=character),
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )
    assert results is None
