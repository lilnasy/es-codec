// @ts-ignore
import { encode, decode } from "../src/index.ts"

const x = "hello"
const encoded = encode("hello")
const decoded = decode(encoded)
console.log(x)
console.log(decoded)
