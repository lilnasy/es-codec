import { encode, decode } from "../dist/index.js"

export default function (runner, assertEquals) {
    runner("String", () => {
        const string = "hello"
        assertEquals(string, decode(encode(string)))
    })
}
