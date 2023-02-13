# jerry

Pages on the web are modeled as data in the form of a tree. Nodes have child
nodes, such that your average webpage consists of containers of containers of
containers of--ultimately--text or media content. In certain contexts, notably
from the perspective of a user, webpages are better represented with the flat
structure of a more traditional document. Jerry is a framework for translating
between webpages-as-tree-structures and -as-linear-text. With jerry, every
`Node` on a webpage is given an `Address`---which can then be manipulated in
various ways.

![jerry](jerry.svg)

## install

```bash
$ npm install jerrymander
```

## usage

```javascript
const jerry = new Jerry()
jerry.getSelection().highlight()
localStorage.highlights = JSON.stringify(jerry.serialize())
```

## docs

- `new Jerry(root = document.body)`

create a Jerry instance around a given root node.

- `Jerry#getSelection(): Address`

get the address of the current user selection.

- `Address#highlight(className = 'highlight)`

highlight the content at a given address (takes an optional className to apply).

- `Address#select()`

set selected text range to the contents of this address

- `Jerry#serialize(): string[]`

serializes all highlights for storage or transmission.

- `Jerry#deserialize(highlights: string[]): Address[]`

deserialize a serialization result back into Addresses.

- `Address#getHash(): number`

get the hash of the content at an address.
