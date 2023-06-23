import { encode, decode } from "../dist/index.js"

export default function (runner, assertEquals) {
    runner("Array", () => {
        const array = [0xffffffff, Math.random(), -Infinity, Math.random(), Infinity, Math.random(), NaN]
        assertEquals(array, decode(encode(array)))
    })
}