// @ts-ignore
import * as onig_wasm from "vscode-oniguruma/release/onig.wasm";
import * as monaco from "monaco-editor";

import {
  createOnigScanner,
  createOnigString,
  loadWASM,
} from "vscode-oniguruma";

type Monaco = typeof monaco;

export async function registerLanguages(monaco: Monaco) {
  // @ts-ignore
  const module = await onig_wasm;
  const { default: uri } = module;
  const response = await fetch(uri);
  loadWASM(response);
  const onigLib = Promise.resolve({
    createOnigScanner,
    createOnigString,
  });
}
