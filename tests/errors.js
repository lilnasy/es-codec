import { encode, decode } from "../es-codec.js"

export default function (runner, assertEquals) {
    
    runner("Error", () => {
        const error = new Error("test")
        assertEquals(decode(encode(error)), error)
    })    
    
    runner("Error - cause", () => {
        const error = new Error("test", { cause : { xyz: 5 } })
        assertEquals(decode(encode(error)), error)
    })
    
    runner("Error - cause undefined", () => {
        const error = new Error("test", { cause : undefined })
        assertEquals(decode(encode(error)), error)
    })

    runner("Error - cause self", () => {
        const error = new Error("test")
        error.cause = error
        assertEquals(decode(encode(error)), error)
    })

    runner("Error - subclasses", () => {

        const typeError = new TypeError("test")
        assertEquals(decode(encode(typeError)), typeError)

        const rangeError = new RangeError("test")
        assertEquals(decode(encode(rangeError)), rangeError)

        const referenceError = new ReferenceError("test")
        assertEquals(decode(encode(referenceError)), referenceError)

        const syntaxError = new SyntaxError("test")
        assertEquals(decode(encode(syntaxError)), syntaxError)

        const uriError = new URIError("test")
        assertEquals(decode(encode(uriError)), uriError)

        const evalError = new EvalError("test")
        assertEquals(decode(encode(evalError)), evalError)

    })
}
