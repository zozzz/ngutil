import { exhaustMap, Observable } from "rxjs"

import { KeystrokeService } from "@ngutil/aria"

import { FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"

export class KeystrokeTrait implements FloatingTrait<unknown> {
    name = "keystroke"

    connect(floatingRef: FloatingRef): Observable<unknown> {
        const ks = floatingRef.container.injector.get(KeystrokeService)
        return ks
            .watch(floatingRef.container.nativeElement, { key: "Escape", state: "up" })
            .pipe(exhaustMap(() => floatingRef.close()))
    }
}

export function keystroke() {
    return new KeystrokeTrait()
}
