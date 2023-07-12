# es-codec
es-codec is an efficient, zero-dependency, compact serialization library for Node, Deno, and browsers. It is tailor-made for client-server communication where both the client and server are modern js environments. It supports a subset of objects supported by structuredClone that are avaialable on all browser, server, and edge runtimes.

## Getting Started
```bash
npm install lilnasy/es-codec
pnpm add lilnasy/es-codec
yarn add lilnasy/es-codec
```
```bash
deno cache https://github.com/lilnasy/es-codec/raw/main/es-codec.ts
```

## Usage
```ts
// browser
// import { encode, decode, NotSerializable } from 'https://cdn.jsdelivr.net/gh/lilnasy/es-codec/es-codec.js'
// import { encode, decode, NotSerializable } from 'https://esm.sh/gh/lilnasy/es-codec'

// deno
// import { encode, decode, NotSerializable } from 'https://github.com/lilnasy/es-codec/raw/main/es-codec.ts'

// node
import { encode, decode, NotSerializable } from 'es-codec'

const object        = { foo: 'bar' }
const encodedObject = encode(object) satisfies ArrayBuffer
const decodedObject = decode(encodedObject) as typeof object

const array        = [1, true, null, "foo"]
const encodedArray = encode(array) satisfies ArrayBuffer
const decodedArray = decode(encodedArray) as typeof array

const map        = new Map([['foo', 'bar']])
const encodedMap = encode(map) satisfies ArrayBuffer
const decodedMap = decode(encodedMap) as typeof map

const set        = new Set(1, true, null, "foo")
const encodedSet = encode(set) as ArrayBuffer 
const decodedSet = decode(encodedSet) as typeof set

const date        = new Date()
const encodedDate = encode(date) as ArrayBuffer
const decodedDate = decode(encodedDate) as typeof date

const Error        = new Error('foo')
const encodedError = encode(Error) as ArrayBuffer
const decodedError = decode(encodedError) as typeof Error

const byteArray        = new Uint8Array([1, 2, 3])
const encodedByteArray = encode(byteArray) as ArrayBuffer
const decodedByteArray = decode(encodedByteArray) as typeof byteArray
```

## API
```ts
// throws NotSerializable if object is not serializable symbols, functions, class instances, etc.
function encode(x: unknown): ArrayBuffer

function decode(buffer: ArrayBuffer): unknown

class NotSerializable extends Error {
    value: unknown
}
```

## Stability
The binary format is subject to change until v1. For now, you will have to ensure that you are using the same version of es-codec on both the client and server.

## Limitations
Generally, es-codec is more strict than `structuredClone`. It does not support serializing the following types:
- null-prototype objects: `structuredClone` returns a plain object instead of a null-prototype one. This is likely unintended for users.
- arrays with properties: Supporting this would cause either serialization to become much slower or the binary representation to become much larger.
- Blob, File, ImageData: These are not universally supported among server runtimes.
- RegExp objects will not save their index (e.g. the edgecase of `someRegex.exec("string");someRegex.exec("string")`)


## Benchmarks
TODO: include a benchmark comparing es-codec to JSON, devalue, msgpack, and protobuf for the objects supported by all formats.
