import { encode, decode } from "../dist/index.js"

export default function (runner, assertEquals) {
    runner("Error", () => {
        const error = new SyntaxError("test", { cause : 4 })
        assertEquals(error, decode(encode(error)))
    })
}
