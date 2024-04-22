import { Observable } from "rxjs"

import { DeepReadonly } from "@ngutil/common"

import { slimerMerge } from "../../query"
import { mergedProperty, Property, PropertyCombined } from "./abstract"

export class SlimerProperty<T> extends Property<T> {
    override update(other: T): void {
        this.set(slimerMerge((this as { value: any }).value, other) as any, false)
    }
}

export class SlimerCombined<T> extends PropertyCombined<T> {
    override normal = new SlimerProperty<T>(undefined)
    override forced = new SlimerProperty<T>(undefined)
    override merged$: Observable<DeepReadonly<T> | undefined> = mergedProperty(slimerMerge, this.normal, this.forced)
}
