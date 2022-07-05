import _ from 'lodash'

type JerryAddress = {start: number; end: number}
type JerryMap = Map<Node, JerryAddress>
type JerryNode = {span: JerryAddress; map: JerryMap}

class Jerry {
  bodyMap: JerryMap
  bodySpan: JerryAddress

  init() {
    const {map, span} = Jerry.getNodeMap(document.body)
    this.bodyMap = map
    this.bodySpan = span
  }

  static getNodeMap(container, offset = 0): JerryNode {
    if (container.nodeType === 3) {
      const address = {start: offset, end: container.length + offset}
      const leafMap = new Map()
      leafMap.set(container, address)
      return {span: address, map: leafMap}
    }
    if (!container?.childNodes) {
      const address = {start: offset, end: offset}
      const leafMap = new Map()
      leafMap.set(container, address)
      return {span: address, map: leafMap}
    }

    let children = []
    let scanOffset = offset
    Array.from(container.childNodes).forEach(node => {
      const {span, map} = Jerry.getNodeMap(node, scanOffset)
      children.push(map)
      scanOffset = span.end
    })
    return {
      span: {start: offset, end: scanOffset},
      map: new Map(_.flatMap(children, m => Array.from(m || []))),
    }
  }

  getNodeAddress(node): JerryAddress {
    return this.bodyMap.get(node)
  }

  getSelection(): JerryAddress {
    const sel = window.getSelection()
    if (!sel) return null
    const range = sel.getRangeAt(0)
    const startOffset = this.getNodeAddress(range.startContainer)?.start
    const start = range.startOffset + startOffset
    const endOffset = this.getNodeAddress(range.endContainer)?.start
    const end = range.endOffset + endOffset
    return {start, end}
  }
}

if (typeof window !== 'undefined') (window as any).Jerry = Jerry
export default Jerry
