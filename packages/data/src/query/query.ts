import { type DeepReadonly } from "@ngutil/common"

import { type Model } from "../model"
import { type Filter } from "./filter"
import { type Grouper } from "./grouper"
import { type Slice } from "./slice"
import { type Slimer } from "./slimer"
import { type Sorter } from "./sorter"

export interface Query<T extends Model> {
    filter?: DeepReadonly<Filter<T>>
    sorter?: DeepReadonly<Sorter<T>>
    slimer?: DeepReadonly<Slimer<T>>
    grouper?: DeepReadonly<Grouper<T>>
    slice?: DeepReadonly<Slice>
}

export interface QueryResult<T extends Model> {
    items: readonly T[]
    total?: number
    groups?: any[]
}
