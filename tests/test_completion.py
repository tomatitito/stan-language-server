from lsprotocol import types
from pytest_lsp import LanguageClient

from utils import make_text_document, client


async def test_function_completion(client: LanguageClient):

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


async def test_distribution_completion(client: LanguageClient):

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


async def test_keyword_completion(client: LanguageClient):

    with make_text_document(client, "data {} transf") as test_uri:
        results = await client.text_document_completion_async(
            params=types.CompletionParams(
                position=types.Position(line=0, character=14),
                text_document=types.TextDocumentIdentifier(uri=test_uri),
            )
        )

    assert results is not None

    assert len(results) > 0
    labels = [item.label for item in results]
    assert labels == ['transformed']
