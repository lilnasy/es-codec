import { encode, decode } from "../es-codec.js"

export default function (runner, assertEquals) {
    runner("String", () => {
        const string = "hello"
        assertEquals(string, decode(encode(string)))
    })
}
