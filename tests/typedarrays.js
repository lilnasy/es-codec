import { encode, decode } from "../es-codec.js"

export default function (runner, assertEquals) {
    runner("Uint8Array", () => {
        const buffer = new ArrayBuffer(40)
        const view = new Uint8Array(buffer, 2, 4)
        view[0] = 1
        view[1] = 2
        view[2] = 3
        view[3] = 4
        
        const clone = decode(encode(view))
        assertEquals(view.buffer, clone.buffer)
        assertEquals(view, clone)
    })
}
