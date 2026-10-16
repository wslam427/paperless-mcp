import { z } from "zod";

export function registerDocumentTypeTools(server, api) {
  server.tool(
    "list_document_types",
    "Retrieve all available document types for categorizing documents by purpose or format (Invoice, Receipt, Contract, etc.). Returns names and automatic matching rules.",
    {
    // No parameters - returns all available document types
  }, async (args, extra) => {
    if (!api) throw new Error("Please configure API connection first");
    return api.getDocumentTypes();
  });

  server.tool(
    "create_document_type",
    "Create a new document type for categorizing documents by their purpose or format (e.g., Invoice, Receipt, Contract). Can include automatic matching rules for smart classification.",
    {
      name: z.string().describe("Name of the document type for categorizing documents by their purpose or format. Examples: 'Invoice', 'Receipt', 'Contract', 'Letter', 'Bank Statement', 'Tax Document'."),
      match: z.string().optional().describe("Text pattern to automatically assign this document type to matching documents. Use keywords that commonly appear in this type of document (e.g., 'invoice', 'receipt', 'contract terms')."),
      matching_algorithm: z
        .enum(["any", "all", "exact", "regular expression", "fuzzy"])
        .optional().describe("How to match text patterns: 'any'=any word matches, 'all'=all words must match, 'exact'=exact phrase match, 'regular expression'=use regex patterns, 'fuzzy'=approximate matching with typos. Default is 'any'."),
    },
    async (args, extra) => {
      if (!api) throw new Error("Please configure API connection first");
      return api.createDocumentType(args);
    }
  );

}
