import { Injectable } from "@angular/core"
import { takeUntilDestroyed } from "@angular/core/rxjs-interop"

import { map, Observable, share, Subject, Subscriber } from "rxjs"

import { coerceElement, ElementInput } from "@ngutil/common"

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

interface KeystrokeEntry {
    keystroke: Keystroke
    target: HTMLElement
    subject: Subject<KeystrokeEvent>
}

@Injectable({ providedIn: "root" })
export class KeystrokeService {
    readonly #keystrokes: { [key: string]: KeystrokeEntry[] } = {}

    readonly #keyEvent = new Observable((dst: Subscriber<KeyboardEvent>) => {
        const handler = (event: KeyboardEvent) => {
            dst.next(event)
        }
        document.addEventListener("keydown", handler, { capture: true })
        document.addEventListener("keyup", handler, { capture: true })

        return () => {
            document.removeEventListener("keydown", handler, { capture: true })
            document.removeEventListener("keyup", handler, { capture: true })
        }
    }).pipe(share())

    readonly #activatedKs = this.#keyEvent.pipe(
        map(event => {
            const keystroke = eventToKeystroke(event)
            const id = keystrokeId(keystroke)
            return { event, keystrokes: this.#keystrokes[id] || [], keystroke }
        })
    )

    constructor() {
        this.#activatedKs.pipe(takeUntilDestroyed()).subscribe(({ event, keystrokes, keystroke }) => {
            for (const ks of keystrokes) {
                if (event.defaultPrevented) {
                    return
                }

                if (
                    ks.target === event.target ||
                    ks.target.contains(event.target as Node) ||
                    document.activeElement === ks.target ||
                    ks.target.contains(document.activeElement as Node)
                ) {
                    ks.subject.next({ original: event, keystroke })
                }
            }
        })
    }

    watch(target: ElementInput, keystroke: Keystroke): Observable<KeystrokeEvent> {
        const id = keystrokeId(keystroke)
        return new Observable((dst: Subscriber<KeystrokeEvent>) => {
            if (!this.#keystrokes[id]) {
                this.#keystrokes[id] = []
            }

            const subject = new Subject<KeystrokeEvent>()
            const entry: KeystrokeEntry = { target: coerceElement(target), keystroke, subject }
            const sub = subject.subscribe(dst)

            this.#keystrokes[id].push(entry)

            return () => {
                sub.unsubscribe()
                if (this.#keystrokes[id]) {
                    const index = this.#keystrokes[id].indexOf(entry)
                    if (index !== -1) {
                        this.#keystrokes[id].splice(index, 1)
                    }
                    if (this.#keystrokes[id].length === 0) {
                        delete this.#keystrokes[id]
                    }
                }
            }
        }).pipe(share())
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
