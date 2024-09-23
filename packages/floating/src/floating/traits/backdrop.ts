import { AnimationBuilder } from "@angular/animations"

import { exhaustMap, Observable, Subject, Subscriber } from "rxjs"

import { animationObservable, CoverOptions } from "@ngutil/graphics"

import type { BackdropRef } from "../../layer/backdrop-ref"
import { type FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"
import { FadeAnimation } from "./animation"

interface CommonOptions {
    closeOnClick?: boolean
}

export type BackdropTraitOptions = CoverOptions & CommonOptions

export class BackdropState {
    onClick: Observable<void> = new Subject<void>()
}

export class BackdropTrait implements FloatingTrait<BackdropState> {
    readonly name = "backdrop"

    constructor(readonly options: BackdropTraitOptions) {}

    connect(floatingRef: FloatingRef<any>): Observable<BackdropState> {
        return new Observable((dest: Subscriber<BackdropState>) => {
            const animationBuilder = floatingRef.container.injector.get(AnimationBuilder)
            const options = { ...this.options }
            const state = new BackdropState()
            const backdrop = floatingRef.layerSvc.newBackdrop(floatingRef.container, options)

            if (options.closeOnClick) {
                dest.add(this.#installClickHandler(floatingRef, backdrop, state))
                dest.add(state.onClick.pipe(exhaustMap(() => floatingRef.close())).subscribe())
            }

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
            dest.next(state)
        })
    }

    #installClickHandler(floatingRef: FloatingRef<any>, backdrop: BackdropRef, state: BackdropState) {
        const handler = (event: MouseEvent) => {
            if (event.defaultPrevented) {
                return
            }

            if (event.target === backdrop.nativeElement || backdrop.nativeElement.contains(event.target as Node)) {
                ;(state.onClick as Subject<void>).next()
            }
        }

        document.addEventListener("click", handler)

        return () => {
            document.removeEventListener("click", handler)
        }
    }
}

export function backdrop(options: BackdropTraitOptions) {
    return new BackdropTrait(options)
}
