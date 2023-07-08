Deno.bench('control', _ => {
    for (let i = 0; i < 100000; i++) {
        const rand = BigInt(Math.abs((Math.random() * 10**17) << 32))
    }
})

Deno.bench('incumbent', _ => {
    for (let i = 0; i < 100000; i++) {
        const rand = BigInt(Math.abs((Math.random() * 10**17) << 32))
        encodeBigInt(rand)
    }
})

Deno.bench('alternative', _ => {
    for (let i = 0; i < 100000; i++) {
        const rand = BigInt(Math.abs((Math.random() * 10**17) << 32))
        stringCastToFindBufferLength(rand)
    }
})

function encodeBigInt(bigint : bigint) {
    
    const negative = bigint < 0n
    
    let b = negative ? -bigint : bigint
    let uint64Count = 0
    while (b > 0n) {
        uint64Count++
        b >>= 64n
    }
    
    if (uint64Count > 255) throw new NotSerializable(bigint)
    
    const buffer = new ArrayBuffer(2 + 8 * uint64Count)
    const view = new DataView(buffer)
    
    view.setUint8(0, negative ? 0b00001001 : 0b00001010)
    view.setUint8(1, uint64Count)
    
    if (negative) bigint *= -1n
    
    let offset = 2
    while (bigint > 0n) {
        const uint64 = bigint & 0xffffffffffffffffn
        view.setBigUint64(offset, uint64)
        offset += 8
        bigint >>= 64n
    }
    
    return buffer
}

function stringCastToFindBufferLength(bigint : bigint) {
    const uint64Count = Math.ceil(bigint.toString(16).length / 16)
    const buffer = new ArrayBuffer(2 + 8 * uint64Count)
    const view = new DataView(buffer)
    
    view.setUint8(0, 11)
    view.setUint8(1, uint64Count)
    
    let offset = 2
    while (bigint > 0n) {
        const value = bigint & 0xffffffffffffffffn
        view.setBigUint64(offset, value)
        offset += 8
        bigint >>= 64n
    }
    
    return buffer
}

class NotSerializable extends Error {
    constructor(readonly value : unknown) {
        super()
    }
}
