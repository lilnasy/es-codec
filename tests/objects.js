import { encode, decode } from "../es-codec.js"

export default function (runner, assertEquals) {
    runner("Simple object", () => {
        const object = { a : 5, b : "hello" }
        assertEquals(object, decode(encode(object)))
    })

    runner("Nested object", () => {
        const object = { a : 5, b : { c : "hello" } }
        assertEquals(object, decode(encode(object)))
    })

    runner("Circular object", () => {
        const x = {}
        const y = {}
        x.circle = y
        y.back = x
        assertEquals(x, decode(encode(x)))
    })
}