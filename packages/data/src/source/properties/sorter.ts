import { Observable, map } from "rxjs"

import { DeepReadonly } from "@ngutil/common"

import { sorterMerge, SortDirection, sorterFind } from "../../query"
import { mergedProperty, Property, PropertyCombined } from "./abstract"
import { Model } from "../../model"

export class SorterProperty<T> extends Property<T> {
    override update(other: T): void {
        this.set(sorterMerge((this as { value: any }).value, other as any) as any, false)
    }
}


type OfTypes<T extends Model> = ReturnType<typeof sorterFind<T>>

export class SorterCombined<T extends Model> extends PropertyCombined<T> {
    override normal = new SorterProperty<T>(undefined)
    override forced = new SorterProperty<T>(undefined)
    // TODO: normalized sorter
    override merged$: Observable<DeepReadonly<T> | undefined> = mergedProperty(sorterMerge, this.normal, this.forced)

    of(name: string): Observable<OfTypes<T>> {
        return this.merged$.pipe(
            map((sorters: any) => sorterFind(sorters, name))
        )
    }

    directionOf(name: string) {
        return this.of(name).pipe(map(value => {
            if (value == null) {
                return undefined
            } else if (typeof value === "string") {
                return value
            } else {
                return value.dir
            }
        }))
    }

    isSet(name: string): Observable<boolean> {
        return this.directionOf(name).pipe(map(v => v != null))
    }

    isAsc(name: string): Observable<boolean> {
        return this.directionOf(name).pipe(map(v => v === SortDirection.Asc))
    }

    isDesc(name: string): Observable<boolean> {
        return this.directionOf(name).pipe(map(v => v === SortDirection.Desc))
    }
}
