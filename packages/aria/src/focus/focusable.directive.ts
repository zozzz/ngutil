import { Directive, ElementRef, inject, NgZone } from "@angular/core"

import { map, Observable, shareReplay } from "rxjs"

import { Destructible, FastDOM } from "@ngutil/common"

import { type FocusableEvent, type FocusOrigin, FocusService } from "./focus.service"

// TODO: set [attr.focused]="[mouse | keyboard | program] [exact | child]"
@Directive()
export class Focusable extends Destructible {
    #service = inject(FocusService)
    #elRef = inject(ElementRef<Node>)
    #el = this.#elRef.nativeElement

    readonly events!: Observable<FocusableEvent>
    readonly origin!: Observable<FocusOrigin>
    readonly exact!: Observable<boolean>

    constructor(zone: NgZone) {
        super()

        zone.runOutsideAngular(() => {
            const events = this.#service.watch(this.#el)

            ;(this as { events: Observable<FocusableEvent> }).events = events.pipe(
                map(event => {
                    const self = this.#el
                    let exact: boolean | null = null
                    let focused: HTMLElement | null = event.element

                    while (focused) {
                        if (focused === self) {
                            if (exact === null) {
                                exact = true
                            }
                            break
                        } else {
                            const attr = focused.getAttribute("focused")
                            if (attr && attr.length > 0) {
                                exact = false
                                break
                            }

                            focused = focused.parentElement
                        }
                    }

                    return { origin: event.origin, exact, node: event.element } as FocusableEvent
                }),
                shareReplay(1)
            )
            ;(this as { origin: Observable<FocusOrigin> }).origin = this.events.pipe(
                map(event => event.origin),
                shareReplay(1)
            )
            ;(this as { exact: Observable<boolean> }).exact = this.events.pipe(
                map(event => event.exact),
                shareReplay(1)
            )

            this.d.sub(this.events).subscribe(event => {
                FastDOM.setAttributes(this.#el, {
                    focused: event.origin ? `${event.origin} ${event.exact ? "exact" : "child"}` : null
                })
            })
        })
    }
}
