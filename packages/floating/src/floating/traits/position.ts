import { combineLatest, isObservable, map, Observable, of, Subscriber, switchMap, takeUntil } from "rxjs"

import { ElementInput, isElementInput } from "@ngutil/common"
import {
    Dimension,
    DimensionWatcher,
    floatingPosition,
    FloatingPosition,
    FloatingPositionAltInput,
    FloatingPositionAnchorOptions,
    FloatingPositionContentOptions,
    FloatingPositionPlacementOptions,
    floatingPositionToStyle,
    Rect,
    RectWatcher
} from "@ngutil/style"

import { FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"

export type PositionTraitElementRef = ElementInput | Window | "layer" | "viewport"

export type PositionTraitOptions = {
    content?: FloatingPositionContentOptions & MinMaxSizes
    anchor?: FloatingPositionAnchorOptions & { ref: PositionTraitElementRef }
    placement?: FloatingPositionPlacementOptions & { ref: PositionTraitElementRef }
    horizontalAlt?: FloatingPositionAltInput
    verticalAlt?: FloatingPositionAltInput
}

type SizeInput = number | ElementInput | Observable<number> | Observable<ElementInput>
interface MinMaxSizes {
    minWidth?: SizeInput
    maxWidth?: SizeInput
    minHeight?: SizeInput
    maxHeight?: SizeInput
}

type Watches = {
    content: Observable<Dimension>
    anchor: Observable<Rect>
    placement: Observable<Rect>
}

type SizeWatches = {
    minWidth: Observable<number>
    maxWidth: Observable<number>
    minHeight: Observable<number>
    maxHeight: Observable<number>
}

interface MinMaxSizesResult {
    minWidth: number
    maxWidth: number
    minHeight: number
    maxHeight: number
}

export class PositionTrait implements FloatingTrait<FloatingPosition> {
    readonly name = "position"

    readonly options: Required<PositionTraitOptions>

    constructor(options: PositionTraitOptions) {
        const cloned = { ...options }

        if (!cloned.placement) {
            cloned.placement = { ref: "viewport" }
        }

        if (!cloned.anchor) {
            cloned.anchor = { ref: cloned.placement.ref, link: "center middle" }
        }

        if (!cloned.content) {
            cloned.content = { link: "center middle" }
        }

        this.options = cloned as any
    }

    connect(floatingRef: FloatingRef<any>): Observable<FloatingPosition> {
        return new Observable((dest: Subscriber<FloatingPosition>) => {
            const injector = floatingRef.container.injector
            const dimWatcher = injector.get(DimensionWatcher)
            const rectWatcher = injector.get(RectWatcher)

            const dimWatches: Watches = {
                content: dimWatcher.watch(floatingRef.container, "border-box"),
                anchor: refWatcher(rectWatcher, this.options.anchor.ref, floatingRef),
                placement: refWatcher(rectWatcher, this.options.placement.ref, floatingRef)
            }

            const sizeWatches: SizeWatches = {
                minWidth: sizeWatcher(dimWatcher, "width", this.options.content.minWidth),
                maxWidth: sizeWatcher(dimWatcher, "width", this.options.content.maxWidth),
                minHeight: sizeWatcher(dimWatcher, "height", this.options.content.minHeight),
                maxHeight: sizeWatcher(dimWatcher, "height", this.options.content.maxHeight)
            }

            const watches = {
                dims: combineLatest(dimWatches),
                size: combineLatest(sizeWatches)
            }

            return (
                combineLatest(watches)
                    // .pipe(distinctUntilChanged(isEqual))
                    .subscribe(({ dims, size }) => {
                        const pos = floatingPosition({ dims, options: this.options })
                        const floatingEl = floatingRef.container.nativeElement
                        Object.assign(floatingEl.style, floatingPositionToStyle(pos))
                        Object.assign(floatingEl.style, sizesToStyle(pos, size))
                        dest.next(pos)
                    })
            )
        }).pipe(takeUntil(floatingRef.state.onExecute("disposing")))
    }
}

function refWatcher(rectWatcher: RectWatcher, ref: PositionTraitElementRef, floatingRef: FloatingRef<any>) {
    if (ref === "layer") {
        return rectWatcher.watch(floatingRef.layerSvc.root, "border-box")
    } else if (ref === "viewport" || ref instanceof Window) {
        return rectWatcher.watch(window, "border-box")
    } else {
        return rectWatcher.watch(ref, "border-box")
    }
}

function sizeWatcher(dimWatcher: DimensionWatcher, prop: "width" | "height", size?: SizeInput): Observable<number> {
    if (typeof size === "number") {
        return of(size)
    } else if (isElementInput(size)) {
        return dimWatcher.watch(size, "border-box").pipe(map(value => value[prop]))
    } else if (isObservable(size)) {
        return (size as Observable<number | ElementInput>).pipe(
            switchMap(value => sizeWatcher(dimWatcher, prop, value))
        )
    }
    return of(NaN)
}

function sizesToStyle(pos: FloatingPosition, sizes: MinMaxSizesResult): Partial<CSSStyleDeclaration> {
    const { minWidth, maxWidth, minHeight, maxHeight } = sizes
    const { width, height } = pos.placement.area
    return {
        minWidth: isNaN(minWidth) ? "auto" : `${Math.min(width, minWidth)}px`,
        minHeight: isNaN(minHeight) ? "auto" : `${Math.min(height, minHeight)}px`,
        maxWidth: isNaN(maxWidth) ? `${width}px` : `${Math.min(width, maxWidth)}px`,
        maxHeight: isNaN(maxHeight) ? `${height}px` : `${Math.min(height, maxHeight)}px`
    }
}

export function position(options: PositionTraitOptions) {
    return new PositionTrait(options)
}
