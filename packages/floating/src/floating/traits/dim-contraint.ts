import { combineLatest, distinctUntilChanged, map, Observable, Subscriber, tap } from "rxjs"

import { clamp } from "lodash"

import { ElementInput, isElementInput } from "@ngutil/common"
import { Dimension, DimensionWatcher } from "@ngutil/style"

import { FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"
import { type FloatingPosition } from "./position"

export type DimensionConstraintInput = ElementInput | number

interface DimMapEntry {
    computedRef: "min" | "max"
    dimension: keyof Dimension
}

const DIM_MAP: { [key: string]: DimMapEntry } = {
    maxWidth: { computedRef: "max", dimension: "width" },
    maxHeight: { computedRef: "max", dimension: "height" },
    minWidth: { computedRef: "min", dimension: "width" },
    minHeight: { computedRef: "min", dimension: "height" }
}

export class DimensionConstraintTrait implements FloatingTrait<number> {
    readonly name: string
    readonly #map: DimMapEntry
    constructor(
        name: keyof typeof DIM_MAP,
        readonly value: DimensionConstraintInput
    ) {
        this.name = name as string
        this.#map = DIM_MAP[name]
    }

    connect(floatingRef: FloatingRef<any>): Observable<number> {
        return new Observable((dst: Subscriber<number>) => {
            if (isElementInput(this.value)) {
                const watcher = floatingRef.container.injector.get(DimensionWatcher)
                const refDim = watcher.watch(this.value, "border-box").pipe(map(value => value[this.#map.dimension]))
                return combineLatest({
                    refDim: refDim,
                    position: floatingRef.watchTrait<FloatingPosition>("position")
                }).subscribe(({ refDim, position }) => {
                    const floating = position.computed?.floating
                    dst.next(
                        clamp(
                            refDim,
                            floating?.min[this.#map.dimension] || 0,
                            floating?.max[this.#map.dimension] || Infinity
                        )
                    )
                })
            } else {
                return floatingRef.watchTrait<FloatingPosition>("position").subscribe(position => {
                    const floating = position.computed?.floating
                    dst.next(
                        clamp(
                            this.value as number,
                            floating?.min[this.#map.dimension] || 0,
                            floating?.max[this.#map.dimension] || Infinity
                        )
                    )
                })
            }
        }).pipe(
            distinctUntilChanged(),
            tap(value => {
                const floatingEl = floatingRef.container.nativeElement
                floatingEl.style[this.name as any] = `${value}px`
            })
        )
    }
}

export function maxWidth(value: DimensionConstraintInput) {
    return new DimensionConstraintTrait("maxWidth", value)
}

export function maxHeight(value: DimensionConstraintInput) {
    return new DimensionConstraintTrait("maxHeight", value)
}

export function minWidth(value: DimensionConstraintInput) {
    return new DimensionConstraintTrait("minWidth", value)
}

export function minHeight(value: DimensionConstraintInput) {
    return new DimensionConstraintTrait("minHeight", value)
}
