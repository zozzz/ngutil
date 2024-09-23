import { animate, AnimationBuilder, AnimationMetadata, AnimationOptions, style } from "@angular/animations"

import { map, Observable, Subscriber, switchMap, take, tap, timer } from "rxjs"

import { animationObservable } from "@ngutil/graphics"
import { alignmentToTransformOrigin, Duration, Ease } from "@ngutil/style"

import { FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"
import { FloatingPosition } from "./position"

export type AnimationSet = { show: AnimationMetadata[]; hide: AnimationMetadata[] }

// https://tympanus.net/Development/ModalWindowEffects/

const timing = `${Duration.FastMs}ms ${Ease.Deceleration}`

export class AnimationTrait implements FloatingTrait<unknown> {
    readonly name = "animation"

    constructor(
        readonly animation: AnimationSet,
        readonly options?: AnimationOptions
    ) {}

    connect(floatingRef: FloatingRef): Observable<unknown> {
        return new Observable((dst: Subscriber<unknown>) => {
            const builder = floatingRef.container.injector.get(AnimationBuilder)
            const element = floatingRef.container.nativeElement
            const options = this.options || {}

            floatingRef.state.on("showing", () =>
                animationParams(floatingRef, 0, options.params).pipe(
                    switchMap(params =>
                        animationObservable({
                            builder,
                            element,
                            animation: this.animation.show,
                            options: { ...options, params }
                        })
                    )
                )
            )
            floatingRef.state.on("disposing", () =>
                animationParams(floatingRef, 0, options.params).pipe(
                    switchMap(params =>
                        animationObservable({
                            builder,
                            element,
                            animation: this.animation.hide,
                            options: { ...options, params }
                        })
                    ),
                    tap(() => (element.style.display = "none"))
                )
            )
            floatingRef.state.on("disposing", () => dst.complete())
            dst.next()
        })
    }
}

function animationParams(
    floatingRef: FloatingRef,
    delay: number,
    overrides: AnimationOptions["params"]
): Observable<AnimationOptions["params"]> {
    const src =
        delay > 0
            ? timer(delay).pipe(switchMap(() => floatingRef.watchTrait<FloatingPosition>("position")))
            : floatingRef.watchTrait<FloatingPosition>("position")

    return src.pipe(
        take(1),
        map(position => {
            const origin = position.computed ? alignmentToTransformOrigin(position.computed!.content.align) : "center"
            return {
                origin,
                ...overrides
            }
        })
    )
}

export const FallAnimation: AnimationSet = {
    show: [
        style({
            transform: "scale(1.5)",
            visibility: "visible",
            opacity: "0"
        }),
        animate(
            timing,
            style({
                transform: "scale(1)",
                opacity: "1"
            })
        )
    ],
    hide: [
        animate(
            timing,
            style({
                transform: "scale(1.5)",
                visibility: "visible",
                opacity: "0"
            })
        )
    ]
}

export function fallAnimation(options?: AnimationOptions) {
    return new AnimationTrait(FallAnimation, options)
}

export const FadeAnimation: AnimationSet = {
    show: [style({ opacity: 0 }), animate(timing, style({ opacity: 1 }))],
    hide: [animate(timing, style({ opacity: 0 }))]
}

export function fadeAnimation(options?: AnimationOptions) {
    return new AnimationTrait(FadeAnimation, options)
}

export const DropAnimation: AnimationSet = {
    show: [
        style({
            transform: "translate({{ translateX }}, {{ translateY }})",
            opacity: "0",
            transformOrigin: "{{ origin }}",
            visibility: "visible"
        }),
        animate(
            timing,
            style({
                opacity: "1",
                transform: "scale(1, 1) translate(0px, 0px)"
            })
        )
    ],
    hide: [
        animate(
            timing,
            style({ opacity: 0, transform: "translate(calc({{ translateX }} * -1), calc({{ translateY }} * -1))" })
        )
    ]
}

export function dropAnimation(options?: AnimationOptions) {
    if (!options) {
        options = {}
    }

    if (!options.params) {
        options.params = {}
    } else {
        options.params = { ...options.params }
    }

    options.params["translateX"] = "0px"
    options.params["translateY"] = "-40px"

    return new AnimationTrait(DropAnimation, options)
}
