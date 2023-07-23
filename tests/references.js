import { encode, decode } from "../es-codec.js"

export default function (runner, assertEquals) {
    runner("References", () => {
        const number = 12351235621
        const bigint = 0xffffffffffffffffn
        const string = "Hello, world!"
        const object = { foo: "bar" }
        const uint8array = new Uint8Array([ 123, 124, 125 ])
        const dataview = new DataView(uint8array.buffer)

        const error = new Error("Hello, world!", { cause: object })
        assertEquals(decode(encode(error)), error)

        const array = [number, bigint, string, object, error, uint8array, dataview]
        array.push(array)
        assertEquals(decode(encode(array)), array)

        const set = new Set([object, array, error])
        set.add(set)
        assertEquals(decode(encode(set)), set)
        
        const map = new Map
        map.set(map, object)
        map.set(object, array)
        map.set(array, set)
        map.set(set, error)
        map.set(error, uint8array)
        map.set(uint8array, dataview)
        map.set(dataview, map)
        
        assertEquals(decode(encode(map)), map)
    })
}