import { encode, decode } from "../es-codec.js"

export default function (runner, assertEquals) {
    runner("Set", () => {
        const set = new Set([0xffffffff, Math.random(), -Infinity, Math.random(), Infinity, Math.random(), NaN])
        assertEquals(set, decode(encode(set)))
    })
}