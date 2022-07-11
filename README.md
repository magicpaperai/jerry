# jerry

![jerry](jerry.svg)

jerry is a javascript package for text-content addressing on the web

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

- `Jerry#gatherHighlights(): Address[]`

returns the addresses for all highlights.

- `Jerry#serialize(): string[]`

serializes all highlights for storage or transmission.

- `Address#getContent(): string`

get the text content at the address.

- `Address#getHash(): number`

get the hash of the content at an address.

- `Address#highlight(className = 'highlight)`

highlight the content at a given address (takes an optional className to apply).
