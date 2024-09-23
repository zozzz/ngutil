import { ElementRef } from "@angular/core"

import { combineLatest, Observable, Subscriber, takeUntil } from "rxjs"

import { ElementInput } from "@ngutil/common"
import { AlignmentInput, Dimension, DimensionWatcher, Rect, RectWatcher, SidesInput } from "@ngutil/style"

import { LayerService } from "../../layer/layer.service"
import { FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"
import { maxHeight, maxWidth } from "./dim-contraint"
import { ComputedPositon, computePosition } from "./position-calc"

export type FloatingTargetElementRef = ElementInput | Window | "layer" | "viewport"

export interface FloatingAlign {
    align: AlignmentInput
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

export interface FloatingContent extends FloatingContentPosition {}

export interface FloatingPlacementPosition {
    padding?: SidesInput
}

export interface FloatingPlacement extends FloatingPlacementPosition {
    ref: FloatingTargetElementRef
}

export class FloatingPlacementRef<T extends LayerService["root"]["nativeElement"]> extends ElementRef<T> {}

export interface FloatingPositionOptions {
    anchor?: FloatingAnchor
    content?: FloatingContent
    placement?: FloatingPlacement
}

export type FloatingPositionOptionsNormalized = FloatingPositionOptions & {
    anchor: FloatingAnchor
    content: FloatingContent
    placement: FloatingPlacement
}

type Watches = {
    floating: Observable<Dimension>
    anchor: Observable<Rect>
    placement: Observable<Rect>
}

export class PositionTrait implements FloatingTrait<FloatingPosition> {
    readonly name = "position"

    readonly options: FloatingPositionOptionsNormalized

    constructor(options: FloatingPositionOptions) {
        const cloned = { ...options }

        if (!cloned.placement) {
            cloned.placement = { ref: "viewport" }
        }

        if (!cloned.anchor) {
            cloned.anchor = { ref: cloned.placement.ref, align: "center middle" }
        }

        if (!cloned.content) {
            cloned.content = { align: "center middle" }
        }

        this.options = cloned as any
    }

    connect(floatingRef: FloatingRef<any>): Observable<FloatingPosition> {
        return new Observable((dest: Subscriber<FloatingPosition>) => {
            const injector = floatingRef.container.injector
            const dimWatcher = injector.get(DimensionWatcher)
            const rectWatcher = injector.get(RectWatcher)

            const watches: Watches = {
                floating: dimWatcher.watch(floatingRef.container, "border-box"),
                anchor: refWatcher(rectWatcher, this.options.anchor.ref, floatingRef),
                placement: refWatcher(rectWatcher, this.options.placement.ref, floatingRef)
            }

            return combineLatest(watches).subscribe(({ floating, anchor, placement }) => {
                const res = new FloatingPosition(this.options, floating, anchor, placement)
                res.apply(floatingRef)
                dest.next(res)
            })
        }).pipe(takeUntil(floatingRef.state.onExecute("disposing")))
    }
}

function refWatcher(rectWatcher: RectWatcher, ref: FloatingTargetElementRef, floatingRef: FloatingRef<any>) {
    if (ref === "layer") {
        return rectWatcher.watch(floatingRef.layerSvc.root, "border-box")
    } else if (ref === "viewport" || ref instanceof Window) {
        return rectWatcher.watch(window, "border-box")
    } else {
        return rectWatcher.watch(ref, "border-box")
    }
}

export function position(options: FloatingPositionOptions) {
    return [new PositionTrait(options), maxWidth(NaN), maxHeight(NaN)]
}

export class FloatingPosition {
    readonly computed?: ComputedPositon
    constructor(
        readonly options: FloatingPositionOptionsNormalized,
        readonly floating: Dimension,
        readonly anchor: Rect,
        readonly placement: Rect
    ) {
        // const frect: Rect = { x: 0, y: 0, ...floating }
        this.computed = computePosition({ floating, anchor, placement, options })
    }

    apply(floatingRef: FloatingRef) {
        if (this.computed == null) {
            return
        }

        const floatingEl = floatingRef.container.nativeElement
        const computedContent = this.computed.content
        const style: Record<string, string | null> = { top: null, right: null, bottom: null, left: null }

        if (computedContent.align.horizontal === "right") {
            style["right"] = `${computedContent.right}px`
        } else {
            style["left"] = `${computedContent.left}px`
        }

        if (computedContent.align.vertical === "bottom") {
            style["bottom"] = `${computedContent.bottom}px`
        } else {
            style["top"] = `${computedContent.top}px`
        }

        Object.assign(floatingEl.style, style)
    }
}
