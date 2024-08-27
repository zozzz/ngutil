import { isPlainObject as _isPlainObject, cloneDeep } from "lodash"

import { DeepReadonly } from "./types/readonly"

// export { deepFreeze }

export const deepClone: <T>(obj: T) => T = typeof structuredClone === "function" ? structuredClone : cloneDeep
// export const deepFreeze: <T>(obj: T) => DeepReadonly<T> = o => Object.freeze(o) as any
export const isPlainObject: (arg: any) => arg is { [key: string]: any } = _isPlainObject as any

export function deepFreeze<T>(obj: T): DeepReadonly<T> {
    if (obj == null) {
        return obj as any
    }

    if (obj instanceof Map) {
        obj.clear =
            obj.delete =
            obj.set =
                function () {
                    throw new Error("map is read-only")
                }
    } else if (obj instanceof Set) {
        obj.add =
            obj.clear =
            obj.delete =
                function () {
                    throw new Error("set is read-only")
                }
    }

    // Freeze self
    Object.freeze(obj)

    Object.getOwnPropertyNames(obj).forEach(name => {
        const prop = (obj as any)[name]
        const type = typeof prop

        // Freeze prop if it is an object or function and also not already frozen
        if ((type === "object" || type === "function") && !Object.isFrozen(prop)) {
            deepFreeze(prop)
        }
    })

    return obj as any
}

/**
 * @example
 * ```ts
 * toSorted([{id: 1}, {id: 2}, {id: 3}], sortBy([{id: "desc"}]))
 * ```
 */
export function toSorted<T>(items: readonly T[], fn: (a: T, b: T) => number): T[] {
    if (typeof (items as any).toSorted === "function") {
        return (items as any).toSorted(fn)
    } else {
        return items.slice(0).sort(fn)
    }
}

export function isFalsy(value: any): boolean {
    if (value == null) {
        return true
    } else if (Array.isArray(value)) {
        return value.length === 0
    } else if (isPlainObject(value)) {
        return Object.keys(value).length === 0
    } else if (value instanceof Set) {
        return value.size === 0
    } else if (value instanceof Map) {
        return value.size === 0
    } else if (typeof value === "string") {
        return value.length === 0
    } else if (typeof value === "number") {
        return isNaN(value) || value === 0
    }
    return value === false
}

export function isTruthy(value: any): boolean {
    return !isFalsy(value)
}
