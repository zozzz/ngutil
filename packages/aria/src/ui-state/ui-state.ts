import { computed, Directive, inject, signal, untracked } from "@angular/core"

import { finalize, Observable, tap } from "rxjs"

import { Mutable } from "utility-types"

import { deepClone } from "@ngutil/common"

/**
 * {
 *  busy: {
 *      self: true,
 *      parent: false,
 *      disabled: false
 *  }
 * }
 */
export type UiStateDetails = { readonly [key: string]: UiStateEntry }

export type UiStateEntry = { readonly [key: UiStateSource]: boolean }

export type UiStateValue = { readonly [key: string]: boolean }

export type UiStateSource = "parent" | "self" | string

export type UiStateSourceSelector<S extends UiStateSource> = "*" | S

@Directive()
export class UiState<N extends string = string, S extends UiStateSource = UiStateSource> {
    readonly #parent = inject(UiState, { skipSelf: true, optional: true })

    get root(): UiState {
        return this.#parent?.root || this
    }

    readonly #self = signal<UiStateDetails>({})

    readonly merged = computed<UiStateDetails>(() => {
        const parent = this.#parent?.merged()
        const self = this.#self()
        if (parent) {
            const result: Mutable<UiStateDetails> = deepClone(self)

            for (const [k, v] of Object.entries(parent)) {
                const parentIsTrue = Object.values(v).includes(true)
                const { self: _, ...parentWihtoutSelf } = v
                if (result[k] != null) {
                    result[k] = {
                        ...parentWihtoutSelf,
                        ...result[k],
                        parent: parentIsTrue
                    }
                } else {
                    result[k] = { ...parentWihtoutSelf, parent: parentIsTrue }
                }
            }

            return result
        } else {
            return self
        }
    })

    readonly value = computed<UiStateValue>(() => {
        const merged = this.merged()
        const result: Mutable<UiStateValue> = {}

        for (const [k, v] of Object.entries(merged)) {
            result[k] = Object.values(v).includes(true)
        }

        return result
    })

    set(name: N, value: boolean, source: S = "self" as S) {
        if (source === "parent") {
            console.error("can't set parent state")
            return
        }

        const current = untracked(this.#self)
        const entry = current[name] || {}

        if (entry[source] !== value) {
            this.#self.set({ ...current, [name]: { ...entry, [source]: value } })
        }

        const root = this.root
        if (source !== "self" && root !== this) {
            root.set(name, value, source)
        }
    }

    is(name: N, selector: UiStateSourceSelector<S> = "*"): boolean {
        if (selector === "*") {
            const current = this.value()
            return current[name] ?? false
        } else if (selector.includes(",")) {
            const merged = this.merged()
            return selector
                .split(/\s*,\s*/)
                .map(v => merged[name]?.[v] ?? false)
                .some(v => v)
        } else {
            const merged = this.merged()
            return merged[name]?.[selector] ?? false
        }
    }

    intercept(name: N, source: S) {
        return <S>(src: Observable<S>) =>
            src.pipe(
                tap(() => this.set(name, true, source)),
                finalize(() => this.set(name, false, source))
            )
    }
}