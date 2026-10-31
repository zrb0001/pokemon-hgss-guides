import { toString } from 'mdast-util-to-string'
import { visit } from 'unist-util-visit'

const defaultTitles = {
  info: '说明',
  tip: '提示',
  warning: '注意',
  danger: '警告'
}

export function remarkAdmonitions() {
  return (tree) => {
    visit(tree, 'textDirective', (node, index, parent) => {
      parent.children[index] = { type: 'text', value: `:${node.name}` }
    })
    visit(tree, 'containerDirective', (node) => {
      const kind = defaultTitles[node.name] ? node.name : 'info'
      const firstChild = node.children[0]
      const hasLabel = firstChild?.data?.directiveLabel
      const title = hasLabel ? toString(firstChild) : defaultTitles[kind]
      const titleNode = {
        type: 'paragraph',
        children: [{ type: 'text', value: title }],
        data: {
          hName: 'p',
          hProperties: { className: ['admonition-title'] }
        }
      }

      if (hasLabel) node.children.shift()
      node.children.unshift(titleNode)
      node.data = {
        ...node.data,
        hName: 'aside',
        hProperties: {
          className: ['admonition', `admonition-${kind}`]
        }
      }
    })
  }
}
