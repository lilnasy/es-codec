Deno.bench('control', _ => {
    for (let i = 0; i < 100000; i++) {
        const rand = Math.abs((Math.random() * 10**17) << 32)
    }
})

Deno.bench('incumbent', _ => {
    for (let i = 0; i < 100000; i++) {
        const rand = Math.abs((Math.random() * 10**17) << 32)
        encodeVarint(rand)
    }
})

Deno.bench('alternative', _ => {
    for (let i = 0; i < 100000; i++) {
        const rand = Math.abs((Math.random() * 10**17) << 32)
        intermediateArrayAllocation(rand)
    }
})

// current implementation
function encodeVarint(num: number): Uint8Array {
    
    const byteCount = varIntByteCount(num)
    const arr = new Uint8Array(byteCount)
    
    for (let i = 0; i < byteCount; i++) {
        arr[i] = (num & 0b01111111) | (i === (byteCount - 1) ? 0 : 0b10000000)
        num >>>= 7
    }
    
    return arr
}

function intermediateArrayAllocation(num : number) {
    const result = new Array<number>
    while (num >= 0x80) {
        result.push((num & 0x7f) | 0x80)
        num >>>= 7
    }
    result.push(num)
    return new Uint8Array(result)
}

function varIntByteCount(num: number): number {
    
    let byteCount = 1
    while (num >= 0b10000000) {
        num >>>= 7
        byteCount++
    }
    
    return byteCount
}

