// Delete-free fork guard. Every outbound HTTP call to Paperless goes through
// guardedFetch, which refuses DELETE outright and refuses any bulk_edit /
// bulk_edit_objects request whose method/operation is destructive.

export const BLOCKED_HTTP_METHODS = ["DELETE"];

export const ALLOWED_BULK_DOCUMENT_METHODS = [
  "set_correspondent",
  "set_document_type",
  "set_storage_path",
  "add_tag",
  "remove_tag",
  "modify_tags",
  "reprocess",
];

export class DestructiveOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DestructiveOperationError";
  }
}

export function assertSafeHttpMethod(method?: string) {
  const m = (method || "GET").toUpperCase();
  if (BLOCKED_HTTP_METHODS.includes(m)) {
    throw new DestructiveOperationError(
      `Refused: HTTP ${m} is blocked in this delete-free build.`
    );
  }
}

export function assertSafeBulkMethod(method: unknown) {
  if (typeof method !== "string" || !ALLOWED_BULK_DOCUMENT_METHODS.includes(method)) {
    throw new DestructiveOperationError(
      `Refused: bulk_edit method '${String(method)}' is not allowed in this delete-free build.`
    );
  }
}

function assertSafeBody(url: string, body: unknown) {
  if (/\/bulk_edit_objects\/?/.test(url)) {
    throw new DestructiveOperationError(
      "Refused: bulk_edit_objects is not allowed in this delete-free build."
    );
  }
  if (/\/documents\/bulk_edit\/?/.test(url)) {
    let parsed: any;
    try {
      parsed = typeof body === "string" ? JSON.parse(body) : undefined;
    } catch {
      parsed = undefined;
    }
    assertSafeBulkMethod(parsed?.method);
  }
}

export async function guardedFetch(
  url: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  assertSafeHttpMethod(init.method);
  assertSafeBody(url, init.body);
  return fetchImpl(url, init);
}
