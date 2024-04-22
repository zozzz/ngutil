import { Observable } from "rxjs"

import { DeepReadonly } from "@ngutil/common"

import { grouperMerge } from "../../query"
import { mergedProperty, Property, PropertyCombined } from "./abstract"

export class GrouperProperty<T> extends Property<T> {
    override update(other: T): void {
        this.set(grouperMerge((this as { value: any }).value, other) as any, false)
    }
}

export class GrouperCombined<T> extends PropertyCombined<T> {
    override normal = new GrouperProperty<T>(undefined)
    override forced = new GrouperProperty<T>(undefined)
    override merged$: Observable<DeepReadonly<T> | undefined> = mergedProperty(grouperMerge, this.normal, this.forced)
}
