import { encode, decode } from "../es-codec.js"

export default function (runner, assertEquals) {
    runner("Array", () => {
        const array = [0xffffffff, Math.random(), -Infinity, Math.random(), Infinity, Math.random(), NaN]
        assertEquals(array, decode(encode(array)))
    })
}