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
