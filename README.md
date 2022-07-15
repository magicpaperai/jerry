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

- `Address#highlight(className = 'highlight)`

highlight the content at a given address (takes an optional className to apply).

- `Jerry#serialize(): string[]`

serializes all highlights for storage or transmission.

- `Jerry#deserialize(highlights: string[]): Address[]`

deserialize a serialization result back into Addresses.

- `Address#getHash(): number`

get the hash of the content at an address.
