// @ts-ignore
import { encode, decode } from "../src/index.ts"

const buffer = new ArrayBuffer(10)
const view = new Uint8Array(buffer, 2, 4)
view[0] = 1
view[1] = 2
view[2] = 3
view[3] = 4

const encoded = encode(view)
const decoded = decode(encoded)
console.log(view.buffer)
console.log(decoded.buffer)
