import { Observable, of } from "rxjs"

import { FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"

export class StyleTrait implements FloatingTrait<Partial<CSSStyleDeclaration>> {
    readonly name = "style"

    constructor(readonly styles: Partial<CSSStyleDeclaration>) {}

    connect(floatingRef: FloatingRef): Observable<Partial<CSSStyleDeclaration>> {
        Object.assign(floatingRef.container.nativeElement.style, this.styles)
        return of(this.styles)
    }
}

export function style(styles: Partial<CSSStyleDeclaration>) {
    return new StyleTrait(styles)
}
