import { ComponentType } from "@angular/cdk/portal"
import { inject, Injectable, Provider, TemplateRef } from "@angular/core"

import { Observable, Subscriber } from "rxjs"

import { LayerService } from "../layer/layer.service"
import { ComponentPortalOptions, TemplatePortalOptions } from "../layer/portal-ref"
import { FloatingChannel, FloatingRef, TRAITS } from "./floating-ref"
import { type FloatingTrait } from "./traits/_base"
import { type FloatingPositionOptions, position } from "./traits/position"

// export type FloatingTrait = (...args: any[]) => (traits: object) => Observable<object>

export abstract class FloatingFactory {
    protected readonly traits: { [key: string]: FloatingTrait } = {}

    constructor(protected readonly layer: LayerService) {}

    trait(...traits: Array<FloatingTrait | FloatingTrait[]>) {
        for (const trait of traits) {
            if (Array.isArray(trait)) {
                this.trait(...trait)
            } else {
                this.traits[trait.name] = trait
            }
        }

        return this
    }

    show(): Observable<FloatingChannel> {
        return new Observable((dest: Subscriber<FloatingChannel>) => {
            let disposed = false

            const ref = this.create()
            const channelSub = ref.channel.subscribe(event => {
                dest.next(event)
                if (event.type === "disposed") {
                    disposed = true
                    dest.complete()
                }
            })

            const showSub = ref.show().subscribe()

            return () => {
                showSub.unsubscribe()
                channelSub.unsubscribe()
                if (!disposed) {
                    const dispose$ = ref.channel.subscribe(event => {
                        if (event.type === "disposed") {
                            hideSub.unsubscribe()
                            dispose$.unsubscribe()
                        }
                    })
                    const hideSub = ref.hide().subscribe()
                }
            }
        })
    }

    subscribe = (...args: any[]) => this.show().subscribe(...args)

    protected providers(providers?: Provider[]): Provider[] {
        if (!providers) {
            providers = []
        }

        providers = [
            ...providers,
            { provide: TRAITS, useValue: this.traits },
            { provide: LayerService, useValue: this.layer },
            FloatingRef
        ]

        return providers
    }

    protected abstract create(): FloatingRef<FloatingChannel>

    position(options: FloatingPositionOptions) {
        return this.trait(position(options))
    }
}

export class FloatingTemplateFactory<T extends object> extends FloatingFactory {
    constructor(
        layer: LayerService,
        public readonly tpl: TemplateRef<T>,
        public readonly options: TemplatePortalOptions<T>
    ) {
        super(layer)
    }

    protected override create(): FloatingRef<FloatingChannel> {
        const options: TemplatePortalOptions<T> = { ...this.options }
        options.providers = this.providers(options.providers)
        const container = this.layer.newTemplatePortal(this.tpl, options)
        return container.injector.get(FloatingRef)
    }
}

export class FloatingComponentFactory<T extends ComponentType<any>> extends FloatingFactory {
    constructor(
        layer: LayerService,
        public readonly component: T,
        public readonly options: ComponentPortalOptions<T>
    ) {
        super(layer)
    }

    protected override create(): FloatingRef<FloatingChannel> {
        const options: ComponentPortalOptions<T> = { ...this.options }
        options.providers = this.providers(options.providers)
        const container = this.layer.newComponentPortal(this.component, options)
        return container.injector.get(FloatingRef)
    }
}

/**
 * @example
 * ```typescript
 * class SomeComponent {}
 *
 * class SomeList {
 *      readonly floating = inject(FloatingService)
 *
 *      showComponent() {
 *          this.floating.from(SomeComponent).traits(position(), backdrop()).subscribe()
 *      }
 * ```
 */
@Injectable()
export class FloatingService {
    readonly #layer = inject(LayerService)
    // readonly parent = inject(FloatingRef, { skipSelf: true, optional: true })

    from<T extends ComponentType<any>>(component: T, opts?: ComponentPortalOptions<T>): FloatingComponentFactory<T>

    from<T extends object>(tpl: TemplateRef<T>, opts?: TemplatePortalOptions<T>): FloatingTemplateFactory<T>

    from<T>(value: ComponentType<T> | TemplateRef<T>, opts: any): FloatingFactory {
        if (value instanceof TemplateRef) {
            return new FloatingTemplateFactory(this.#layer, value as any, opts)
        } else {
            return new FloatingComponentFactory(this.#layer, value as any, opts)
        }
    }
}
