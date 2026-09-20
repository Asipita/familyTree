const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..");
const direct = "postgresql://tester:password@local.example/test";
const override = "postgresql://tester:password@override.example/test";
const pooled = "postgresql://tester:password@local-pooler.example/test";

function readConfig(files = {}, variables = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), "familytree-db-config-"));
  try {
    for (const [name, content] of Object.entries(files)) writeFileSync(path.join(directory, name), content);
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
      if (key.startsWith("DATABASE_URL") || key.startsWith("DOTENV_CONFIG_") || key.startsWith("__NEXT")) delete env[key];
    }
    Object.assign(env, { NODE_ENV: "development" }, variables);
    const script = `
      const { createRequire, Module } = require('node:module');
      const projectRequire = createRequire(${JSON.stringify(path.join(root, "package.json"))});
      const ts = projectRequire('typescript');
      const filename = ${JSON.stringify(path.join(root, "drizzle.config.ts"))};
      const source = require('node:fs').readFileSync(filename, 'utf8');
      const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
      const configModule = new Module(filename);
      configModule.filename = filename;
      configModule.paths = Module._nodeModulePaths(${JSON.stringify(root)});
      try {
        configModule._compile(compiled, filename);
        console.log(JSON.stringify({ url: configModule.exports.default.dbCredentials.url }));
      } catch (error) { console.log(JSON.stringify({ error: error.message })); }
    `;
    const output = execFileSync(process.execPath, ["-e", script], { cwd: directory, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return JSON.parse(output.trim().split("\n").at(-1));
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("loads .env.local like Next.js and prefers the direct connection", () => {
  assert.deepEqual(readConfig({ ".env.local": `DATABASE_URL=${pooled}\nDATABASE_URL_UNPOOLED=${direct}`, ".env": `DATABASE_URL_UNPOOLED=${override}` }), { url: direct });
});

test("an explicit DATABASE_URL cannot be replaced by a local unpooled URL", () => {
  assert.deepEqual(readConfig({ ".env.local": `DATABASE_URL_UNPOOLED=${direct}` }, { DATABASE_URL: override }), { url: override });
});

test("honors an explicitly selected environment file without loading .env.local", () => {
  assert.deepEqual(readConfig({ ".env.local": `DATABASE_URL_UNPOOLED=${direct}`, ".env.check": `DATABASE_URL_UNPOOLED=${override}` }, { DOTENV_CONFIG_PATH: ".env.check" }), { url: override });
});

test("honors Next.js environment-specific precedence", () => {
  assert.deepEqual(readConfig({ ".env.local": `DATABASE_URL_UNPOOLED=${direct}`, ".env.production.local": `DATABASE_URL_UNPOOLED=${override}` }, { NODE_ENV: "production" }), { url: override });
});

test("a missing explicit environment file fails instead of targeting the app database", () => {
  assert.match(readConfig({ ".env.local": `DATABASE_URL_UNPOOLED=${direct}` }, { DOTENV_CONFIG_PATH: ".env.missing" }).error, /could not be loaded/);
});

test("missing credentials fail with actionable instructions", () => {
  assert.match(readConfig().error, /Set DATABASE_URL_UNPOOLED/);
});

test("pooled connections are rejected for migrations", () => {
  assert.match(readConfig({}, { DATABASE_URL: pooled }).error, /require a direct connection/);
});
