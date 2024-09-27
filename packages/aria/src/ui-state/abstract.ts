import { computed, Directive, effect, inject, Signal } from "@angular/core"

import { coerceBoolAttr } from "@ngutil/common"

import { UiState } from "./ui-state"

export const NOTSET: any = Symbol("NOTSET")

@Directive()
export abstract class AbstractUiState<N extends string> {
    readonly state: UiState<N> = inject(UiState)

    protected abstract readonly input: Signal<boolean>
    protected abstract readonly when: Signal<string>

    readonly yes = computed(() => {
        const when = this.when()
        if (when !== NOTSET) {
            return this.state.is(this.name, `${when},self`)
        }
        return this.state.is(this.name)
    })
    readonly no = computed(() => !this.yes())

    constructor(readonly name: N) {
        effect(
            () => {
                const input = this.input()
                if (input !== NOTSET) {
                    this.state.set(name, !!coerceBoolAttr(input))
                }
                this.yes()
            },
            { allowSignalWrites: true }
        )
    }

    set(value: boolean, source: string) {
        this.state.set(this.name, value, source)
    }
}
