import { ComponentType } from "@angular/cdk/portal"
import { DOCUMENT } from "@angular/common"
import {
    Directive,
    ElementRef,
    inject,
    Inject,
    Injectable,
    InjectionToken,
    Injector,
    Optional,
    TemplateRef
} from "@angular/core"

import { toSorted } from "@ngutil/common"
import { CoverService } from "@ngutil/graphics"

import { BackdropOptions, BackdropRef } from "./backdrop-ref"
import { AlwaysOnTop, ChildRef } from "./child-ref"
import { ContainerOptions, ContainerRef } from "./container-ref"
import { ComponentPortalOptions, ComponentPortalRef, TemplatePortalOptions, TemplatePortalRef } from "./portal-ref"

export const LAYER_ZINDEX_START = new InjectionToken<number>("LAYER_ZINDEX_START")

// TODO: ELEVATION_STEP config with injection
// TODO: ELEVATION_START config with injection

@Directive()
export abstract class LayerService {
    readonly #cover = inject(CoverService)
    readonly #injector = inject(Injector)
    readonly #children: Array<ChildRef> = []
    readonly #zIndexStart: number

    abstract readonly root: HTMLElement

    constructor(@Inject(LAYER_ZINDEX_START) @Optional() zIndexStart?: number) {
        if (zIndexStart != null) {
            this.#zIndexStart = zIndexStart
        } else {
            this.#zIndexStart = 10000
        }
    }

    newComponentPortal<T>(component: ComponentType<T>, options: ComponentPortalOptions<T>): ComponentPortalRef<T> {
        if (!options.injector) {
            options = { ...options, injector: this.#injector }
        }
        return this.append(new ComponentPortalRef(component, options))
    }

    newTemplatePortal<T>(tpl: TemplateRef<T>, options: TemplatePortalOptions<T>): TemplatePortalRef<T> {
        if (!options.injector) {
            options = { ...options, injector: this.#injector }
        }
        return this.append(new TemplatePortalRef(tpl, options))
    }

    newContainer(options: ContainerOptions): ContainerRef {
        if (!options.injector) {
            options = { ...options, injector: this.#injector }
        }
        return this.append(new ContainerRef(options))
    }

    newBackdrop(under: ChildRef, options: BackdropOptions): BackdropRef {
        const coverRef = this.#cover.create(this.root, options)
        return this.append(new BackdropRef(coverRef, under, options))
    }

    append<T extends ChildRef>(ref: T): T {
        if (!this.#children.includes(ref)) {
            this.#children.push(ref)
            this.#update()
            this.root.appendChild(ref.nativeElement)
            ref.state.on("disposed", () => this.#remove(ref))
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

        let zIndex = this.#zIndexStart
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

@Injectable({ providedIn: "root" })
export class RootLayer extends LayerService {
    readonly #doc = inject(DOCUMENT)
    get root() {
        return this.#doc.body
    }
}

@Directive({
    standalone: true,
    providers: [{ provide: LayerService, useExisting: IndividualLayer }]
})
export class IndividualLayer extends LayerService {
    readonly #el = inject(ElementRef)
    get root() {
        return this.#el.nativeElement
    }
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
