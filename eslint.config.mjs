import js from "@eslint/js";
import globals from "globals";

import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";


export default defineConfig([
    {
        extends: ["js/recommended"],
        plugins: {
            js
        },
        languageOptions: {
            globals: {
                ...globals.node,
            },
            ecmaVersion: 2020,
            sourceType: "module",
        },
    },
    tseslint.configs.recommended,
    {
        rules: {
            "no-console": "error",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    args: "all",
                    argsIgnorePattern: "^_",
                    caughtErrors: "all",
                    caughtErrorsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    ignoreRestSiblings: true,
                },
            ]
        }
    },
    {
        files: ["src/server/cli.ts"],
        rules: { "no-console": "off" },
    },
    {
        files: ["src/__tests__/**"],
        rules: {
            "no-console": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": "off"
        },
    }
]);
