import { ElementRef, inject, Injectable } from "@angular/core"

import {
    combineLatest,
    filter,
    from,
    map,
    Observable,
    ObservableInput,
    of,
    Subscriber,
    switchMap,
    TeardownLogic
} from "rxjs"

import { coerceElement, ElementInput, isElementInput } from "@ngutil/common"
import { Rect, rectContract, rectExpand, RectWatcher, SidesInput } from "@ngutil/style"

import { maxPossibleRadius, Polygon, polygonArc, polygonRect, polygonRoundedRect, polygonToCss } from "./util"

export interface CommonCoverOptions {
    color: "transparent" | string
    style?: Partial<CSSStyleDeclaration>
}

export interface SolidCoverOptions extends CommonCoverOptions {
    type: "solid"
}

export interface CropCoverOptions extends CommonCoverOptions {
    type: "crop"
    /**
     * Element that will be interactive while the cover is visible
     */
    crop: ElementInput | ObservableInput<Rect | ElementInput>
    shape: CropShapeOptions
    expand?: SidesInput
    contract?: SidesInput
    disablePointerEvents?: boolean
}

export type CropShapeOptions = CropRectOptions | CropCircleOptions | CropShapeCustom

export interface CropRectOptions {
    type: "rect"
    borderRadius?: number
}

export interface CropCircleOptions {
    type: "circle"
}

export type CropShapeCustom = (container: Rect, crop: Rect) => Polygon

export interface RevealCoverOptions extends CommonCoverOptions {
    type: "reveal"
    /**
     * Left and right coordinates inside the container
     */
    origin: { left: number; top: number }
}

export type CoverOptions = SolidCoverOptions | CropCoverOptions | RevealCoverOptions

export abstract class CoverRef<O extends CommonCoverOptions, R = void> extends ElementRef<HTMLElement> {
    protected readonly watcher: RectWatcher

    constructor(
        readonly container: ElementInput,
        readonly options: O,
        watcher: RectWatcher
    ) {
        super(document.createElement("div"))
        this.watcher = watcher

        Object.assign(this.nativeElement.style, {
            position: "absolute",
            inset: "0px"
        })
    }

    show(): Observable<R> {
        return new Observable(dest => {
            const element = this.nativeElement
            coerceElement(this.container).appendChild(element)
            dest.add(() => element.parentElement?.removeChild(element))
            return this._show(dest)
        })
    }

    protected applyStyle(mask: HTMLElement) {
        const options = this.options
        const backgroundColor = options.color === "transparent" ? "rgba(255, 255, 255, 0.0001)" : options.color

        if (options.style) {
            Object.assign(mask.style, { backgroundColor, ...options.style })
        } else {
            Object.assign(mask.style, { backgroundColor })
        }
    }

    protected abstract _show(dest: Subscriber<unknown>): TeardownLogic
}

export class SolidCoverRef extends CoverRef<SolidCoverOptions> {
    protected override _show(dest: Subscriber<unknown>): TeardownLogic {
        this.applyStyle(this.nativeElement)
    }
}

export class CropCoverRef extends CoverRef<CropCoverOptions> {
    protected override _show(dest: Subscriber<unknown>): TeardownLogic {
        const options = this.options
        const crop = isElementInput(options.crop) ? of(options.crop) : from(options.crop)
        let maskEl = this.nativeElement

        // TODO: a backdrop filter kicsit ksőbb jelenik meg így
        if (this.options.disablePointerEvents) {
            maskEl = document.createElement("div")
            Object.assign(maskEl.style, {
                position: "absolute",
                inset: "0px"
            })
            this.applyStyle(maskEl)
            // maskEl.style.backdropFilter = null as any
            this.nativeElement.appendChild(maskEl)
            this.nativeElement.style.background = "rgba(0, 0, 0, 0.1)"
            // this.nativeElement.style.backdropFilter = this.options.style?.backdropFilter as any
        } else {
            this.applyStyle(this.nativeElement)
        }

        return combineLatest({
            container: this.watcher.watch(this.container, "border-box"),
            crop: crop.pipe(
                filter(value => value != null),
                switchMap(crop => {
                    if (isElementInput(crop)) {
                        return this.watcher.watch(coerceElement(crop), "border-box")
                    } else {
                        return of(crop)
                    }
                }),
                map(crop => {
                    if (this.options.expand) {
                        crop = rectExpand(crop, this.options.expand)
                    }

                    if (this.options.contract) {
                        crop = rectContract(crop, this.options.contract)
                    }

                    return crop
                })
            )
        }).subscribe(({ container, crop }) => {
            const outer = polygonRect({ x: 0, y: 0 }, { x: container.width, y: container.height })
            const croppedArea = this.#polygon(container, crop).reverse()
            const polygon = [...outer, ...croppedArea]

            maskEl.style.clipPath = polygonToCss(polygon)
        })
    }

    #polygon(container: Rect, crop: Rect): Polygon {
        const shape = this.options.shape
        if (typeof shape === "function") {
            return shape(container, crop)
        } else if (shape.type === "circle") {
            const r = maxPossibleRadius(crop.x, crop.y, crop.width, crop.height)
            return polygonArc({ x: crop.x + r, y: crop.y + r }, r, 0, Math.PI * 2)
        } else if (shape.type === "rect") {
            const top = Math.round(Math.max(crop.y - container.y, 0))
            const right = Math.round(Math.max(crop.x + crop.width))
            const bottom = Math.round(Math.max(crop.y + crop.height))
            const left = Math.round(Math.max(crop.x - container.x))

            if (shape.borderRadius != null) {
                return polygonRoundedRect({ x: left, y: top }, { x: right, y: bottom }, shape.borderRadius)
            } else {
                return polygonRect({ x: left, y: top }, { x: right, y: bottom })
            }
        }
        return []
    }
}

export class RevealCoverRef extends CoverRef<RevealCoverOptions> {
    protected override _show(dest: Subscriber<unknown>): TeardownLogic {}
}

@Injectable({ providedIn: "root" })
export class CoverService {
    readonly #watcher = inject(RectWatcher)

    create(container: ElementInput, options: CoverOptions) {
        switch (options.type) {
            case "solid":
                return new SolidCoverRef(container, options, this.#watcher)
            case "crop":
                return new CropCoverRef(container, options, this.#watcher)
            case "reveal":
                return new RevealCoverRef(container, options, this.#watcher)
        }
    }
}
