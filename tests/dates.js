import { encode, decode } from "../dist/index.js"

export default function (runner, assertEquals) {
    runner("Date", () => {
        const date = new Date()
        assertEquals(date, decode(encode(date)))
    })
}
