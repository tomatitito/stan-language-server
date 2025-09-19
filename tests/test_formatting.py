from lsprotocol import types
from pytest_lsp import LanguageClient

from utils import make_text_document, client

dummy_options = types.FormattingOptions(tab_size=2, insert_spaces=True)


async def test_basic(client: LanguageClient):
    with make_text_document(client, "model {real\n\n\nfoo=1/2.0;}") as test_uri:
        results = await client.text_document_formatting_async(
            params=types.DocumentFormattingParams(
                text_document=types.TextDocumentIdentifier(uri=test_uri),
                options=dummy_options,
            )
        )

    assert results is not None
    assert len(results) == 1  # we always just format the entire file
    new_text = results[0].new_text
    assert new_text == "model {\n  real foo = 1 / 2.0;\n}\n"


async def test_error(client: LanguageClient):
    with make_text_document(client, "model {real foo = 1 / 2.0") as test_uri:
        results = await client.text_document_formatting_async(
            params=types.DocumentFormattingParams(
                text_document=types.TextDocumentIdentifier(uri=test_uri),
                options=dummy_options,
            )
        )
    assert any("Syntax error in " in log.message for log in client.log_messages)


async def test_settings(client: LanguageClient):
    # default is to format on save
    with make_text_document(client, "model {real foo=1/2.0;}") as test_uri:
        results_short = await client.text_document_formatting_async(
            params=types.DocumentFormattingParams(
                text_document=types.TextDocumentIdentifier(uri=test_uri),
                options=dummy_options,
            )
        )
        assert results_short is not None
        assert len(results_short) == 1  # we always just format the entire file
        new_text = results_short[0].new_text
        assert new_text == "model {\n  real foo = 1 / 2.0;\n}\n"

        short = {"stan-language-server": {"maxLineLength": 15}}
        client.set_configuration(short, scope_uri=test_uri)
        client.workspace_did_change_configuration(
            types.DidChangeConfigurationParams(short)
        )

        results_short = await client.text_document_formatting_async(
            params=types.DocumentFormattingParams(
                text_document=types.TextDocumentIdentifier(uri=test_uri),
                options=dummy_options,
            )
        )
        assert results_short is not None
        new_text = results_short[0].new_text
        # split over more lines now!
        assert new_text == "model {\n  real foo = 1\n       / 2.0;\n}\n"
