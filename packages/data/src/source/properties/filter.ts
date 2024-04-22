import { Observable } from "rxjs"

import { DeepReadonly } from "@ngutil/common"

import { filterMerge } from "../../query"
import { mergedProperty, Property, PropertyCombined } from "./abstract"

export class FilterProperty<T> extends Property<T> {
    override update(other: T): void {
        this.set(filterMerge((this as { value: any }).value, other) as any, false)
    }
}

export class FilterCombined<T> extends PropertyCombined<T> {
    override normal = new FilterProperty<T>(undefined)
    override forced = new FilterProperty<T>(undefined)
    override merged$: Observable<DeepReadonly<T> | undefined> = mergedProperty(filterMerge, this.normal, this.forced)
}
