// @ts-ignore
import { encode, decode } from "../src/index.ts"

const date = new Date()
const encoded = encode(date)
const decoded = decode(encoded)
console.log(date)
console.log(decoded)