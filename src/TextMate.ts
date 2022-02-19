import type { ScopeName, TextMateGrammar, ScopeNameInfo } from "./providers";

// @ts-ignore
import * as onig_wasm from "vscode-oniguruma/release/onig.wasm";
import * as monaco from "monaco-editor";
import { SimpleLanguageInfoProvider } from "./providers";
import { registerLanguages } from "./register";
import VsCodeDarkTheme from "./vs-dark-plus-theme";
import {
  createOnigScanner,
  createOnigString,
  loadWASM,
} from "vscode-oniguruma";

import PythonConfiguration from "./python-configuration";
import PythonGrammar from "./python-grammar";
import * as gdscript_grammar from "./languages/GDScript.tmLanguage.json";
import * as gdscript_configuration from "./languages/gdscript-configuration.json";
import { rehydrateRegexps } from "./configuration";
import { LanguageId } from "./register";

type Monaco = typeof monaco;

interface DemoScopeNameInfo extends ScopeNameInfo {
  path: string;
}

export async function registerLanguagesForMonaco(monaco: Monaco) {
  // @ts-ignore
  const module = await onig_wasm;
  const { default: uri } = module;
  const response = await fetch(uri);
  await loadWASM(response);
  const onigLib = Promise.resolve({
    createOnigScanner,
    createOnigString,
  });

  const languages: monaco.languages.ILanguageExtensionPoint[] = [
    {
      id: "gdscript",
      aliases: ["GDScript", "gdscript"],
      extensions: [".gd"],
    },
    {
      id: "python",
      extensions: [
        ".py",
        ".rpy",
        ".pyw",
        ".cpy",
        ".gyp",
        ".gypi",
        ".pyi",
        ".ipy",
        ".bzl",
        ".cconf",
        ".cinc",
        ".mcconf",
        ".sky",
        ".td",
        ".tw",
      ],
      aliases: ["Python", "py"],
      filenames: ["Snakefile", "BUILD", "BUCK", "TARGETS"],
      firstLine: "^#!\\s*/?.*\\bpython[0-9.-]*\\b",
    },
  ];
  const grammars: { [scopeName: string]: DemoScopeNameInfo } = {
    "source.gdscript": {
      language: "gdscript",
      path: "GDScript.tmLanguage.json",
    },
    "source.python": {
      language: "python",
      path: "MagicPython.tmLanguage.json",
    },
  };

  function fetchGrammar(scopeName: string): Promise<TextMateGrammar> {
    switch (scopeName) {
      case "source.gdscript":
        return Promise.resolve({
          type: "json",
          grammar: JSON.stringify(gdscript_grammar),
        });
      case "source.python":
        return Promise.resolve({
          type: "json",
          grammar: JSON.stringify(PythonGrammar),
        });
      default:
        return Promise.reject(`No grammar found for ${scopeName}`);
    }
  }

  function fetchConfiguration(language: LanguageId) {
    switch (language) {
      case "gdscript":
        return Promise.resolve(
          rehydrateRegexps(JSON.stringify(gdscript_configuration))
        );
      case "python":
        return Promise.resolve(
          rehydrateRegexps(JSON.stringify(PythonConfiguration))
        );
      default:
        return Promise.reject(`No configuration found for ${language}`);
    }
  }

  const provider = new SimpleLanguageInfoProvider({
    grammars,
    fetchGrammar,
    configurations: languages.map((language) => language.id),
    fetchConfiguration,
    theme: VsCodeDarkTheme,
    onigLib,
    monaco,
  });
  registerLanguages(
    languages,
    (language: LanguageId) => provider.fetchLanguageInfo(language),
    monaco
  );
  provider.injectCSS();
}
