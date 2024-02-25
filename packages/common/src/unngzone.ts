export const Zone = (window as any).Zone

export function __zone_symbol__<T extends string>(val: T): T {
    const symbol =
        typeof Zone !== "undefined" && (Zone as any).__symbol__
            ? (Zone as any).__symbol__(val)
            : `__zone_symbol__${val}`
    return typeof window[symbol] !== "undefined" ? symbol : val
}

export const rawSetTimeout = window[__zone_symbol__("setTimeout")]
export const rawClearTimeout = window[__zone_symbol__("clearTimeout")]
export const rawSetInterval = window[__zone_symbol__("setInterval")]
export const rawClearInterval = window[__zone_symbol__("clearInterval")]
export const rawRequestAnimationFrame = window[__zone_symbol__("requestAnimationFrame")]
export const rawCancelAnimationFrame = window[__zone_symbol__("cancelAnimationFrame")]
