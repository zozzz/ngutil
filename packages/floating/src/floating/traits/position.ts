import { ElementRef } from "@angular/core"

import { combineLatest, Observable, Subscriber } from "rxjs"

import { ElementInput } from "@ngutil/common"
import { AlignmentInput, Dimension, DimensionWatcher, Rect, RectWatcher, SidesInput } from "@ngutil/style"

import { LayerService } from "../../layer/layer.service"
import { FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"
import { ComputedPositon, computePosition } from "./position-calc"

export type FloatingTargetElementRef = ElementInput | Window | "layer" | "viewport"

export interface FloatingAlign {
    align?: AlignmentInput
}

export interface FloatingAnchorPosition extends FloatingAlign {
    margin?: SidesInput
}

export interface FloatingAnchor extends FloatingAnchorPosition {
    ref: FloatingTargetElementRef
}

export class FloatingAnchorRef<T extends Node> extends ElementRef<T> {}

export interface FloatingContentPosition extends FloatingAlign {
    margin?: SidesInput
}

export interface FloatingPlacementPosition {
    padding?: SidesInput
}

export interface FloatingPlacement extends FloatingPlacementPosition {
    ref: FloatingTargetElementRef
}

export class FloatingPlacementRef<T extends LayerService["root"]["nativeElement"]> extends ElementRef<T> {}

export interface FloatingPositionOptions {
    anchor?: FloatingAnchor
    content?: FloatingContentPosition
    placement?: FloatingPlacement
}

type Watches = {
    floating: Observable<Dimension>
    anchor: Observable<Rect>
    placement: Observable<Rect>
}

export class PositionTrait extends FloatingTrait<FloatingPosition> {
    name = "position"

    constructor(readonly options: FloatingPositionOptions) {
        super()

        if (!options.anchor) {
            options.anchor = { ref: "viewport", align: "center middle" }
        }

        if (!options.placement) {
            options.placement = { ref: "viewport" }
        }
    }

    connect(floatingRef: FloatingRef<any>): Observable<FloatingPosition> {
        return new Observable((dest: Subscriber<FloatingPosition>) => {
            const injector = floatingRef.container.injector
            const dimWatcher = injector.get(DimensionWatcher)
            const rectWatcher = injector.get(RectWatcher)

            const watches: Watches = {
                floating: dimWatcher.watch(floatingRef.container, "content-box"),
                anchor: refWatcher(rectWatcher, this.options.anchor!.ref, floatingRef),
                placement: refWatcher(rectWatcher, this.options.placement!.ref, floatingRef)
            }

            const watching = combineLatest(watches).subscribe(({ floating, anchor, placement }) => {
                const res = new FloatingPosition(this.options, floating, anchor, placement)
                res.apply(floatingRef)
                dest.next(res)
            })

            return () => {
                watching.unsubscribe()
            }
        })
    }
}

function refWatcher(rectWatcher: RectWatcher, ref: FloatingTargetElementRef, floatingRef: FloatingRef<any>) {
    if (ref === "layer") {
        return rectWatcher.watch(floatingRef.layerSvc.root, "content-box")
    } else if (ref === "viewport" || ref instanceof Window) {
        return rectWatcher.watch(window, "content-box")
    } else {
        return rectWatcher.watch(ref, "content-box")
    }
}

export function position(options: FloatingPositionOptions) {
    return new PositionTrait(options)
}

export class FloatingPosition {
    readonly computed?: ComputedPositon
    constructor(
        readonly options: FloatingPositionOptions,
        readonly floating: Dimension,
        readonly anchor?: Rect,
        readonly placement?: Rect
    ) {
        this.computed = computePosition({ floating, anchor, placement, options })
    }

    apply(floatingRef: FloatingRef) {
        if (this.computed == null) {
            return
        }
    }
}
