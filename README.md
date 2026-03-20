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

#### Mason

The Stan language server is installable with
[Mason](https://github.com/mason-org/mason.nvim) by running `:MasonInstall
stan-language-server`.

#### Manual install

The language server can also be configured manually by first installing
the language server executable. This can be done directly via `npm install -g
stan-language-server-bin` or by downloading the latest executable from
[GitHub](https://github.com/tomatitito/stan-language-server/releases) and putting
it somewhere in your `PATH`.

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
add the following to your `init.el`.
This will download the latest release the first time you load a Stan file.

```elisp
(require 'package)
;; elgot is built in to emacs 29+, but some features work better if you use the
;; latest version from GNU ELPA
(add-to-list 'package-archives '("gnu-devel" . "https://elpa.gnu.org/devel/"))
(package-initialize)

;; work around https://debbugs.gnu.org/cgi/bugreport.cgi?bug=69423
(assq-delete-all 'eglot package--builtins)
(assq-delete-all 'eglot package--builtin-versions)

(defcustom bmw/stan-language-server-location
  (expand-file-name (concat "bin/stan-language-server" (car exec-suffixes)) user-emacs-directory)
  "Location to download the stan-language-server binary to."
  :type 'file
  :group 'stan)

(use-package url)

(defun bmw/download-stan-language-server (&optional force)
  "Download the latest copy of the stan-language-server.
The location is determined by stan-ts-mode-language-server-location.
Argument FORCE will make the download proceed even if the file exists."
  (interactive "P")
  (when (or force (not (file-exists-p bmw/stan-language-server-location)))
    (let*
        ((version
          (with-temp-buffer
            (url-insert-file-contents
             "https://api.github.com/repos/tomatitito/stan-language-server/releases/latest")
            (let ((json  (json-parse-buffer)))
              (gethash "tag_name" json))))
         (os-tag
          (pcase system-type
            ((or 'windows-nt 'cygwin 'ms-dos) "windows-x86_64")
            ('darwin (concat "macos-"
                             (if (string-match-p "aarch64\\|arm" system-configuration ) "aarch64" "x86_64") ))
            (_  (concat "linux-"
                        (if (string-match-p "aarch64\\|arm" system-configuration ) "arm64" "x86_64")))))
         (url
          (concat
           "https://github.com/tomatitito/stan-language-server/releases/download/"
           version
           "/stan-ls-"
           version
           "-"
           os-tag
           (car exec-suffixes)))
         (file bmw/stan-language-server-location))
      (make-empty-file file t)
      (delete-file file)
      (url-copy-file url file)
      (chmod file 500))))

(use-package eglot
  :ensure t
  :pin gnu-devel
  :hook ((stan-ts-base-mode . bmw/download-stan-language-server)
         (stan-ts-base-mode . eglot-ensure))
  :config
  (add-to-list
   'eglot-server-programs
   `(stan-ts-base-mode . (,bmw/stan-language-server-location "--stdio"))))
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
