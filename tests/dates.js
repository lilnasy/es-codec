import { encode, decode } from "../es-codec.js"

export default function (runner, assertEquals) {
    runner("Date", () => {
        const date = new Date()
        assertEquals(date, decode(encode(date)))
    })
}
