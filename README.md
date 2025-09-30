# stan-language-server

A language server for the Stan probabilistic programming language written in TypeScript and using Bun to build an executable binary.

## Features

- **Auto-completion**: Keywords, functions, distributions, data types, and constraints
- **Hover information**: Documentation and type information
- **Diagnostics**: Real-time syntax and semantic error detection
- **Code formatting**: Using the official Stan compiler
- **Include file support**: Full `#include` resolution and compilation


## Editor-specific configuration

### VSCode:

Install the [extension](https://github.com/WardBrian/vscode-stan-extension)
from [Marketplace](https://marketplace.visualstudio.com/items?itemName=wardbrian.vscode-stan-extension)
or [open-vsx](https://open-vsx.org/extension/wardbrian/vscode-stan-extension).

### Neovim

There are many ways to install language servers in neovim. Here is one (if you have a different or better way, consider contributing it!).

In your `nvim` config folder add `lua/lsp/init.lua` with:
```lua
local servers = {
    stan_ls = "lsp.stan",
}

local function setup_server(name, config_module)
    local config = require(config_module)

    vim.api.nvim_create_autocmd("FileType", {
        pattern = config.filetypes,
        callback = function()
            if #vim.lsp.get_clients({ bufnr = 0, name = name }) > 0 then
                return
            end

            local root_dir = vim.fs.root(0, config.root_markers)
            print(string.format("Starting %s for buffer %d with root: %s", name, vim.api.nvim_get_current_buf(),
                root_dir or "none"))

            vim.lsp.start({
                name = name,
                cmd = config.cmd,
                root_dir = root_dir,
                initialization_options = config.settings or {},
                on_exit = function(code, signal)
                    print(string.format("%s exited with code %d, signal %d", name, code, signal))
                end,
            })
        end,
    })
end

for server_name, config_path in pairs(servers) do
    setup_server(server_name, config_path)
end
```

Then in `lua/lsp/stan.lua` add the following:
```lua
return {
    cmd = { "stan-language-server", "--stdio" },
    filetypes = { "stan" },
    root_markers = { ".git" },
    settings = {
        maxLineLength = 78,
        includePaths = {},
    },
}
```

### Zed

Install the [Stan extension](https://zed.dev/extensions/stan).

### Sublime Text 4

Using [LSP for Sublime Text](https://lsp.sublimetext.io/),
[download the latest release](https://github.com/tomatitito/stan-language-server/releases)
and add the following to the settings file:

```json
{
  "clients": {
    "stan-lsp": {
      "enabled": true,
      "command": ["/YOUR/PATH/TO/stan-language-server", "--stdio"],
      "selector": "source.stan | source.stanfunctions",
      "initializationOptions": {},
      "settings": {
        "stan-language-server": { "includePaths": [], "maxLineLength": 78 }
      }
  }
}

```

### Emacs (eglot)

Assuming you are using [stan-ts-mode](github.com/WardBrian/stan-ts-mode),
[download the latest release](https://github.com/tomatitito/stan-language-server/releases)
and add the following to your `init.el`:

```elisp
; elgot is built in to emacs 29+, but a similar config would work for lsp-mode
(with-eval-after-load 'eglot
    (add-to-list 'eglot-server-programs
        '(stan-ts-mode . ("/YOUR/PATH/TO/stan-language-server" "--stdio"))))
```


## For developers

To install dependencies:

```bash
bun install
```

Building a binary executable:

```bash
bun build:binary
```

To run unit tests:
```bash
bun test
```

To run end-to-end tests:
```bash
pip install pytest pytest-lsp
bun build:binary && pytest tests/
```
