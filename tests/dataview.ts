// @ts-ignore
import { encode, decode } from "../src/index.ts"

const dataview = new DataView(new ArrayBuffer(8))
dataview.setFloat64(0, 1.2)
const encoded = encode(dataview)
const decoded = decode(encoded)
console.log(dataview)
console.log(dataview.getFloat64(0))
console.log(decoded)
console.log(decoded.getFloat64(0))
