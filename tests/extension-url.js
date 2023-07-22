import * as EsCodec from "../es-codec.js"

export default function (runner, assertEquals) {
    const { encode, decode } = EsCodec.createCodec([
        {
            name: "URL",
            when(x)   { return x.constructor === URL },
            encode(x) { return x.href },
            decode(x) { return new URL(x) }
        }
    ])
    
    runner("Extension - URL", () => {
        const url = new URL("https://example.com/xyz/123?abc=456#aaa")
        assertEquals(url, decode(encode(url)))
    })

    runner("Multiple references to the same URL", () => {
        const url = new URL("https://example.com/xyz/123?abc=456#aaa")
        const ref = { url, url2: url }

        const decoded = decode(encode(ref))
        assertEquals(decoded.url === decoded.url2, true)
        
        assertEquals(ref, decoded)
    })
}