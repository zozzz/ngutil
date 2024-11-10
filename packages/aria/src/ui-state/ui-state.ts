import { computed, Directive, inject, signal, untracked } from "@angular/core"

import { Observable } from "rxjs"

import { Mutable } from "utility-types"

import { deepClone } from "@ngutil/common"

import { compile as compileSelector } from "./selector"

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

export type UiStateSelector = string

@Directive({ standalone: true })
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

    readonly inertSelector = signal("busy || disabled || readonly")

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

        // TODO: maybe some option to propagate to root
        // const root = this.root
        // if (source !== "self" && root !== this) {
        //     root.set(name, value, source)
        // }
    }

    is(selector: UiStateSelector = "*"): boolean {
        return compileSelector(selector)(this.merged())
    }

    intercept(name: N, source: S) {
        return <S>(src: Observable<S>) => this.wrap(src, name, source)
    }

    wrap<T>(observable: Observable<T>, name: N, source: S): Observable<T> {
        return new Observable<T>(subscriber => {
            this.set(name, true, source)
            subscriber.add(() => this.set(name, false, source))
            return observable.subscribe(subscriber)
        })
    }

    isInert() {
        return this.is(this.inertSelector())
    }
}
