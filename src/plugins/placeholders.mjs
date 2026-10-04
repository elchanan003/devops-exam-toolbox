// Placeholder highlighting for <UPPER_SNAKE> tokens.
// 1) remarkPlaceholderMarkers: appends an Expressive Code regex text-marker to every code block's meta.
// 2) rehypeInlinePlaceholders: wraps tokens inside inline <code> in <span class="ph">.
import { visit } from 'unist-util-visit';

export const PLACEHOLDER_RE = /<[A-Z][A-Z0-9_]*>/g;
const MARKER = '/<[A-Z][A-Z0-9_]*>/';

export function remarkPlaceholderMarkers() {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (node.lang === 'mermaid') return;
      node.meta = `${node.meta ?? ''} ${MARKER}`.trim();
    });
  };
}

export function rehypeInlinePlaceholders() {
  return (tree) => {
    visit(tree, 'element', (node, _i, parent) => {
      if (node.tagName !== 'code' || parent?.tagName === 'pre') return;
      const out = [];
      let changed = false;
      for (const child of node.children) {
        if (child.type !== 'text') { out.push(child); continue; }
        let last = 0;
        for (const m of child.value.matchAll(PLACEHOLDER_RE)) {
          changed = true;
          if (m.index > last) out.push({ type: 'text', value: child.value.slice(last, m.index) });
          out.push({ type: 'element', tagName: 'span', properties: { className: ['ph'] }, children: [{ type: 'text', value: m[0] }] });
          last = m.index + m[0].length;
        }
        if (last < child.value.length) out.push({ type: 'text', value: child.value.slice(last) });
      }
      if (changed) node.children = out;
    });
  };
}
