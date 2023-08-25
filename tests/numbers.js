import { encode, decode } from "../es-codec.js"

export default function (runner, assertEquals) {
    runner("Number", () => {
        assertEquals(decode(encode(0))          , 0          )
        assertEquals(decode(encode(1))          , 1          )
        assertEquals(decode(encode(-1))         , -1         )
        assertEquals(decode(encode(0.5))        , 0.5        )
        assertEquals(decode(encode(255))        , 255        )
        assertEquals(decode(encode(1e100))      , 1e100      )
        assertEquals(decode(encode(2 ** 31))    , 2 ** 31    )
        assertEquals(decode(encode(2 ** 31 - 1)), 2 ** 31 - 1)
        assertEquals(decode(encode(2 ** 31 + 1)), 2 ** 31 + 1)
        assertEquals(decode(encode(2 ** 32))    , 2 ** 32    )
        assertEquals(decode(encode(2 ** 32 - 1)), 2 ** 32 - 1)
        assertEquals(decode(encode(2 ** 32 + 1)), 2 ** 32 + 1)
        assertEquals(decode(encode(2 ** 53))    , 2 ** 53    )
        assertEquals(decode(encode(2 ** 53 - 1)), 2 ** 53 - 1)
        assertEquals(decode(encode(2 ** 53 + 4)), 2 ** 53 + 4)
        assertEquals(decode(encode(NaN))        , NaN        )
        assertEquals(decode(encode(Infinity))   , Infinity   )
        assertEquals(decode(encode(-Infinity))  , -Infinity  )
        assertEquals(decode(encode(0.1111111111111111)), 0.1111111111111111)
        assertEquals(decode(encode(-4206.545669498832)), -4206.545669498832)
    })
}

