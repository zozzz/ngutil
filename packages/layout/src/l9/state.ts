import { BehaviorSubject, map, Observable, shareReplay } from "rxjs"

import { Dimension } from "../util"
import { L9CellName, L9Horizontal, L9Range, L9RangeName, L9Vertical } from "./range"

export type L9StateVar<T extends string> = `--${T}-${L9Vertical}-${L9Horizontal}-${"w" | "h"}`
export type L9StyleVars<T extends string> = { [key in L9StateVar<T>]?: string }

type L9Dims = { [key in L9CellName]?: Dimension }

export class L9State<T extends string> {
    readonly #dims = new BehaviorSubject<L9Dims>({})

    readonly style: Observable<L9StyleVars<T>> = this.#dims.pipe(
        map(dims => {
            const res: L9StyleVars<T> = {}

            for (const [k, v] of Object.entries(dims)) {
                if (v == null) {
                    continue
                }

                const [vertical, horizontal] = k.split(":")
                res[`--${this.prefix}-${vertical}-${horizontal}-w` as L9StateVar<T>] = v.width.toString()
                res[`--${this.prefix}-${vertical}-${horizontal}-h` as L9StateVar<T>] = v.height.toString()
            }

            return res
        }),
        shareReplay(1)
    )

    constructor(public readonly prefix: T) {}

    update(range: L9Range | L9RangeName, dim: Dimension) {
        range = L9Range.coerce(range)
        const dims = { ...this.#dims.value }
        // for (const cell of range.horizontals) {
        //     dims[cell] = dim.width
        // }
    }
}
