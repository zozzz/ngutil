import { ComponentType } from "@angular/cdk/portal"
import { Directive, ElementRef, inject, Inject, InjectionToken, Injector, Optional, TemplateRef } from "@angular/core"

import { CoverService } from "@ngutil/graphics"

import { BackdropOptions, BackdropRef } from "./backdrop-ref"
import { ChildRef } from "./child-ref"
import { ContainerOptions, ContainerRef } from "./container-ref"
import { ComponentPortalOptions, ComponentPortalRef, TemplatePortalOptions, TemplatePortalRef } from "./portal-ref"

export const LAYER_ZINDEX_START = new InjectionToken<number>("LAYER_ZINDEX_START")

// TODO: ELEVATION_STEP config with injection
// TODO: ELEVATION_START config with injection

@Directive()
export abstract class LayerService {
    readonly #cover = inject(CoverService)
    readonly #injector = inject(Injector)

    readonly root = inject<ElementRef<HTMLElement>>(ElementRef)
    // readonly #el = this.root.nativeElement

    readonly #children: Array<ChildRef> = []
    readonly #zIndexStart: number
    // readonly #backdrop: Map<>

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

    newBackdrop(options: BackdropOptions): BackdropRef {
        return this.append(BackdropRef.from(this.#cover, options, this.#injector))
    }

    append<T extends ChildRef>(ref: T): T {
        if (!this.#children.includes(ref)) {
            this.#children.push(ref)
            ref.state.on("disposed", () => this.#remove(ref))
            this.#update()
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
        this.#children.sort(sortChildren)

        let zIndex = this.#zIndexStart
        for (const child of this.#children) {
            child.zIndex = zIndex
            zIndex += 1
        }
    }
}

@Directive({
    selector: "body",
    exportAs: "nuRootLayer",
    providers: [{ provide: LayerService, useExisting: RootLayer }]
})
export class RootLayer extends LayerService {}

@Directive({
    providers: [{ provide: LayerService, useExisting: IndividualLayer }]
})
export class IndividualLayer extends LayerService {}

function sortChildren(a: ChildRef, b: ChildRef) {
    if (a instanceof BackdropRef && a.under === b) {
        return -1
    } else if (b instanceof BackdropRef && b.under === a) {
        return 1
    }
    return 0
}
