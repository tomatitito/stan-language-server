# stan-language-server

A language server for the Stan probabilistic programming language written in TypeScript and using Bun to build an executable binary. This is work in progress. 

To install dependencies:

```bash
bun install
```

To run the language server:

```bash
bun run src/server.ts
```

Building a binary executable:

```bash
bun build server.ts --compile --outfile stan-language-server
```

## Configuration
### Sublime Text 4

```json
{
    "clients": {
        "stan-lsp": {
            "enabled": true,
            "command": ["/YOUR/PATH/TO/stan-language-server"], 
            "selector": "source.stan | source.stanfunctions",
            "initializationOptions": {}
        }
    }
}
```

### Emacs (eglot)

Assuming you are using stan-ts-mode:
```elisp
(with-eval-after-load 'eglot
    (add-to-list 'eglot-server-programs 
        '(stan-ts-mode . ("/YOUR/PATH/TO/stan-language-server"))))
```
