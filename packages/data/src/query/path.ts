import { flatten } from "es-toolkit"

type GetterFn = (srcs: any[]) => any[]
export type PathGetter<T = any, R = any> = (obj: T) => R[]

const CACHE: Record<string, PathGetter> = {}

export function pathGetterCompile(path: string): PathGetter {
    return CACHE[path] || (CACHE[path] = _pathGetterCompile(path))
}

function _pathGetterCompile(path: string): PathGetter {
    if (!path || path.length === 0) {
        throw new Error("Empty path")
    }

    return path.split(".").reduce<GetterFn>(
        (parent, part) => makeGetter(part, parent),
        (obj: any) => (obj == null ? [] : [obj])
    )
}

const IsNumber = /^\d+$/

function makeGetter(part: string, parent: GetterFn): GetterFn {
    // For backward compatibility with wildcard paths, but this is deprecated
    if (part === "*") {
        return obj => flatten(parent(obj), 1)
    }

    const isNum = IsNumber.test(part)
    const key = isNum ? Number(part) : part

    return (obj) => {
        const parentValues = parent(obj)

        const result = parentValues.map(v => {
            if (v == null) return undefined

            // Automatically traverse arrays and flatten one depth level
            if (Array.isArray(v)) {
                // handle array of tuples, like: [ ["Tuple", 1], ["Tuple", 2] ]
                if (isNum && !v.some(Array.isArray)) {
                  return [v[key as unknown as number]]
                }
                return v.map(item => (item != null ? item[key] : undefined))
            }

            return [v[key]]
        })
        return result.flat(1).filter(v => v !== undefined)
    }
}
