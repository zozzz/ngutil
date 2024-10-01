import {
    distinctUntilChanged,
    exhaustMap,
    filter,
    from,
    fromEvent,
    map,
    Observable,
    ObservableInput,
    of,
    race
} from "rxjs"

import { KeystrokeService } from "@ngutil/aria"
import { coerceElement, ElementInput } from "@ngutil/common"

import { FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"

export interface ClickOutsideOptions {
    /**
     * If clicks happened on this element, that not trigger the close event
     */
    allowedElements?: ElementInput[]
}

export interface CloseTriggerOptions {
    /**
     * Close floating when click outside of floating element
     */
    clickOutside?: boolean | ClickOutsideOptions

    /**
     * Only works when the floating element is focused
     */
    keystroke?: boolean

    /**
     * Close when emitting any value
     */
    trigger?: ObservableInput<any>
}

export interface CloseTriggerEvent {
    source: "click" | "keystroke" | "backbutton" | "trigger"
}

class CloseTriggerTrait implements FloatingTrait {
    readonly name = "close-trigger"

    constructor(readonly options: CloseTriggerOptions = {}) {}

    connect(floatingRef: FloatingRef): Observable<CloseTriggerEvent | void> {
        const { keystroke, clickOutside, trigger } = this.options

        const container = floatingRef.container.nativeElement
        const triggers = []
        const selfUid = Number(floatingRef.uid)

        if (keystroke) {
            const ks = floatingRef.container.injector.get(KeystrokeService)

            triggers.push(
                ks.watch(container, { key: "Escape", state: "up" }).pipe(
                    map(() => {
                        return { source: "keystroke" as const }
                    })
                )
            )

            // TODO: angular auxiliary route
        }

        if (clickOutside) {
            const allowedElements =
                typeof clickOutside === "boolean" ? [] : clickOutside.allowedElements?.map(coerceElement) || []

            triggers.push(
                fromEvent(document, "click", { capture: true, passive: true }).pipe(
                    filter(event => {
                        if (!(event.target instanceof HTMLElement)) {
                            return false
                        }
                        const target = event.target

                        for (const allowed of allowedElements) {
                            if (target === allowed || allowed.contains(target)) {
                                return false
                            }
                        }

                        const floatingUid = getFloatingUid(target, "data-floating", "floating")
                        const backdropUid = getFloatingUid(target, "data-floating-backdrop", "floatingBackdrop")
                        const otherBackdropUid =
                            floatingUid != null && floatingUid !== selfUid
                                ? getFloatingUid(
                                      document.querySelector(`[data-floating-backdrop="${floatingUid}"]`),
                                      "data-floating-backdrop",
                                      "floatingBackdrop"
                                  )
                                : undefined

                        // console.log({ floatingUid, backdropUid, otherBackdropUid, self: selfUid })

                        if (floatingUid == null && backdropUid == null) {
                            return true
                        } else {
                            return (
                                // click on self or erlier backdrop
                                (backdropUid != null && backdropUid <= selfUid) ||
                                // click on other floating element, whitout backdrop
                                (floatingUid != null && otherBackdropUid == null && floatingUid < selfUid) ||
                                // click on other floating element that opened erlier
                                (floatingUid != null && floatingUid < selfUid)
                            )
                        }
                    }),
                    map(() => {
                        return { source: "click" as const }
                    })
                )
            )
        }

        if (trigger) {
            triggers.push(
                from(trigger).pipe(
                    map(() => {
                        return { source: "trigger" as const }
                    })
                )
            )
        }

        if (triggers.length === 0) {
            return of()
        } else {
            return race(...triggers).pipe(
                exhaustMap(event =>
                    floatingRef.close().pipe(
                        map(() => event),
                        distinctUntilChanged()
                    )
                )
            )
        }
    }
}

export function closeTrigger(options: CloseTriggerOptions = { clickOutside: true, keystroke: true }) {
    return new CloseTriggerTrait(options)
}

function getFloatingUid(el: HTMLElement | null, attr: string, dataset: string): number | undefined {
    if (el == null) {
        return undefined
    }

    if (el.matches(`[${attr}]`)) {
        return Number(el.dataset[dataset]) || undefined
    } else {
        const parent = el.closest(`[${attr}]`) as HTMLElement
        if (parent) {
            return Number(parent.dataset[dataset]) || undefined
        }
    }
    return undefined
}
