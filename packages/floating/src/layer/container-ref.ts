import { Injector, Provider } from "@angular/core"

import { ChildRef } from "./child-ref"

export interface ContainerOptions {
    alwaysOnTop?: boolean
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
        super(createElement(options))

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
    return div
}
