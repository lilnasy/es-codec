import { encode, decode } from "../dist/index.js"

export default function (runner, assertEquals) {
    runner("DataView", () => {
        const dataview = new DataView(new ArrayBuffer(64), 12, 16)
        dataview.setFloat64(0, 1.2)
        assertEquals(dataview, decode(encode(dataview)))
    })
}
