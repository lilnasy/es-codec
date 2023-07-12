import { encode, decode } from "../es-codec.js"

export default function (runner, assertEquals) {
    runner("RegExp", () => {
        let value

        value = /howdy/
        assertEquals(value, decode(encode(value)))
        
        value = /howdy/i
        assertEquals(value, decode(encode(value)))
        
        value = /\n/
        assertEquals(value, decode(encode(value)))
        
        value = /\n/igm
        assertEquals(value, decode(encode(value)))
    })
}
