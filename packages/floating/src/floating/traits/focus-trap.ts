import { Observable } from "rxjs"

import { FocusService } from "@ngutil/aria"

import { FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"

export class FocusTrapTrait extends FloatingTrait<unknown> {
    override name = "focusTrap"
    override connect(floatingRef: FloatingRef): Observable<unknown> {
        return new Observable(() => {
            const svc = floatingRef.container.injector.get(FocusService)
            const trap = svc.focusTrap(floatingRef.container.nativeElement)
            const originallyFocused = document.activeElement as HTMLElement

            floatingRef.state.on("shown", () => {
                trap.focusInitialElement()
            })

            return () => {
                trap.destroy()
                originallyFocused && svc.focus(originallyFocused, "program")
            }
        })
    }
}

export function focusTrap() {
    return new FocusTrapTrait()
}
