import { isEqual as _isEqual, cloneDeep, isPlainObject } from "es-toolkit"

import { DeepReadonly } from "./types/readonly"
import { IfAny, IfTuple } from "./types/util"

// export { deepFreeze }

export const deepClone: <T>(obj: T) => T = typeof structuredClone === "function" ? structuredClone : cloneDeep
// export const deepFreeze: <T>(obj: T) => DeepReadonly<T> = o => Object.freeze(o) as any
// export const isPlainObject: (arg: any) => arg is { [key: string]: any } = _isPlainObject as any
export { isPlainObject }

// TODO: submit es-toolkit pr for this
export const isEqual: <A, B extends A>(a: A, b: B) => a is B = _isEqual as unknown as any

export function isEqualStrict<A, B extends A>(a: A, b: B): a is B {
    return a === b
}
// export const isEqualStrict: <A, B extends A>(a: A, b: B) => a is B = (a, b) => a === b

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

type FalsyIfNull<O> = O extends null ? null : never
type FalsyIfUndefined<O> = O extends undefined ? undefined : never
type FalsyIfBool<O> = O extends boolean ? false : never
type FalsyIfString<O> = O extends string ? "" : never
type FalsyIfNumber<O> = O extends number ? 0 : never
type FalsyIfTuple<O> = IfTuple<O, O, never, never>
type FalsyIfAny<O> = IfAny<O, O, never>

export type IsFalsy<O> =
    | FalsyIfNull<O>
    | FalsyIfUndefined<O>
    | FalsyIfBool<O>
    | FalsyIfString<O>
    | FalsyIfNumber<O>
    | FalsyIfTuple<O>
    | FalsyIfAny<O>

export function isFalsy<T>(value: T): value is IsFalsy<T> & T {
    if (value == null) {
        return true
    } else if (typeof value === "string") {
        return value.length === 0
    } else if (typeof value === "number") {
        return isNaN(value) || value === 0
    } else if (Array.isArray(value)) {
        return value.length === 0
    } else if (isPlainObject(value)) {
        return Object.keys(value).length === 0
    } else if ((value as any) instanceof Set) {
        return (value as any).size === 0
    } else if ((value as any) instanceof Map) {
        return (value as any).size === 0
    }
    return value === false
}

export type IsTruthy<T> = Exclude<T, undefined | null | false | "" | 0>

export function isTruthy<T>(value: T): value is IsTruthy<T> {
    return !isFalsy(value)
}
