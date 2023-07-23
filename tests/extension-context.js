/*
This test is adapted from the javascript implementation of MessagePack
https://github.com/msgpack/msgpack-javascript/blob/v2.8.0/test/ExtensionCodec.test.ts

Copyright 2019 The MessagePack Community.
Permission to use, copy, modify, and/or distribute this software for any purpose with
or without fee is hereby granted, provided that the above copyright notice and this
permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD
TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN
NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR
CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR
PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

import * as EsCodec from "../es-codec.js"

export default function (runner, assertEquals) {
    class Context {
        constructor(ctxVal) {
            this.expectations = []
            this.ctxVal = ctxVal
        }
        hasVisited(val) {
            this.expectations.push(val);
        }
    }

    class Magic {
        constructor(val) {
            this.val = val
        }
    }

    const { encode, decode } = EsCodec.createCodec([
        {
            name: "Magic",
            when(x) { return x instanceof Magic },
            encode(magic, context) {
                context.hasVisited({ encoding: magic.val });
                return { magic: magic.val, ctx: context.ctxVal }
            },
            decode(magicAndCtx, context) {
                context.hasVisited({ decoding: magicAndCtx.magic, ctx: context.ctxVal })
                return new Magic(magicAndCtx.magic)
            }
        }
    ])

    runner("Extension with context", () => {
        const context = new Context(42)
        const magic1 = new Magic(17)
        const magic2 = new Magic({ foo: new Magic("inner") })
        const test = [magic1, magic2]
        const encoded = encode(test, context)

        assertEquals(decode(encoded, context), test)

        assertEquals(
            context.expectations,
            [
                { encoding: magic1.val },
                { encoding: magic2.val },
                { encoding: magic2.val.foo.val },
                { ctx: 42, decoding: magic1.val },
                { ctx: 42, decoding: magic2.val.foo.val },
                { ctx: 42, decoding: magic2.val }
            ]
        )
    })
}