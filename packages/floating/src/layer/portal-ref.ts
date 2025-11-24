import { ComponentPortal, ComponentType, DomPortalOutlet, PortalOutlet, TemplatePortal } from "@angular/cdk/portal"
import { ComponentFactoryResolver, Provider, TemplateRef, ViewContainerRef } from "@angular/core"

import { ContainerOptions, ContainerRef } from "./container-ref"

export interface PortalOptions extends ContainerOptions {}

export abstract class PortalRef extends ContainerRef {
    protected override injectorName = "PortalRef"
    protected outlet: PortalOutlet

    constructor(options: PortalOptions) {
        super(options)

        this.outlet = new DomPortalOutlet(this.nativeElement, undefined, this.injector)
        this.state.on("disposed", () => {
            this.outlet.dispose()
            delete (this as any).outlet
        })
    }

    protected override getProviders(): Provider[] {
        return [...super.getProviders(), { provide: PortalRef, useValue: this }]
    }
}

export interface ComponentPortalOptions<T = any> extends PortalOptions {
    viewContainerRef?: ViewContainerRef
}

export class ComponentPortalRef<T = any> extends PortalRef {
    protected override injectorName = "ComponentPortalRef"
    protected readonly portal: ComponentPortal<T>

    constructor(
        public readonly component: ComponentType<T>,
        options: ComponentPortalOptions<T>
    ) {
        super(options)

        const vcr = this.injector.get(ViewContainerRef)

        this.portal = new ComponentPortal(component, options.viewContainerRef || vcr, this.injector)
        this.outlet.attach(this.portal)

        this.state.on("disposed", () => {
            this.portal.isAttached && this.portal.detach()
            delete (this as any).portal
        })
    }

    protected override getProviders(): Provider[] {
        return [...super.getProviders(), { provide: ComponentPortalRef, useValue: this }]
    }
}

export interface TemplatePortalOptions<T = any> extends PortalOptions {
    viewContainerRef: ViewContainerRef
    context?: T
}

export class TemplatePortalRef<T = any> extends PortalRef {
    protected override injectorName = "TemplatePortalRef"
    protected readonly portal: TemplatePortal<T>

    constructor(
        public readonly template: TemplateRef<T>,
        options: TemplatePortalOptions<T>
    ) {
        super(options)
        this.portal = new TemplatePortal(template, options.viewContainerRef, options.context)
        this.outlet.attach(this.portal)

        this.state.on("disposed", () => {
            this.portal.isAttached && this.portal.detach()
            delete (this as any).portal
        })
    }

    protected override getProviders(): Provider[] {
        return [...super.getProviders(), { provide: TemplatePortalRef, useValue: this }]
    }
}
