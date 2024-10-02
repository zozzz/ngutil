import { ComponentType } from "@angular/cdk/portal"
import { ApplicationRef, inject, Injectable, Injector, TemplateRef, ViewContainerRef } from "@angular/core"

import { coerceElement, ElementInput } from "@ngutil/common"
import { CoverService } from "@ngutil/graphics"

import { BackdropOptions, BackdropRef } from "./backdrop-ref"
import { AlwaysOnTop, ChildRef } from "./child-ref"
import { ContainerOptions, ContainerRef } from "./container-ref"
import { ExternalRef } from "./external-ref"
import { LayerContainer } from "./layer-container"
import { ComponentPortalOptions, ComponentPortalRef, TemplatePortalOptions, TemplatePortalRef } from "./portal-ref"

// TODO: ELEVATION_STEP config with injection
// TODO: ELEVATION_START config with injection

@Injectable()
export class LayerService {
    readonly #container = inject(LayerContainer)
    readonly #cover = inject(CoverService)
    readonly #injector = inject(Injector)
    readonly #appRef = inject(ApplicationRef)

    get root() {
        return this.#container.root
    }

    constructor() {
        console.log(this.#appRef)

        // console.log(this.#appRef.)
    }

    newComponentPortal<T>(component: ComponentType<T>, options: ComponentPortalOptions<T>): ComponentPortalRef<T> {
        // console.log(this.getRootViewContainerRef())
        if (!options.injector) {
            options = { ...options, injector: this.#getInjector() }
        }
        return this.#container.append(new ComponentPortalRef(component, options))
    }

    newTemplatePortal<T>(tpl: TemplateRef<T>, options: TemplatePortalOptions<T>): TemplatePortalRef<T> {
        if (!options.injector) {
            options = { ...options, injector: this.#getInjector() }
        }
        return this.#container.append(new TemplatePortalRef(tpl, options))
    }

    newContainer(options: ContainerOptions): ContainerRef {
        if (!options.injector) {
            options = { ...options, injector: this.#getInjector() }
        }
        return this.#container.append(new ContainerRef(options))
    }

    newBackdrop(under: ChildRef, options: BackdropOptions): BackdropRef {
        const coverRef = this.#cover.create(this.root, options)
        return this.#container.append(new BackdropRef(coverRef, under, options))
    }

    addExternal(element: ElementInput, alwaysOnTop: AlwaysOnTop = AlwaysOnTop.None) {
        return this.#container.append(new ExternalRef(coerceElement(element), alwaysOnTop))
    }

    #getInjector() {
        try {
            this.#injector.get(ViewContainerRef)
            return this.#injector
            // eslint-disable-next-line no-empty
        } catch (err) {}

        const root = this.#appRef.components[0]
        return root.injector
    }
}
