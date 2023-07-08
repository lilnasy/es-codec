import { encode, decode } from "../es-codec.js"

export default function (runner, assertEquals) {
    runner("Error", () => {
        const error = new SyntaxError("test", { cause : 4 })
        assertEquals(error, decode(encode(error)))
    })
}
