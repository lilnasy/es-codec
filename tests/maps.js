import { encode, decode } from "../es-codec.js"

export default function (runner, assertEquals) {
    runner("Map", () => {
        const map = new Map
        map.set(5, "5")
        map.set("5", 5)
        assertEquals(map, decode(encode(map)))
    })
}