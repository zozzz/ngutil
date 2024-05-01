export function readonlyProp(o: unknown, n: string | symbol, v: unknown) {
    Object.defineProperty(o, n, {
        value: v,
        configurable: false,
        enumerable: true,
        writable: false
    })
}

const NORMALIZED = Symbol("NORMALIZED")
const IS_NORMALIZED = Symbol("IS_NORMALIZED")

export function normalize(obj: any, normalizer: (v: any) => any): any {
    if ((obj as any)[IS_NORMALIZED]) {
        return obj as any
    }

    if ((obj as any)[NORMALIZED] == null) {
        const normalized = normalizer(obj)
        Object.defineProperty(obj, NORMALIZED, {
            value: normalized,
            configurable: false,
            enumerable: false,
            writable: false
        })

        Object.defineProperty(normalize, IS_NORMALIZED, {
            value: true,
            configurable: false,
            enumerable: false,
            writable: false
        })

        return normalized
    }

    return (obj as any)[NORMALIZED]
}
