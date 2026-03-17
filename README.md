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

Download the latest language server executable from [GitHub](https://github.com/tomatitito/stan-language-server/releases) and put it somewhere in your `PATH`.

#### Neovim 0.11+ (built-in LSP)

Add `lsp/stan_ls.lua` to your Neovim config directory (e.g., `~/.config/nvim/`):

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

Then enable it:

```lua
vim.lsp.enable("stan_ls")
```

#### Older Neovim (with nvim-lspconfig)

```lua
local lspconfig = require("lspconfig")
local configs = require("lspconfig.configs")

configs.stan_ls = {
    default_config = {
        cmd = { "stan-language-server", "--stdio" },
        filetypes = { "stan" },
        root_dir = lspconfig.util.root_pattern(".git"),
        settings = {
            maxLineLength = 78,
            includePaths = {},
        },
    },
}

lspconfig.stan_ls.setup({})
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

Assuming you are using [stan-ts-mode](https://github.com/WardBrian/stan-ts-mode),
[download the latest release](https://github.com/tomatitito/stan-language-server/releases)
and add the following to your `init.el`:

```elisp
; elgot is built in to emacs 29+, but some features work better if you use the
;; latest version from GNU ELPA
(require 'package)
(add-to-list 'package-archives '("gnu" . "https://elpa.gnu.org/packages/") t)
(package-initialize)

(use-package eglot
  :ensure t
  :demand t
  :pin gnu
  :hook (stan-ts-mode . eglot-ensure)
  :config
  (add-to-list 'eglot-server-programs '(stan-ts-mode .
  ("PATH/TO/stan-language-server" "--stdio"))))
```


## For developers

Development uses [bun](https://bun.sh/)

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
bun test:e2e
```

