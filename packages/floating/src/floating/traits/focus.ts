import { Observable } from "rxjs"

import { Focusable, FocusService, FocusState } from "@ngutil/aria"
import { ElementInput } from "@ngutil/common"

import { FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"

export interface FocusOptions {
    trap?: boolean
    connect?: Focusable | FocusState
    tabindex?: number
    focusOnClose?: ElementInput
}

export class FocusTrait implements FloatingTrait<unknown> {
    readonly name = "focus"

    constructor(readonly options: FocusOptions) {}

    connect(floatingRef: FloatingRef): Observable<unknown> {
        return new Observable(dest => {
            const originallyFocused = document.activeElement as HTMLElement
            const svc = floatingRef.container.injector.get(FocusService)

            if (this.options.connect) {
                const tabindex = this.options.tabindex == null ? 0 : this.options.tabindex
                floatingRef.container.nativeElement.setAttribute("tabindex", tabindex.toString())
                dest.add(this.options.connect.connect(floatingRef.container).subscribe())
            }

            if (this.options.trap) {
                dest.add(this.#trap(floatingRef, svc).subscribe())
            }

            floatingRef.state.on("disposing", () => {
                const active = document.activeElement
                const floating = floatingRef.container.nativeElement
                if (active === floating || floating.contains(active)) {
                    originallyFocused && document.contains(originallyFocused) && svc.focus(originallyFocused, "program")
                }
                dest.complete()
            })
            dest.next()
        })
    }

    #trap(floatingRef: FloatingRef, svc: FocusService) {
        return new Observable(() => {
            const trap = svc.focusTrap(floatingRef.container.nativeElement)

            floatingRef.state.on("shown", () => {
                trap.focusInitialElement()
            })

            return () => {
                trap.destroy()
            }
        })
    }
}

export function focus(options: FocusOptions) {
    return new FocusTrait(options)
}
