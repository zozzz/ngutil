import {
    combineLatest,
    distinctUntilChanged,
    isObservable,
    map,
    NEVER,
    Observable,
    of,
    Subscriber,
    switchMap,
    take,
    takeUntil,
    tap
} from "rxjs"

import { isEqual } from "es-toolkit"

import { coerceElement, ElementInput, isElementInput } from "@ngutil/common"
import {
    Dimension,
    DimensionWatcher,
    floatingPosition,
    FloatingPosition,
    FloatingPositionAltInput,
    FloatingPositionAnchorOptions,
    FloatingPositionContentOptions,
    FloatingPositionDims,
    FloatingPositionDirection,
    FloatingPositionPlacementOptions,
    floatingPositionToStyle,
    NodeRemovedWatcher,
    Rect,
    RectWatcher,
    ScrollOffsetWatcher,
    type Position
} from "@ngutil/style"

import { FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"

export type PositionTraitElementRef = ElementInput | Window | "layer" | "viewport"

export type PositionTraitOptions = {
    content?: FloatingPositionContentOptions & { constraints?: SizeConstraintsInput }
    anchor?: FloatingPositionAnchorOptions & { ref: PositionTraitElementRef }
    placement?: FloatingPositionPlacementOptions & { ref: PositionTraitElementRef }
    horizontalAlt?: FloatingPositionAltInput
    verticalAlt?: FloatingPositionAltInput
}

/**
 * Width ot height input values
 *
 * - `number`: excact value
 * - `ElementInput`: element reference, and take the dimension from it
 * - `link`: take the dimension from the anchor element and only apply on connection dimension.
 *    eg.: `anchor.link = "left bottom"` and `content.link = "left top"`, in this case only width will be applied.
 */
type SizeInputConst = number | ElementInput | "link" | "viewport"
type SizeInput = SizeInputConst | Observable<SizeInputConst>

interface SizeConstraintsInput {
    minWidth?: SizeInput
    maxWidth?: SizeInput
    minHeight?: SizeInput
    maxHeight?: SizeInput
}

type SizeConstraints = NonNullable<FloatingPositionDims["sizeConstraints"]>

type Watches = {
    content: Observable<Dimension>
    anchor: Observable<Rect>
    placement: Observable<Rect>
    sizeConstraints: Observable<ConstraintsResult>
}

type ConstraintWatches = { [K in keyof SizeConstraints]-?: Observable<NonNullable<SizeConstraints[K]>> }
type ConstraintsResult = Required<SizeConstraints>

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
            const removeWatcher = injector.get(NodeRemovedWatcher)
            const scrollOffsetWatcher = injector.get(ScrollOffsetWatcher)


            const sizeConstraints = this.options.content.constraints || {}
            const constraintsWatches: ConstraintWatches = {
                minWidth: sizeWatcher(dimWatcher, "width", sizeConstraints.minWidth),
                maxWidth: sizeWatcher(dimWatcher, "width", sizeConstraints.maxWidth),
                minHeight: sizeWatcher(dimWatcher, "height", sizeConstraints.minHeight),
                maxHeight: sizeWatcher(dimWatcher, "height", sizeConstraints.maxHeight)
            }

            const placementScroll$ = scrollOffsetWatcher.watch(refToNode(this.options.placement.ref, floatingRef))
            const placement$ = combineLatest([placementScroll$, refWatcher(rectWatcher, this.options.placement.ref, floatingRef)]).pipe(
                map(([scroll, placement]) => {
                    return {
                        ...placement,
                        x: placement.x + scroll.x,
                        y: placement.y + scroll.y
                    }
                })
            )
            const watches: Watches = {
                content: dimWatcher.watch(floatingRef.container, "border-box"),
                anchor: combineLatest([placement$, refWatcher(rectWatcher, this.options.anchor.ref, floatingRef)]).pipe(
                    map(([placement, anchor]) => {
                        return {
                            ...anchor,
                            x: anchor.x + placement.x,
                            y: anchor.y + placement.y
                        }
                    })
                ),
                placement: placement$,
                sizeConstraints: combineLatest(constraintsWatches)
            }

            const anchorRemoved =
                this.options.anchor.ref === "viewport" || this.options.anchor.ref instanceof Window
                    ? NEVER
                    : removeWatcher.watch(refToNode(this.options.anchor.ref, floatingRef) as unknown as ElementInput)

            const onRemove = anchorRemoved.pipe(
                tap(() => floatingRef.close().subscribe()),
                take(1)
            )

            return combineLatest(watches)
                .pipe(takeUntil(onRemove), distinctUntilChanged(isEqual))
                .subscribe(dims => {
                    const pos = floatingPosition({ dims, options: this.options })
                    const floatingEl = floatingRef.container.nativeElement
                    Object.assign(floatingEl.style, floatingPositionToStyle(pos))
                    Object.assign(floatingEl.style, constraintsToStyle(pos, dims.sizeConstraints, sizeConstraints))
                    dest.next(pos)
                })
        }).pipe(takeUntil(floatingRef.state.onExecute("disposing")))
    }
}


function refWatcher(rectWatcher: RectWatcher, ref: PositionTraitElementRef, floatingRef: FloatingRef<any>) {
    const node = refToNode(ref, floatingRef)
    return rectWatcher.watch(node, "border-box")
}

function refToNode(ref: PositionTraitElementRef, floatingRef: FloatingRef<any>) {
    if (ref === "layer") {
        return floatingRef.layerSvc.root
    } else if (ref === "viewport" || ref instanceof Window) {
        return window
    } else {
        return ref
    }
}

function sizeWatcher(dimWatcher: DimensionWatcher, prop: "width" | "height", size?: SizeInput): Observable<number> {
    if (size === "viewport") {
        return dimWatcher.watch(window, "border-box").pipe(map(dim => dim[prop]))
    } else if (typeof size === "number") {
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

type MinMaxNames = keyof SizeConstraints
const MINMAX_NAMES: Array<MinMaxNames> = ["minWidth", "minHeight", "maxWidth", "maxHeight"]

function constraintsToStyle(pos: FloatingPosition, sizes: ConstraintsResult, options: SizeConstraintsInput) {
    const result: Partial<CSSStyleDeclaration> = {}
    for (const name of MINMAX_NAMES) {
        result[name] = constraintValue(pos, options, name, sizes[name])
    }
    return result
}

const DIM_DIRECTIONS: Record<"width" | "height", Array<FloatingPositionDirection>> = {
    width: [FloatingPositionDirection.Up, FloatingPositionDirection.Down, FloatingPositionDirection.Center],
    height: [FloatingPositionDirection.Left, FloatingPositionDirection.Right, FloatingPositionDirection.Center]
}

function constraintValue(pos: FloatingPosition, options: SizeConstraintsInput, name: MinMaxNames, value: number) {
    const wh = name.substring(3).toLowerCase() as "width" | "height"
    const maxValue = pos.placement.area[wh]

    // determine default or link value
    if (value == null || isNaN(value)) {
        const src = options[name]

        // if the given min/max value is link then test witch sides connected, and only use connected side value
        if (src === "link" && DIM_DIRECTIONS[wh].includes(pos.direction)) {
            return `${Math.min(maxValue, pos.anchor.rect[wh])}px`
        }

        // only return maxWidth / maxHeight, becuse minWidth / minHeight is auto if not presen
        const minmax = name.substring(0, 3) as "min" | "max"
        if (minmax === "max") {
            return `${maxValue}px`
        }

        return "auto"
    }

    return `${Math.min(maxValue, value)}px`
}

export function position(options: PositionTraitOptions) {
    return new PositionTrait(options)
}
