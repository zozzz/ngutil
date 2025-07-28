import { AnimationBuilder } from "@angular/animations"

import { Observable, Subscriber } from "rxjs"

import { animationObservable, CoverOptions } from "@ngutil/graphics"

import { BackdropRef } from "../../layer"
import { type FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"
import { FadeAnimation } from "./animation"

interface CommonOptions {}

export type BackdropTraitOptions = CoverOptions & CommonOptions

// TODO: prevent scroll https://stackoverflow.com/questions/4770025/how-to-disable-scrolling-temporarily
export class BackdropTrait implements FloatingTrait<BackdropRef> {
    readonly name = "backdrop"

    constructor(readonly options: BackdropTraitOptions) {}

    connect(floatingRef: FloatingRef<any>): Observable<BackdropRef> {
        return new Observable((dest: Subscriber<BackdropRef>) => {
            const animationBuilder = floatingRef.container.injector.get(AnimationBuilder)
            const options = { ...this.options }
            const backdrop = floatingRef.layerSvc.newBackdrop(floatingRef.container, options)

            floatingRef.container.nativeElement.setAttribute("data-floating-has-backdrop", "true")
            backdrop.nativeElement.setAttribute("data-floating-backdrop", floatingRef.uid)

            backdrop.state.on("showing", () =>
                animationObservable({
                    builder: animationBuilder,
                    element: backdrop.nativeElement,
                    animation: FadeAnimation.show
                })
            )
            backdrop.state.on("disposing", () =>
                animationObservable({
                    builder: animationBuilder,
                    element: backdrop.nativeElement,
                    animation: FadeAnimation.hide
                })
            )

            backdrop.state.on("disposed", () => dest.complete())

            floatingRef.state.on("disposing", () => backdrop.dispose())

            dest.add(backdrop.show().subscribe())
            dest.next(backdrop)
        })
    }
}

export function backdrop(options: BackdropTraitOptions) {
    return new BackdropTrait(options)
}
