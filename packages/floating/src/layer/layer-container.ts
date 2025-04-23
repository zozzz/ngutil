import { DOCUMENT } from "@angular/common"
import { Directive, ElementRef, inject, Injectable, InjectionToken } from "@angular/core"

import { toSorted } from "@ngutil/common"

import { BackdropRef } from "./backdrop-ref"
import { AlwaysOnTop, ChildRef } from "./child-ref"

export const LAYER_CONTAINER_ZINDEX_START = new InjectionToken<number>("LAYER_CONTAINER_ZINDEX_START")

@Directive()
export abstract class LayerContainer {
    abstract readonly root: HTMLElement

    readonly #children: Array<ChildRef> = []
    readonly zIndexStart: number = inject(LAYER_CONTAINER_ZINDEX_START)

    append<T extends ChildRef>(ref: T): T {
        if (!this.#children.includes(ref)) {
            this.#children.push(ref)
            this.#update()
            this.root.appendChild(ref.nativeElement)
            ref.state.on("disposing", () => this.#remove(ref))
        }
        return ref
    }

    #remove(ref: ChildRef) {
        const idx = this.#children.indexOf(ref)
        if (idx > -1) {
            this.#children.splice(idx, 1)
            this.#update()
        }
    }

    #update() {
        const children = toSorted(this.#children, sortChildren2)

        let zIndex = this.zIndexStart
        for (const child of children) {
            child.zIndex = zIndex
            zIndex += 1
        }

        children.sort(sortByZIndexDesc)

        let hasBackdrop = false
        for (const child of children) {
            if (child instanceof BackdropRef && child.options.color !== "transparent") {
                child.visible = !hasBackdrop
                hasBackdrop = true
            }
        }
    }
}

@Injectable()
export class RootLayer extends LayerContainer {
    readonly root = inject(DOCUMENT).body
}

@Directive({
    providers: [{ provide: LayerContainer, useExisting: IndividualLayer }]
})
export class IndividualLayer extends LayerContainer {
    readonly root = inject(ElementRef).nativeElement
}

function sortChildren2(a: ChildRef, b: ChildRef) {
    const alwaysOnTop = sortByAlwaysOnTop(a, b)
    if (alwaysOnTop === 0) {
        return sortByBackdrop(a, b)
    } else {
        return alwaysOnTop
    }
}

function sortByBackdrop(a: ChildRef, b: ChildRef) {
    if (a instanceof BackdropRef && a.under === b) {
        return -1
    } else if (b instanceof BackdropRef && b.under === a) {
        return 1
    }
    return 0
}

function sortByZIndexDesc(a: ChildRef, b: ChildRef) {
    return b.zIndex - a.zIndex
}

function sortByAlwaysOnTop(a: ChildRef, b: ChildRef) {
    return getAlwaysOnTop(a) - getAlwaysOnTop(b)
}

function getAlwaysOnTop(child: ChildRef): number {
    if (child instanceof BackdropRef) {
        return child.under.alwaysOnTop || AlwaysOnTop.None
    } else {
        return child.alwaysOnTop || AlwaysOnTop.None
    }
}
