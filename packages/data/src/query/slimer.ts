import { Model } from "../model"
import { QueryProperty, QueryPropertySet } from "./query-property"

/**
 * @exmaple
 * ```ts
 * [
 *  "field_name",
 *  {"child_name": ["child_field_name"]},
 *  {"children": ["children_field_name", {"$type": Article, slimer: ["id", "title"]}]},
 *  {"$type": Employee, slimer: ["name"]}.
 *  {"$filter": Filter<T, F>}
 * ]
 * ```
 */
export type Slimer<T extends Model> = any
export type SlimerFn<T> = (item: T) => T

export function slimBy<T extends Model>(slimer: Slimer<T>): void {}

export function slimerNormalize<T extends Model>(slimer: Slimer<T>): void {}

function slimerCompile<T extends Model>(slimer: Slimer<T>): SlimerFn<T> {
    return item => item
}

export function slimerMerge<T extends Model>(...slimers: Slimer<T>): any {}

export class SlimerProperty<T extends Model> extends QueryProperty<Slimer<T>> {
    protected override merge(a?: any, b?: any) {
        return slimerMerge(a, b)
    }
}

export class SlimerPropertySet<T extends Model> extends QueryPropertySet<Slimer<T>> {
    protected override newProperty(): QueryProperty<any> {
        return new SlimerProperty(undefined)
    }

    protected override merge(...args: any[]) {
        return slimerMerge(...args)
    }
}
