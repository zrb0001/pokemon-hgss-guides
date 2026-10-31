import { SKIP, visit } from 'unist-util-visit'

export function rehypeTableWrapper() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent) return
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['markdown-table-wrapper'] },
        children: [node]
      }
      return [SKIP, index + 1]
    })
  }
}
