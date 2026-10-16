const test = require("node:test");
const assert = require("node:assert");
const { guardedFetch, assertSafeBulkMethod, DestructiveOperationError } = require("../build/api/guard");
const { PaperlessAPI } = require("../build/api/PaperlessAPI");
const { registerDocumentTools } = require("../build/tools/documents");
const { registerTagTools } = require("../build/tools/tags");
const { registerCorrespondentTools } = require("../build/tools/correspondents");
const { registerDocumentTypeTools } = require("../build/tools/documentTypes");

function fakeServer() {
  const tools = {};
  return { tools, tool: (name, _d, schema, fn) => { tools[name] = { schema, fn }; } };
}
function allTools(api = {}) {
  const s = fakeServer();
  registerDocumentTools(s, api); registerTagTools(s, api);
  registerCorrespondentTools(s, api); registerDocumentTypeTools(s, api);
  return s.tools;
}

test("exposes exactly the delete-free tool set", () => {
  assert.deepStrictEqual(Object.keys(allTools()).sort(), [
    "bulk_edit_documents", "create_correspondent", "create_document_type", "create_tag",
    "download_document", "get_document", "list_correspondents", "list_document_types",
    "list_tags", "post_document", "search_documents", "update_tag",
  ]);
});

test("no tool name contains delete", () => {
  for (const n of Object.keys(allTools())) assert.ok(!/delete/i.test(n), n);
});

test("guardedFetch refuses DELETE (any case) without calling fetch", async () => {
  let called = false;
  const f = async () => { called = true; return new Response("{}"); };
  for (const m of ["DELETE", "delete", "Delete"]) {
    await assert.rejects(guardedFetch("http://x/api/tags/1/", { method: m }, f), DestructiveOperationError);
  }
  assert.strictEqual(called, false);
});

test("guardedFetch refuses destructive bulk_edit methods and bulk_edit_objects", async () => {
  const f = async () => new Response("{}");
  for (const method of ["delete", "merge", "split", "rotate", "delete_pages", "set_permissions", undefined]) {
    await assert.rejects(guardedFetch("http://x/api/documents/bulk_edit/", { method: "POST", body: JSON.stringify({ documents: [1], method }) }, f), DestructiveOperationError);
  }
  await assert.rejects(guardedFetch("http://x/api/bulk_edit_objects/", { method: "POST", body: JSON.stringify({ operation: "delete" }) }, f), DestructiveOperationError);
});

test("guardedFetch allows GET, POST, PUT and safe bulk methods", async () => {
  const f = async () => new Response("{}");
  await guardedFetch("http://x/api/documents/", {}, f);
  await guardedFetch("http://x/api/tags/", { method: "POST", body: "{}" }, f);
  await guardedFetch("http://x/api/tags/1/", { method: "PUT", body: "{}" }, f);
  await guardedFetch("http://x/api/documents/bulk_edit/", { method: "POST", body: JSON.stringify({ documents: [1], method: "add_tag" }) }, f);
});

test("assertSafeBulkMethod rejects non-strings", () => {
  assert.throws(() => assertSafeBulkMethod(null), DestructiveOperationError);
});

test("PaperlessAPI: no delete methods; bulk_edit delete never reaches the network", async () => {
  const api = new PaperlessAPI("http://paperless.invalid", "dummy");
  assert.strictEqual(api.deleteTag, undefined);
  assert.strictEqual(api.bulkEditObjects, undefined);
  const orig = globalThis.fetch; let called = false;
  globalThis.fetch = async () => { called = true; return new Response("{}"); };
  try {
    await assert.rejects(api.bulkEditDocuments([1], "delete"), DestructiveOperationError);
    await assert.rejects(api.request("/documents/1/", { method: "DELETE" }), DestructiveOperationError);
    assert.strictEqual(called, false);
    await api.getTags();
    assert.strictEqual(called, true);
  } finally { globalThis.fetch = orig; }
});

test("bulk_edit_documents tool schema rejects delete", () => {
  const { schema } = allTools().bulk_edit_documents;
  assert.throws(() => schema.method.parse("delete"));
  assert.strictEqual(schema.method.parse("add_tag"), "add_tag");
  assert.strictEqual(schema.delete_originals, undefined);
});
