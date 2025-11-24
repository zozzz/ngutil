
import { inject, Injectable, NgZone, DOCUMENT } from "@angular/core"

import {
    distinctUntilChanged,
    EMPTY,
    filter,
    from,
    fromEvent,
    map,
    merge,
    Observable,
    of,
    share,
    shareReplay,
    startWith,
    Subscriber,
    switchMap
} from "rxjs"

import { coerceElement, ElementInput, isElementInput } from "@ngutil/common"

import { FocusState } from "../focus"

export interface Keystroke {
    // https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
    key: KeyboardEvent["key"]
    shift?: boolean
    ctrl?: boolean
    alt?: boolean
    state: "down" | "up"
}

export interface KeystrokeEvent {
    original: KeyboardEvent
    keystroke: Keystroke
}

export type KeystrokeActivation = ElementInput | FocusState | Observable<ElementInput | FocusState | boolean>

@Injectable({ providedIn: "root" })
export class KeystrokeService {
    readonly #document = inject(DOCUMENT)
    readonly #zone = inject(NgZone)

    readonly #keyEvent = this.#zone.runOutsideAngular(() =>
        merge(
            fromEvent<KeyboardEvent>(this.#document, "keydown", { capture: true, passive: false }),
            fromEvent<KeyboardEvent>(this.#document, "keyup", { capture: true, passive: false })
        ).pipe(
            filter(event => event.defaultPrevented === false),
            share()
        )
    )

    readonly #focusEvent = this.#zone.runOutsideAngular(() =>
        fromEvent(this.#document, "focus", { capture: true, passive: true }).pipe(
            startWith(null),
            map(() => this.#document.activeElement),
            shareReplay(1)
        )
    )

    watch(activation: KeystrokeActivation, ...keystrokes: Keystroke[]): Observable<KeystrokeEvent> {
        return new Observable((dst: Subscriber<KeystrokeEvent>) =>
            this.#trigger(activation)
                .pipe(
                    distinctUntilChanged(),
                    switchMap(enabled => {
                        if (enabled) {
                            return this.#keyEvent
                        } else {
                            return EMPTY
                        }
                    }),
                    map(event => {
                        if (event.defaultPrevented) {
                            return []
                        }

                        const idFromEvent = keystrokeId(eventToKeystroke(event))
                        const matches = keystrokes
                            .filter(ks => keystrokeId(ks) === idFromEvent)
                            .map(ks => {
                                return {
                                    original: event,
                                    keystroke: ks
                                }
                            })

                        if (matches.length > 0) {
                            event.preventDefault()
                        }

                        return matches
                    }),
                    filter(matches => matches.length > 0),
                    switchMap(matches => of(...matches))
                )
                .subscribe(dst)
        )
    }

    #trigger(activation: KeystrokeActivation): Observable<boolean | HTMLElement> {
        if (isElementInput(activation)) {
            return this.#focusActivation(coerceElement(activation))
        } else if (activation instanceof FocusState) {
            return activation.event$.pipe(map(({ origin }) => origin != null))
        } else {
            return from(activation).pipe(
                switchMap(value => {
                    if (isElementInput(value) || value instanceof FocusState) {
                        return this.#trigger(value)
                    } else {
                        return of(value)
                    }
                })
            )
        }
    }

    #focusActivation(element: HTMLElement): Observable<boolean> {
        return this.#focusEvent.pipe(map(focused => focused === element || element.contains(focused)))
    }
}

function keystrokeId(ks: Keystroke): string {
    let res = ks.key
    if (ks.shift) {
        res += "+shift"
    }
    if (ks.ctrl) {
        res += "+ctrl"
    }
    if (ks.alt) {
        res += "+alt"
    }
    res += `${ks.state}`
    return res
}

function eventToKeystroke(event: KeyboardEvent): Keystroke {
    return {
        key: event.key,
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        state: event.type === "keyup" ? "up" : "down"
    }
}
