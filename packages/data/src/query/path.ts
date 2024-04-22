import { flattenDepth } from "lodash"

type GetterFn = (srcs: any[]) => any[]
export type PathGetter<T = any, R = any> = (obj: T) => R[]

export function pathGetterCompile(path: string): PathGetter {
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
    if (part === "*") {
        return obj => flattenDepth(parent(obj), 1)
    } else {
        const key = IsNumber.test(part) ? Number(part) : part
        return obj => parent(obj).map(v => (v != null ? v[key] : undefined))
    }
}
