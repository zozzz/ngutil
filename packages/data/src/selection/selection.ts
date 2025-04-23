import { Directive } from "@angular/core"

import { FocusOrigin } from "@ngutil/aria"

import { Model } from "../model"

export interface Selection<T extends Model> {
    item: T
    origin: FocusOrigin
    focused: FocusOrigin
}

@Directive()
export abstract class SelectionModel<T extends Model> {}

@Directive({
    selector: "[nuSelction='single']",
    standalone: false
})
export class SingleSelection<T extends Model> extends SelectionModel<T> {}

@Directive({
    selector: "[nuSelction='multi']",
    standalone: false
})
export class MultiSelection<T extends Model> extends SelectionModel<T> {}

@Directive({
    selector: "[nuSelction]:not([nuSelction='single']):not([nuSelction='multi'])",
    standalone: false
})
export class SelectionProxy {}
