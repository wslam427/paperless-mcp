import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

export function registerCorrespondentTools(server: McpServer, api) {
  server.tool(
    "list_correspondents",
    "Retrieve all available correspondents (people, companies, organizations that send/receive documents). Returns names and automatic matching patterns for document assignment.",
    { }, async (args, extra) => {
    if (!api) throw new Error("Please configure API connection first");
    return api.getCorrespondents();
  });

  server.tool(
    "create_correspondent",
    "Create a new correspondent (person, company, or organization) for tracking document senders and receivers. Can include automatic matching patterns for smart assignment to incoming documents.",
    {
      name: z.string().describe("Name of the correspondent (person, company, or organization that sends/receives documents). Examples: 'Bank of America', 'John Smith', 'Electric Company'."),
      match: z.string().optional().describe("Text pattern to automatically assign this correspondent to matching documents. Use names, email addresses, or keywords that appear in documents from this correspondent."),
      matching_algorithm: z
        .enum(["any", "all", "exact", "regular expression", "fuzzy"])
        .optional().describe("How to match text patterns: 'any'=any word matches, 'all'=all words must match, 'exact'=exact phrase match, 'regular expression'=use regex patterns, 'fuzzy'=approximate matching with typos. Default is 'any'."),
    },
    async (args, extra) => {
      if (!api) throw new Error("Please configure API connection first");
      return api.createCorrespondent(args);
    }
  );

}
