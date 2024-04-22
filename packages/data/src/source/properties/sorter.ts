import { Observable } from "rxjs"

import { DeepReadonly } from "@ngutil/common"

import { sorterMerge } from "../../query"
import { mergedProperty, Property, PropertyCombined } from "./abstract"

export class SorterProperty<T> extends Property<T> {
    override update(other: T): void {
        this.set(sorterMerge((this as { value: any }).value, other as any) as any, false)
    }
}

export class SorterCombined<T> extends PropertyCombined<T> {
    override normal = new SorterProperty<T>(undefined)
    override forced = new SorterProperty<T>(undefined)
    override merged$: Observable<DeepReadonly<T> | undefined> = mergedProperty(sorterMerge, this.normal, this.forced)
}
