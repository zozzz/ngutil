export function readonlyProp(o: unknown, n: string | symbol, v: unknown) {
    Object.defineProperty(o, n, {
        value: v,
        configurable: false,
        enumerable: true,
        writable: false
    })
}
