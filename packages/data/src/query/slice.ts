import { ListRange } from "@angular/cdk/collections"

import { deepClone } from "@ngutil/common"

// https://www.npmjs.com/package/array-view

/**
 * @example
 * ```ts
 * {start: 0, end: 0} // empty range
 * {start: 0, end: 1} // range with one item.eg sliceApply([1, 2, 3], {start:0, end:1}) -> [1]
 * ```
 */
export interface Slice extends ListRange {
    /**
     * Start of slice, exact index of item in list
     */
    readonly start: number
    /**
     * End of slice, not include end index of item in list
     */
    readonly end: number
    readonly pageSize?: number
}

export function sliceMerge(...slices: Slice[]) {
    let result: Slice | undefined = undefined

    for (const slice of slices) {
        if (slice == null) {
            continue
        }
        if (result == null) {
            result = deepClone(slice)
        } else {
            result = { ...(result as any), ...slice }
        }
    }

    return result
}

/**
 * Apply slice to array, and force the result length to equal with Slice length,
 * so fill array with undefined if not enought elements
 */
export function sliceApply(slice: Slice, array: readonly any[]): any[] {
    const result = array.slice(slice.start, slice.end)
    result.length = slice.end - slice.start
    return result
}

/**
 * @returns Page numbers, eg.: `[10, 11, 12, 13, ...]`
 */
export function sliceToPages(slice: Slice): number[] {
    if (slice.pageSize == null) {
        throw new Error("Missing `step` from slice")
    }

    const start = Math.floor(slice.start / slice.pageSize)
    const end = Math.ceil(slice.end / slice.pageSize)
    return Array.from({ length: end - start }, (_, i) => start + i)
}

export function sliceInsert(slice: Slice, array: readonly any[], newItems: readonly any[]): any[] {
    if (slice.start === slice.end) {
        return array as any
    }

    let result = array.slice(0, slice.start)
    result.length = slice.start

    result = result.concat(newItems)

    if (!isNaN(slice.end) && isFinite(slice.end)) {
        result.length = slice.end
        result = result.concat(array.slice(slice.end))
    }

    return result
}

export function sliceClamp(slice: Slice, constraint: Slice): Slice {
    return {
        start: Math.max(slice.start, constraint.start),
        end: Math.min(slice.end, constraint.end),
        pageSize: slice.pageSize
    }
}

export function sliceEq(a: Slice, b: Slice): boolean {
    return a.start === b.start && a.end === b.end && a.pageSize === b.pageSize
}

// TODO: sliceOverlap(other: Slice): Slice
// TODO: sliceIncludes(other: Slice): boolean
// TODO: sliceConcat(...slices: Slice[]): Slice[]
// TODO: sliceDiff(slice: Slice): Slice[]
