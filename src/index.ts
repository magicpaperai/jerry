import _ from 'lodash'

function getNodeMap(root, node = null, offset = 0): {span: Address, map: Map<Node, Address>} {
  if (!node && root) return getNodeMap(root, root, offset)
  if (node.nodeType === 3) {
    const address = new Address(root, offset, offset + node.length)
    const leafMap = new Map()
    leafMap.set(node, address)
    return {span: address, map: leafMap}
  }
  if (!node?.childNodes) {
    const address = new Address(root, offset, offset)
    const leafMap = new Map()
    leafMap.set(node, address)
    return {span: address, map: leafMap}
  }

  let children = []
  let scanOffset = offset
  Array.from(node.childNodes).forEach(node => {
    const {span, map} = getNodeMap(root, node, scanOffset)
    children.push(map)
    scanOffset = span.end
  })

  const span = new Address(root, offset, scanOffset)
  const selfMap = new Map()
  selfMap.set(node, span)

  return {
    span,
    map: new Map(_.flatMap([...children, selfMap], m => Array.from(m || []))),
  }
}

function getLeafMap(root) {
  const {map, span} = getNodeMap(root)
  return {span, map: new Map(Array.from(map).filter(x => x[0].nodeType === 3))}
}

function isLeaf(node): node is Text {
  if (node.nodeType === 3) return true
  return false
}

class Address {
  root: Node
  start: number
  end: number

  constructor(root: Node, start: number, end: number) {
    this.root = root
    this.start = start
    this.end = end
  }

  toLeafs(): Address[] {
    if (isLeaf(this.root)) return [this]
    if (!isLeaf(this.root) && !this.root.childNodes) return []
    const {map} = getLeafMap(this.root)
    const inverse = _.chain(Array.from(map))
      .filter(x => x[1].start !== x[1].end)
      .sortBy(x => x[1].start).value()
    const startItem = _.findLast(inverse, x => x[1].start <= this.start)
    const startIndex = inverse.indexOf(startItem)
    const [startNode, startSpan] = startItem
    const endItem = _.find(inverse, x => x[1].end >= this.end)
    const endIndex = inverse.indexOf(endItem)
    const [endNode, endSpan] = endItem
    const startSpot = this.start - startSpan.start
    const endSpot = this.end - endSpan.start
    if (startNode === endNode) return [new Address(startNode, startSpot, endSpot)]
    return [
      new Address(startNode, startSpot, startSpan.end - startSpan.start),
      ...(
        endIndex > startIndex + 1
          ? inverse.slice(startIndex + 1, endIndex).map(x =>
              new Address(x[0], 0, x[1].end - x[1].start)
          ) : []
      ),
      new Address(endNode, 0, endSpot),
    ]
  }

  toAtom() {
    if (!isLeaf(this.root)) return null
    if (this.start === 0 && this.end === this.root.length) {
      return this
    }
    const rest = this.root.splitText(this.start)
    const tail = rest.splitText(this.end - this.start)
    return new Address(tail.previousSibling, 0, this.end - this.start)
  }

  toAtoms() {
    return _.compact(this.toLeafs().map(x => x.toAtom()))
  }

  wrap(className = 'highlight') {
    if (!isLeaf(this.root)) {
      this.toAtoms().forEach(atom => atom.wrap(className))
    } else {
      const parentNode = this.root.parentNode
      if (parentNode.classList.contains(className) && parentNode.childNodes.length === 1) {
        parentNode.parentNode.replaceChild(this.root, parentNode)
      } else if (parentNode.classList.contains(className)) {
        const nodes = Array.from(parentNode.childNodes)
        const nodeIndex = nodes.indexOf(this.root)
        const before = nodes.slice(0, nodeIndex)
        const after = nodes.slice(nodeIndex + 1)
        parentNode.removeChild(this.root)
        after.forEach(afterNode => parentNode.removeChild(afterNode))
        if (parentNode.nextSibling) {
          parentNode.parentNode.insertBefore(this.root, parentNode.nextSibling)
        } else {
          parentNode.parentNode.appendChild(this.root)
        }

        if (after.length) {
          const wrapped = document.createElement('span')
          wrapped.classList.add(className)
          after.forEach(afterNode => wrapped.appendChild(afterNode))
          if (this.root.nextSibling) {
            parentNode.parentNode.insertBefore(wrapped, this.root.nextSibling)
          } else {
            parentNode.parentNode.appendChild(wrapped)
          }
        }
      } else {
        const wrapped = document.createElement('span')
        wrapped.classList.add(className)
        parentNode.replaceChild(wrapped, this.root)
        wrapped.appendChild(this.root)
      }
    }
  }
}

class Jerry {
  span: Address
  map: Map<Node, Address>
  node: Node

  constructor(node = document.body) {
    this.node = node
    this.refresh()
  }

  refresh() {
    const {map, span} = getLeafMap(this.node)
    this.span = span
    this.map = map
  }

  getNodeAddress(node): Address {
    return this.map.get(node)
  }

  getSelection(): Address {
    const sel = window.getSelection()
    if (!sel) return null
    const range = sel.getRangeAt(0)
    const startOffset = this.getNodeAddress(range.startContainer)?.start
    const start = range.startOffset + startOffset
    const endOffset = this.getNodeAddress(range.endContainer)?.start
    const end = range.endOffset + endOffset
    return new Address(this.node, start, end)
  }

  gatherHighlights(className = 'highlight'): Address[] {
    const nodes = Array.from(document.querySelectorAll(`.${className}`))
    const {map} = getNodeMap(this.node)
    // TODO: merge adjacent addresses
    return nodes.map(node => {
      return map.get(node)
    })
  }
}

if (typeof window !== 'undefined') (window as any).Jerry = Jerry
export default Jerry
