# jerry

![jerry](jerry.svg)

jerry is a javascript package for text-content addressing on the web

## docs

- `new Jerry(root = document.body)`

create a Jerry instance around a given root node.

- `Jerry#getNodeAddress(node): Address`

get the address for a given DOM node (relative to root node).

- `Jerry#getSelection(): Address`

get the address of the current user selection.

- `Jerry#gatherHighlights(): Address[]`

returns the addresses for all highlights.

- `new Address(root: Node, start: number, end: number)`

create an Address spanning a range relative to a given root node.

- `Address#getContent(): string`

get the text content at the address.

- `Address#getHash(): number`

get the hash of the content at an address.

- `Address#highlight(className = 'highlight)`

highlight the content at a given address (takes an optional className to apply).
