import { TrackByFunction } from "@angular/core"

import { isEqual } from "es-toolkit"
import { Primitive } from "utility-types"

import { filterBy, pathGetterCompile } from "../query"

export type Model = { [key: string]: any }

export type ModelRef = { key?: Primitive | Array<Primitive>; index?: number }
export type ModelRefFilter<T> = (item: T, index: number) => boolean

export interface ModelMetaProps<T extends Model> {
    readonly keys: readonly string[]
    readonly trackBy?: TrackByFunction<T>
}

export type ModelMetaInput<T extends Model> = ModelMeta<T> | ModelMetaProps<T>

export type TrackedModel<T extends Model> = { index: number; model: T }

export class ModelMeta<T extends Model> implements ModelMetaProps<T> {
    static coerce<M extends Model>(value: ModelMetaInput<M>): ModelMeta<M> {
        if (value instanceof ModelMeta) {
            return value
        } else {
            return new ModelMeta(value)
        }
    }

    readonly keys: readonly string[]
    readonly trackBy: TrackByFunction<T>
    readonly #getKey?: (model: T) => string

    constructor(props: ModelMetaProps<T>) {
        this.keys = props.keys

        if (this.keys.length > 0) {
            const getters = this.keys.map(pathGetterCompile)
            if (props.trackBy == null) {
                this.trackBy = (index: number, item: T) => getters.map(p => p(item)).join("∀")
            } else {
                this.trackBy = props.trackBy
            }
            this.#getKey = (item: T) => getters.map(p => p(item)).join("∀")
        } else {
            if (props.trackBy == null) {
                throw new Error("Can't compile track by function without `keys` declaration")
            } else {
                this.trackBy = props.trackBy
            }
        }
    }

    isEqual(a: T, b: T): boolean {
        return isEqual(a, b)
    }

    isEqualByTrack(a: TrackedModel<T>, b: TrackedModel<T>): boolean {
        if (a == null || b == null) {
            return a == null && b == null
        }

        if (a.index == null || b.index == null) {
            return a.index == null && b.index == null
        }

        if (a.model == null || b.model == null) {
            return a.model == null && b.model == null
        }

        return this.trackBy(a.index, a.model) === this.trackBy(b.index, b.model)
    }

    isEqualByKey(a: T, b: T): boolean {
        if (this.#getKey != null) {
            if (a == null || b == null) {
                return a == null && b == null
            }
            return this.#getKey(a) === this.#getKey(b)
        }
        console.warn("Primary keys is not defined for", a, b)
        return false
    }

    normalizeRef(ref: ModelRef | ModelRefNorm): ModelRefNorm {
        if (ref instanceof ModelRefNorm) {
            return ref
        }

        if (ref.key != null && ref.index != null) {
            throw new Error("Only provide `pk` or `index` value not both")
        }

        if (ref.key != null) {
            const keyValue = (Array.isArray(ref.key) ? ref.key : [ref.key]) as readonly Primitive[]

            if (keyValue.length > 0) {
                if (this.keys.length === 0) {
                    throw new Error("Can't normalize ref without `keys`")
                }

                if (keyValue.length !== this.keys.length) {
                    throw new Error(`Wrong number of \`key\` values for this keys: [${this.keys.join(",")}]`)
                }
                return new ModelRefByKey(keyValue, this.keys)
            } else {
                console.warn("Empty key in ModelRef", ref)
            }
        }

        if (ref.index != null) {
            return new ModelRefByIndex(ref.index)
        }

        throw new Error("Missing `key` or `index` value")
    }
}

export abstract class ModelRefNorm {
    readonly key?: readonly Primitive[]
    readonly index?: number

    #filter?: ModelRefFilter<any>
    toFilter() {
        if (this.#filter == null) {
            return (this.#filter = this._asFilter())
        }
        return this.#filter
    }

    protected abstract _asFilter(): ModelRefFilter<any>
}

export class ModelRefByKey extends ModelRefNorm {
    override readonly key: readonly Primitive[]

    #keys: readonly string[]
    constructor(key: readonly Primitive[], keys: readonly string[]) {
        super()
        this.key = key
        this.#keys = keys
    }

    protected _asFilter(): ModelRefFilter<any> {
        const filter = {} as any
        for (let i = 0; i < this.#keys.length; i++) {
            filter[this.#keys[i]] = this.key[i]
        }
        return filterBy(filter)
    }
}

export class ModelRefByIndex extends ModelRefNorm {
    override readonly index: number

    constructor(index: number) {
        super()
        this.index = index
    }

    protected _asFilter(): ModelRefFilter<any> {
        return (item: any, index: number) => this.index === index
    }
}

export class UnknownMeta<T extends Model> extends ModelMeta<T> {
    constructor() {
        super({ keys: [], trackBy: (index: number) => index })
    }
}
