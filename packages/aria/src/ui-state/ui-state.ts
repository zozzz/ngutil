import { computed, inject, Injectable, signal, untracked } from "@angular/core"

import { finalize, Observable, tap } from "rxjs"

import { Mutable } from "utility-types"

import { deepClone } from "@ngutil/common"

const uid_counter = 0

// export interface UiSateValue {
//     [key: string]: UiStateEntry
// }

// export type UiStateSource = "parent" | "self" | string

// export interface UiStateEntry {
//     value: boolean | undefined
//     source: UiStateSource
// }

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

// @Injectable()
// export class UiStateRx {
//     readonly #parent = inject(UiState, { skipSelf: true, optional: true })

//     // readonly #set = new Subject<SetEntry>()
//     // readonly #self_complex = this.#set.pipe(
//     //     scan((state, next) => {
//     //         const key = `${next.name}-${next.source}`
//     //         if (!state[key]) {
//     //             state[key] = new BehaviorSubject(next)
//     //         } else {
//     //             state[key].next(next)
//     //         }
//     //         return state
//     //     }, {} as ObservableStates),
//     //     distinctUntilChanged((a, b) => {
//     //         const aKeys = Object.keys(a)
//     //         const bKeys = Object.keys(b)
//     //         return aKeys.length === bKeys.length && aKeys.every(value => bKeys.includes(value))
//     //     }),
//     //     tap(() => console.log("state keys changed")),
//     //     switchMap(input =>
//     //         combineLatest(Object.values(input)).pipe(
//     //             tap(e => console.log(e)),
//     //             map(entries =>
//     //                 entries.reduce((result, entry) => {
//     //                     const resultEntry: Mutable<UiStateEntry> = result[entry.name] || (result[entry.name] = {})
//     //                     resultEntry[entry.source] = entry.value
//     //                     return result
//     //                 }, {} as Mutable<UiStateValue>)
//     //             )
//     //         )
//     //     ),
//     //     shareReplay(1)
//     // )

//     // readonly #self: Observable<UiStateValue> = this.#set.pipe(
//     //     scan((state, set) => {
//     //         const entry: UiStateEntry = state[set.name] || {}
//     //         return { ...state, [set.name]: { ...entry, [set.source]: set.value } }
//     //     }, {} as UiStateValue),
//     //     distinctUntilChanged(isEqual),
//     //     shareReplay(1)
//     // )

//     readonly #self = new BehaviorSubject<UiStateValue>({})

//     readonly value$: Observable<UiStateValue> = combineLatest({
//         parent: this.#parent?.flat$ || of({} as UiStateFlat),
//         self: this.#self
//     }).pipe(
//         map(({ parent, self }) => {
//             const result: Mutable<UiStateValue> = {}

//             for (const [key, value] of Object.entries(parent)) {
//                 if (key in self) {
//                     continue
//                 }
//                 result[key] = { parent: value }
//             }

//             for (const [key, value] of Object.entries(self)) {
//                 if (key in parent) {
//                     result[key] = { ...value, parent: parent[key] }
//                 } else {
//                     result[key] = value
//                 }
//             }
//             return result
//         }),
//         shareReplay(1)
//     )

//     readonly flat$: Observable<UiStateFlat> = this.value$.pipe(
//         map(value => {
//             const result: Mutable<UiStateFlat> = {}
//             for (const [key, entry] of Object.entries(value)) {
//                 result[key] = Object.keys(entry)
//                     .sort(sortSourceKeys)
//                     .some(source => entry[source])
//             }
//             return result
//         }),
//         shareReplay(1)
//     )

//     // readonly uid = ++uid_counter

//     // constructor() {
//     //     console.log(this)
//     // }

//     set(name: string, value: boolean, source: UiStateSource = "self") {
//         const current = this.#self.value
//         const entry = current[name] || {}

//         if (entry[source] !== value) {
//             this.#self.next({ ...current, [name]: { ...entry, [source]: value } })
//         }
//     }

//     watch(name: string): Observable<UiStateEntry | undefined> {
//         return this.value$.pipe(
//             map(value => value[name]),
//             share()
//         )
//     }

//     is(name: string, defaultValue?: boolean): Observable<boolean | undefined> {
//         return this.flat$.pipe(
//             map(value => value[name] ?? defaultValue),
//             shareReplay(1)
//         )
//     }
// }

@Injectable()
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

const SourcePriority = ["self", "parent"]

function sortSourceKeys(a: string, b: string) {
    const aIndex = SourcePriority.indexOf(a)
    const bIndex = SourcePriority.indexOf(b)
    if (aIndex === -1 && bIndex === -1) {
        return a.localeCompare(b)
    } else if (aIndex === -1) {
        return 1
    } else if (bIndex === -1) {
        return -1
    } else {
        return aIndex - bIndex
    }
}
