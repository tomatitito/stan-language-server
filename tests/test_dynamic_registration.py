import asyncio
import pytest
import pytest_lsp
from lsprotocol import types
from pytest_lsp import LanguageClient, ClientServerConfig
from pathlib import Path
import os

HERE = Path(__file__).parent.resolve()
SERVER = HERE.parent / "bin" / "stan-language-server"
TESTING_WORKSPACE = "file:///testing/"


@pytest_lsp.fixture(
    config=ClientServerConfig(server_command=[os.fspath(SERVER), "--stdio"]),
    scope="function",
)
async def client_with_dynamic_registration(lsp_client: LanguageClient):
    """Client with dynamic registration enabled."""
    registration_received = asyncio.Event()
    lsp_client.registrations = []

    @lsp_client.feature("client/registerCapability")
    def on_register_capability(params: types.RegistrationParams):
        lsp_client.registrations.append(params)
        registration_received.set()
        return None

    @lsp_client.feature("workspace/didChangeConfiguration")
    def on_did_change_configuration(params: types.DidChangeConfigurationParams):
        return None

    params = types.InitializeParams(
        capabilities=types.ClientCapabilities(
            workspace=types.WorkspaceClientCapabilities(
                configuration=True,
                did_change_configuration=types.DidChangeConfigurationClientCapabilities(
                    dynamic_registration=True
                ),
            )
        ),
        workspace_folders=[types.WorkspaceFolder(TESTING_WORKSPACE, "Test Workspace")],
    )

    await lsp_client.initialize_session(params)

    # Wait for the registration to be received (with timeout for safety)
    await asyncio.wait_for(registration_received.wait(), timeout=2.0)

    yield lsp_client
    await lsp_client.shutdown_session()


@pytest_lsp.fixture(
    config=ClientServerConfig(server_command=[os.fspath(SERVER), "--stdio"]),
    scope="function",
)
async def client_without_dynamic_registration(lsp_client: LanguageClient):
    """Client with dynamic registration disabled."""
    lsp_client.registrations = []

    @lsp_client.feature("client/registerCapability")
    def on_register_capability(params: types.RegistrationParams):
        lsp_client.registrations.append(params)
        return None

    @lsp_client.feature("workspace/didChangeConfiguration")
    def on_did_change_configuration(params: types.DidChangeConfigurationParams):
        return None

    params = types.InitializeParams(
        capabilities=types.ClientCapabilities(
            workspace=types.WorkspaceClientCapabilities(
                did_change_configuration=types.DidChangeConfigurationClientCapabilities(
                    dynamic_registration=False
                ),
            )
        ),
        workspace_folders=[types.WorkspaceFolder(TESTING_WORKSPACE, "Test Workspace")],
    )

    await lsp_client.initialize_session(params)

    try:
        await asyncio.wait_for(
            lsp_client.wait_for_notification("client/registerCapability"),
            timeout=0.5
        )
    except asyncio.TimeoutError:
        pass

    yield lsp_client
    await lsp_client.shutdown_session()


async def test_dynamic_registration_enabled(
    client_with_dynamic_registration: LanguageClient,
):
    """Test that server registers when client supports dynamic registration."""
    did_change_config_registrations = [
        reg
        for reg in client_with_dynamic_registration.registrations
        for registration in reg.registrations
        if registration.method == "workspace/didChangeConfiguration"
    ]

    assert len(did_change_config_registrations) == 1, (
        "Server should register for didChangeConfiguration when client supports dynamic registration"
    )


async def test_dynamic_registration_disabled(
    client_without_dynamic_registration: LanguageClient,
):
    """Test that server does not register when client doesn't support dynamic registration."""
    did_change_config_registrations = [
        reg
        for reg in client_without_dynamic_registration.registrations
        for registration in reg.registrations
        if registration.method == "workspace/didChangeConfiguration"
    ]

    assert len(did_change_config_registrations) == 0, (
        "Server should not register for didChangeConfiguration when client doesn't support dynamic registration"
    )
