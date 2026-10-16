import { z } from "zod";

export function registerTagTools(server, api) {
  server.tool(
    "list_tags",
    "Retrieve all available tags for labeling and organizing documents. Returns tag names, colors, and matching rules for automatic assignment.",
    {
    // No parameters - returns all available tags
  }, async (args, extra) => {
    if (!api) throw new Error("Please configure API connection first");
    return api.getTags();
  });

  server.tool(
    "create_tag",
    "Create a new tag for labeling and organizing documents. Tags can have colors for visual identification and automatic matching rules for smart assignment.",
    {
      name: z.string().describe("Tag name for labeling and organizing documents (e.g., 'important', 'taxes', 'receipts'). Must be unique and descriptive."),
      color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional().describe("Hex color code for visual identification (e.g., '#FF0000' for red, '#00FF00' for green). If not provided, Paperless assigns a random color."),
      match: z.string().optional().describe("Text pattern to automatically assign this tag to matching documents. Use keywords, phrases, or regular expressions depending on matching_algorithm."),
      matching_algorithm: z.number().int().min(0).max(4).optional().describe("How to match text patterns: 0=any word, 1=all words, 2=exact phrase, 3=regular expression, 4=fuzzy matching. Default is 0 (any word)."),
    },
    async (args, extra) => {
      if (!api) throw new Error("Please configure API connection first");
      return api.createTag(args);
    }
  );

  server.tool(
    "update_tag",
    "Modify an existing tag's name, color, or automatic matching rules. Useful for refining tag organization and improving automatic document classification.",
    {
      id: z.number().describe("ID of the tag to update. Use list_tags to find existing tag IDs."),
      name: z.string().describe("New tag name. Must be unique among all tags."),
      color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional().describe("New hex color code for visual identification (e.g., '#FF0000' for red). Leave empty to keep current color."),
      match: z.string().optional().describe("Text pattern for automatic tag assignment. Empty string removes auto-matching. Use keywords, phrases, or regex depending on matching_algorithm."),
      matching_algorithm: z.number().int().min(0).max(4).optional().describe("Algorithm for pattern matching: 0=any word, 1=all words, 2=exact phrase, 3=regular expression, 4=fuzzy matching."),
    },
    async (args, extra) => {
      if (!api) throw new Error("Please configure API connection first");
      return api.updateTag(args.id, args);
    }
  );


}
