const { readFileSync } = require("node:fs");
const { Module } = require("node:module");
const path = require("node:path");
const ts = require("typescript");

// Load server modules in isolation, replacing only explicitly supplied dependencies.
module.exports = function createLoader(mocks = {}) {
  const root = path.resolve(__dirname, "../..");
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = new Module(filename, module);
    loaded.filename = filename;
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    const originalRequire = loaded.require.bind(loaded);
    loaded.require = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier.startsWith("@/")) return load(`src/${specifier.slice(2)}.ts`);
      return originalRequire(specifier);
    };
    cache.set(filename, loaded);
    loaded._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText, filename);
    return loaded.exports;
  }
  return load;
};
