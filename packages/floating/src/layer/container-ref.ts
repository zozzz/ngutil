import { Injector, Provider } from "@angular/core"

import { AlwaysOnTop, ChildRef } from "./child-ref"

export interface ContainerOptions {
    alwaysOnTop?: AlwaysOnTop
    elevation?: number
    classes?: string[]
    attributes?: Record<string, string>
    injector?: Injector
    providers?: Provider[]
}

export class ContainerRef extends ChildRef {
    public readonly injector: Injector

    protected injectorName = "ContainerRef"

    constructor(public readonly options: ContainerOptions) {
        super(createElement(options), options.alwaysOnTop || AlwaysOnTop.None)

        const providers = options.providers || []
        this.injector = Injector.create({
            providers: [...this.getProviders(), ...providers],
            parent: options.injector,
            name: this.injectorName
        })

        this.state.on("disposed", () => {
            delete (this as any).options
            delete (this as any).injector
        })
    }

    protected getProviders(): Provider[] {
        return [
            { provide: ChildRef, useValue: this },
            { provide: ContainerRef, useValue: this }
        ]
    }
}

function createElement(options: ContainerOptions): HTMLDivElement {
    const div = document.createElement("div")
    div.style.position = "absolute"
    div.style.top = "0"
    div.style.left = "0"
    div.style.width = "max-content"
    div.style.display = "inline-flex"
    div.style.flexDirection = "column"
    div.style.alignItems = "stretch"
    div.style.justifyContent = "stretch"
    div.style.boxSizing = "border-box"

    if (options.classes) {
        div.classList.add(...options.classes)
    }

    return div
}
