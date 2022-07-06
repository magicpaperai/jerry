import _ from 'lodash'

function getNodeMap(root, node, offset = 0): {span: Address, map: Map<Node, Address>} {
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
  return {
    span: new Address(root, offset, scanOffset),
    map: new Map(_.flatMap(children, m => Array.from(m || []))),
  }
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
    const {map} = getNodeMap(this.root)
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
    if (!this.isLeaf()) return null
    if (this.start === 0 && this.end === this.root.length) {
      return this
    }
    const rest = this.root.splitText(this.start)
    const tail = rest.splitText(this.end - this.start)
    return new Address(tail.previousSibling, 0, this.end - this.start)
  }

  isLeaf() {
    if (this.root.nodeType === 3) return true
    return !this.root?.childNodes
  }

  wrap(className = 'highlight') {
    if (!this.isLeaf()) {
      this.toLeafs().forEach(leaf => leaf.toAtom().wrap(className))
    } else {
      const parentNode = this.root.parentNode
      const wrapped = document.createElement('span')
      wrapped.classList.add(className)
      parentNode.replaceChild(wrapped, this.root)
      wrapped.appendChild(this.root)
    }
  }
}

class Jerry {
  span: Address
  map: Map<Node, Address>
  node: Node

  constructor(node = document.body) {
    const {map, span} = getNodeMap(node)
    this.node = node
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
}

if (typeof window !== 'undefined') (window as any).Jerry = Jerry
export default Jerry
