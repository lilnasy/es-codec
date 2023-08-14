# es-codec
es-codec is an efficient, zero-dependency, compact serialization library for Node, Deno, and browsers. It is tailor-made for client-server communication where both the client and server are modern js environments. It supports a subset of objects supported by structuredClone that are avaialable on all browser, server, and edge runtimes.

## Getting Started
```bash
npm install es-codec
pnpm add es-codec
yarn add es-codec
```
```bash
deno cache https://deno.land/x/escodec/es-codec.ts
```

## Usage
```ts
// browser
// import { encode, decode, NotSerializable } from 'https://cdn.jsdelivr.net/npm/es-codec/es-codec.js'
// import { encode, decode, NotSerializable } from 'https://esm.sh/es-codec/es-codec.js'
// import { encode, decode, NotSerializable } from 'https://unpkg.com/es-codec/es-codec.js'

// deno
// import { encode, decode, NotSerializable } from 'https://deno.land/x/escodec/es-codec.ts'

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

const set        = new Set([1, true, null, "foo"])
const encodedSet = encode(set) satisfies ArrayBuffer 
const decodedSet = decode(encodedSet) as typeof set

const date        = new Date()
const encodedDate = encode(date) satisfies ArrayBuffer
const decodedDate = decode(encodedDate) as typeof date

const regExp        = /([A-Z])+/gm
const encodedRegExp = encode(regExp) satisfies ArrayBuffer
const decodedRegExp = decode(encodedRegExp) as typeof regExp

const error        = new Error('foo')
const encodedError = encode(error) satisfies ArrayBuffer
const decodedError = decode(encodedError) as typeof error

const byteArray        = new Uint8Array([1, 2, 3])
const encodedByteArray = encode(byteArray) satisfies ArrayBuffer
const decodedByteArray = decode(encodedByteArray) as typeof byteArray
```

## API
```ts
// throws NotSerializable if object is not serializable symbols, functions, class instances, etc.
function encode(x: Serializable): ArrayBuffer

function decode(buffer: ArrayBuffer): Serializable

class NotSerializable extends Error {
    value: unknown
}
```

## Advanced: Extensions API
If you want to serialize objects not natively supported by es-codec, you can create your own codec. Here's an example of how you would add support for [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL).
```ts
import { createCodec } from "es-codec"

const { encode, decode } = createCodec([
    {
        name: "URL",
        when  (x)    { return x.constructor === URL },
        encode(url)  { return url.href },
        decode(href) { return new URL(href) }
    }
])
```
The `createCodec` function accepts an array of extensions, where each extension implements the `Extension` interface.
```ts
interface Extension {
    name   : string
    when   : (x : unknown)      : boolean
    encode : (x : any)          : Serializable
    decode : (x : Serializable) : any
}
```
- **name**: This will be used as the tag in the serialized representation. When deserializing, the tag is used to identify the extension that should be used for decoding.
- **when**: This is a function that receives an unsupported object as the argument. It should return true if the extension can encode the provided object.
- **encode**: This is a function that receives all unsupported objects for which `when` returned true. You can "reduce" your custom type in terms of other types that are supported. For example, you can encode a `Graph` as `{ edges: Array<Edge>, nodes: Array<Node> }`. Another extension can encode an `Edge` as `[ from : number, to: number ]`.
- **decode**: This is a function that receives the "reduced" representation created by the extension's `encode` and reconstructs your custom type from it.

Note that you can only provide implementations for types that es-codec does not support by default; it is not possible to change how the native types are encoded or decoded.
### Type-safety
For better type-safety and convenience, a helper function is provided that can automatically infer the types from your extension.
```ts
import { createCodec, defineExtension } from "es-codec"

const urlExtension = defineExtension({

    name: "URL",
    
    // `x is URL` is a type predicate, it is required for
    // defineExtension's type inference
    when(x): x is URL { return x.constructor === URL },
    
    // `url` is inferred as URL
    encode(url) { return url.href },
    
    // `href` is inferred as string
    // return type is inferred as URL
    decode(href) { return new URL(href) }
})

const { encode, decode } = createCodec([ urlExtension ])

// No type error! URL is now a valid argument type for encode.
const encodedURL: ArrayBuffer = encode(new URL("https://example.com"))
```

## Stability
The binary format is subject to change until v1. For now, you will have to ensure that you are using the same version of es-codec on both the client and server.

## Limitations
Generally, es-codec is more strict than `structuredClone`. It does not support serializing the following types:
- null-prototype objects: `structuredClone` returns a plain object instead of a null-prototype one. Implicit replacement of object prototypes is probably a bad idea.
- arrays with properties: Supporting this would cause either serialization to become much slower or the binary representation to become much larger.
- `new Boolean()`, `new Number()`, and `new String()`: The distinction is not made between primitives and their object counterparts created using the `new` keyword. The objects are serialized as if they were primitives.

## Benchmarks
TODO: include a benchmark comparing es-codec to JSON, devalue, msgpack, and protobuf for the objects supported by all formats.
