import * as EsCodec from "../es-codec.js"

export default function (runner, assertEquals) {
    const { encode, decode } = EsCodec.createCodec([
        {
            when(x) { return x.constructor === URL },
            encode(x) { return EsCodec.encode(x.href) },
            decode(x) { return new URL(EsCodec.decode(x)) }
        }
    ])
    runner("Extension - URL", () => {
        const url = new URL("https://example.com")
        assertEquals(url, decode(encode(url)))
    })
}