import { Observable, of } from "rxjs"

import { Primitive } from "utility-types"

import { FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"

export type Attributes = { [key: string]: Primitive } | { dataset: { [key: string]: Primitive } }

export class AttributeTrait extends FloatingTrait<Attributes> {
    override name = "attribute"

    constructor(readonly attrs: Attributes) {
        super()
    }

    override connect(floatingRef: FloatingRef): Observable<Attributes> {
        const el = floatingRef.container.nativeElement

        for (const [k, v] of Object.entries(this.attrs)) {
            if (k === "dataset") {
                v && Object.assign(el.dataset, v)
            } else if (v == null) {
                el.removeAttribute(k)
            } else {
                el.setAttribute(k, v.toString())
            }
        }

        return of(this.attrs)
    }
}

export function attribute(attrs: Attributes) {
    return new AttributeTrait(attrs)
}
