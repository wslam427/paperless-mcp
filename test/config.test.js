const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"); const os = require("os"); const path = require("path");
const { spawn } = require("child_process");
const { parseEnvFile, resolveLocalConfig, positionalArgs } = require("../build/config");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "pmcp-"));

test("parseEnvFile handles comments, quotes, export", () => {
  assert.deepStrictEqual(parseEnvFile('# c\nexport PAPERLESS_URL="http://a:8000"\nPAPERLESS_API_KEY=\'k1\'\nBAD LINE\n'),
    { PAPERLESS_URL: "http://a:8000", PAPERLESS_API_KEY: "k1" });
});

test("positional args win over env", () => {
  const c = resolveLocalConfig(["http://x", "t"], { PAPERLESS_URL: "http://e", PAPERLESS_API_KEY: "e" }, tmp());
  assert.deepStrictEqual(c, { baseUrl: "http://x", token: "t", source: "args" });
});

test("no args: process env used", () => {
  const c = resolveLocalConfig([], { PAPERLESS_URL: "http://e", PAPERLESS_API_KEY: "ek" }, tmp());
  assert.strictEqual(c.baseUrl, "http://e"); assert.strictEqual(c.token, "ek"); assert.strictEqual(c.source, "env");
});

test("no args: ./.env used, process env takes precedence per key", () => {
  const d = tmp(); fs.writeFileSync(path.join(d, ".env"), "PAPERLESS_URL=http://file\nPAPERLESS_API_KEY=fk\n");
  assert.deepStrictEqual(resolveLocalConfig([], {}, d), { baseUrl: "http://file", token: "fk", source: "env" });
  assert.strictEqual(resolveLocalConfig([], { PAPERLESS_API_KEY: "envk" }, d).token, "envk");
});

test("PAPERLESS_ENV_FILE overrides ./.env; missing file -> none", () => {
  const d = tmp(); const f = path.join(d, "custom.env"); fs.writeFileSync(f, "PAPERLESS_URL=http://c\nPAPERLESS_API_KEY=ck\n");
  assert.strictEqual(resolveLocalConfig([], { PAPERLESS_ENV_FILE: f }, tmp()).token, "ck");
  assert.strictEqual(resolveLocalConfig([], { PAPERLESS_ENV_FILE: path.join(d, "nope") }, tmp()).source, "none");
});

test("positionalArgs strips flags and --port value", () => {
  assert.deepStrictEqual(positionalArgs(["--port", "3000", "--http"]), []);
  assert.deepStrictEqual(positionalArgs(["u", "t", "--port", "1"]), ["u", "t"]);
});

function run(env, cwd) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(__dirname, "../build/index.js")], { env: { PATH: process.env.PATH, ...env }, cwd });
    let out = ""; p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (out += d));
    const msgs = [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "1" } } },
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
    ];
    p.stdin.write(msgs.map((m) => JSON.stringify(m)).join("\n") + "\n");
    setTimeout(() => p.kill(), 1500);
    p.on("close", (code) => resolve({ code, out }));
  });
}

test("e2e: server starts from .env with no args and never prints the secret", async () => {
  const d = tmp(); const secret = "SECRET-TOKEN-should-not-appear-123";
  fs.writeFileSync(path.join(d, ".env"), `PAPERLESS_URL=http://paperless.invalid\nPAPERLESS_API_KEY=${secret}\n`);
  const { out } = await run({}, d);
  assert.match(out, /search_documents/);
  assert.ok(!out.includes(secret));
  assert.ok(!out.includes("paperless.invalid"));
});

test("e2e: no args and no env -> usage + exit 1, no crash", async () => {
  const { code, out } = await run({}, tmp());
  assert.strictEqual(code, 1); assert.match(out, /PAPERLESS_API_KEY/);
});
