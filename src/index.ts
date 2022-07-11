import _ from 'lodash'
import djb2 from 'djb2'

type JerryIndex = {
  pointer: Address,
  lookup: Map<Node, Address>,
  content: string
}

function indexNode(root, node = null, offset = 0): JerryIndex {
  if (!node && root) return indexNode(root, root, offset)
  if (node.nodeType === 3) {
    const address = new Address(root, offset, offset + node.length)
    const leafMap = new Map()
    leafMap.set(node, address)
    return {pointer: address, lookup: leafMap, content: root.textContent}
  }
  if (!node?.childNodes) {
    const address = new Address(root, offset, offset)
    const leafMap = new Map()
    leafMap.set(node, address)
    return {pointer: address, lookup: leafMap, content: ''}
  }

  let content = ''
  let children = []
  let scanOffset = offset
  Array.from(node.childNodes).forEach(node => {
    const {pointer, lookup, content: c} = indexNode(root, node, scanOffset)
    children.push(lookup)
    content += c
    scanOffset = pointer.end
  })

  const pointer = new Address(root, offset, scanOffset)
  const selfMap = new Map()
  selfMap.set(node, pointer)

  return {
    pointer,
    lookup: new Map(_.flatMap([...children, selfMap], m => Array.from(m || []))),
    content,
  }
}

function filterMap<K, V>(map: Map<K, V>, f): Map<K, V> {
  return new Map(Array.from(map).filter(x => f(x[0], x[1])))
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

  getContent(): string {
    const {content} = indexNode(this.root)
    return content.substr(this.start, this.end - this.start)
  }

  getHash(): number {
    return djb2(this.getContent())
  }

  toLeafs(): Address[] {
    if (isLeaf(this.root)) return [this]
    if (!isLeaf(this.root) && !this.root.childNodes) return []
    const {lookup} = indexNode(this.root)
    const leafLookup = filterMap(lookup, isLeaf)

    const inverse = _.chain(Array.from(leafLookup))
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

  highlight(className = 'highlight') {
    if (!isLeaf(this.root)) {
      this.toAtoms().forEach(atom => atom.highlight(className))
    } else {
      const parentNode = this.root.parentNode as Element
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

  shift(offset: number): Address {
    return new Address(this.root, this.start + offset, this.end + offset)
  }

  includes(otherAddr: Address): Address {
    if (otherAddr.root !== this.root) return false
    if (this.start <= otherAddr.start && this.end >= otherAddr.end) return true
    return false
  }

  rebase(targetNode: Node = document.body): Address {
    const {lookup} = indexNode(document.body)
    const rootAddr = lookup.get(this.root)
    const targetAddr = lookup.get(targetNode)
    const thisAddr = this.shift(rootAddr.start)
    if (!targetAddr.includes(thisAddr)) return null
    const shiftedAddr = thisAddr.shift(-targetAddr.start)
    return new Address(targetNode, shiftedAddr.start, shiftedAddr.end)
  }
}

class Jerry {
  root: Node
  pointer: Address
  lookup: Map<Node, Address>

  constructor(root = document.body) {
    this.root = root
    this.refresh()
  }

  refresh() {
    const {lookup, pointer} = indexNode(this.root)
    this.pointer = pointer
    this.lookup = lookup
  }

  getNodeAddress(node): Address {
    return this.lookup.get(node)
  }

  static unionAddresses(addrs: Address[]): Address[] {
    // for now, don't union if not all addresses share a root
    if (!addrs.every(x => x.root === addrs[0].root)) return addrs

    const sorted = _.sortBy(addrs, 'start')
    let union = [sorted[0]]
    sorted.slice(1).forEach(x => {
      const prev = _.last(union)
      if (prev.end < x.start) {
        union.push(x)
      } else {
        union[union.length - 1] = new Address(prev.root, prev.start, Math.max(prev.end, x.end))
      }
    })
    return union
  }

  getSelection(): Address {
    const sel = window.getSelection()
    if (!sel) return null
    const range = sel.getRangeAt(0)
    const startOffset = this.getNodeAddress(range.startContainer)?.start
    const start = range.startOffset + startOffset
    const endOffset = this.getNodeAddress(range.endContainer)?.start
    const end = range.endOffset + endOffset
    return new Address(this.root, start, end)
  }

  gatherHighlights(className = 'highlight'): Address[] {
    this.refresh()
    const nodes = Array.from(this.root.querySelectorAll(`.${className}`))
    return Jerry.unionAddresses(nodes.map(node => return this.lookup.get(node)))
  }

  serialize(className = 'highlight'): string[] {
    const highlights = this.gatherHighlights(className)
    return highlights.map(x => x.rebase()).map(addr => `body:${addr.start}-${addr.end}`)
  }
}

if (typeof window !== 'undefined') (window as any).Jerry = Jerry
export default Jerry
