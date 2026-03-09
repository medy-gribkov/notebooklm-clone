import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Text, Parent } from "mdast";

/**
 * Remark plugin that transforms [N] citation brackets in text nodes
 * into <cite data-index="N"> elements for interactive rendering.
 *
 * Matches only bare [N] (1-3 digits), NOT markdown links [text](url)
 * or images ![alt](src).
 */
const remarkCitations: Plugin = () => {
  return (tree) => {
    visit(tree, "text", (node: Text, index: number | undefined, parent: Parent | undefined) => {
      /* v8 ignore next -- @preserve */
      if (index === undefined || !parent) return;
      // Skip text nodes inside cite elements to prevent double-transformation
      if ((parent.type as string) === "cite") return;

      const value = node.value;
      // Match [N] where N is 1-3 digits, but NOT followed by ( which would be a link
      const regex = /\[(\d{1,3})\](?!\()/g;
      let match: RegExpExecArray | null;
      const parts: Array<Text | { type: string; data: { hName: string; hProperties: Record<string, string> }; children: Text[] }> = [];
      let lastIndex = 0;

      while ((match = regex.exec(value)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          parts.push({ type: "text", value: value.slice(lastIndex, match.index) } as Text);
        }

        // Add cite element
        parts.push({
          type: "cite",
          data: {
            hName: "cite",
            hProperties: { "data-index": match[1] },
          },
          children: [{ type: "text", value: `[${match[1]}]` } as Text],
        });

        lastIndex = match.index + match[0].length;
      }

      // If no matches, leave node unchanged
      if (parts.length === 0) return;

      // Add remaining text after last match
      if (lastIndex < value.length) {
        parts.push({ type: "text", value: value.slice(lastIndex) } as Text);
      }

      // Replace the text node with the array of nodes
      parent.children.splice(index, 1, ...parts as never[]);
    });
  };
};

export default remarkCitations;
