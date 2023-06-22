// @ts-ignore
import { encode, decode } from "../src/index.ts"

// @ts-ignore
const error = new SyntaxError("test", { cause : 4 })
const encoded = encode(error)
const decoded = decode(encoded)
// @ts-ignore
console.log(error.cause)
console.log(decoded.cause)
