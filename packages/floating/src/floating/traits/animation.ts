import { animate, AnimationBuilder, AnimationMetadata, style } from "@angular/animations"

import { map, Observable, of, Subscriber, switchMap, take, tap } from "rxjs"

import { animationObservable, maxPossibleRadius } from "@ngutil/graphics"
import {
    Duration,
    Ease,
    FloatingPosition,
    FloatingPositionDirection,
    Position,
    rectContainsPoint,
    rectOrigin
} from "@ngutil/style"

import { FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"

export type AnimationSet = { show: AnimationMetadata[]; hide: AnimationMetadata[] }

// https://tympanus.net/Development/ModalWindowEffects/

const timing = `${Duration.FastMs}ms ${Ease.Deceleration}`

export type AnimationTraitParams = (position: FloatingPosition) => object

export class AnimationTrait implements FloatingTrait<void> {
    readonly name = "animation"

    constructor(
        readonly animation: AnimationSet,
        readonly params?: AnimationTraitParams
    ) {}

    connect(floatingRef: FloatingRef): Observable<void> {
        return new Observable((dst: Subscriber<void>) => {
            const builder = floatingRef.container.injector.get(AnimationBuilder)
            const element = floatingRef.container.nativeElement

            floatingRef.state.on("showing", () =>
                animationParams(floatingRef, this.params).pipe(
                    switchMap(params =>
                        animationObservable({
                            builder,
                            element,
                            animation: this.animation.show,
                            options: { params }
                        })
                    )
                )
            )
            floatingRef.state.on("disposing", () =>
                animationParams(floatingRef, this.params).pipe(
                    switchMap(params =>
                        animationObservable({
                            builder,
                            element,
                            animation: this.animation.hide,
                            options: { params }
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

function animationParams(floatingRef: FloatingRef, params?: AnimationTraitParams): Observable<object> {
    if (params == null) {
        return of({})
    }

    return floatingRef.watchTrait<FloatingPosition>("position").pipe(take(1), map(params))
}

export const FallAnimation: AnimationSet = {
    show: [
        style({
            transform: "scale({{ scale }})",
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
                transform: "scale({{ scale }})",
                visibility: "visible",
                opacity: "0"
            })
        )
    ]
}

export function fallAnimation(scale: number = 1.5) {
    return new AnimationTrait(FallAnimation, () => {
        return { scale }
    })
}

export const FadeAnimation: AnimationSet = {
    show: [style({ opacity: 0 }), animate(timing, style({ opacity: 1 }))],
    hide: [animate(timing, style({ opacity: 0 }))]
}

export function fadeAnimation() {
    return new AnimationTrait(FadeAnimation)
}

const SlideAnimation: AnimationSet = {
    show: [
        style({
            transform: "translate({{ tx }}, {{ ty }})",
            opacity: "0",
            // transformOrigin: "{{ origin }}",
            visibility: "visible"
        }),
        animate(
            timing,
            style({
                opacity: "1",
                transform: "translate(0px, 0px)"
            })
        )
    ],
    hide: [animate(timing, style({ opacity: 0, transform: "translate(calc({{ tx }} * -1), calc({{ ty }} * -1))" }))]
}

const SlideAnimationParams: { [K in FloatingPositionDirection]: { tx: number; ty: number } } = {
    center: { tx: 0, ty: 0 },
    up: { tx: 0, ty: 1 },
    down: { tx: 0, ty: -1 },
    left: { tx: 1, ty: 0 },
    right: { tx: -1, ty: 0 }
}

function slideAnimation(size: number) {
    return new AnimationTrait(SlideAnimation, position => {
        const { tx, ty } = SlideAnimationParams[position.direction]
        return { tx: `${tx * size}px`, ty: `${ty * size}px` }
    })
}

export function slideNearAnimation(size: number = 40) {
    return slideAnimation(size * -1)
}

export function slideAwayAnimation(size: number = 40) {
    return slideAnimation(size)
}

const RippleRevealAnimation: AnimationSet = {
    show: [
        style({ clipPath: "circle({{ radiusStart }} at {{ origin }})" }),
        animate(`{{ duration }}ms ${Ease.Acceleration}`, style({ clipPath: "circle({{ radiusEnd }} at {{ origin }})" }))
    ],
    hide: [animate(timing, style({ opacity: 0 }))]
}

type RippleRevealAnimationOptions = {
    origin: Position
    initialRadius?: number
    duration?: number
}

export function rippleRevealAnimation(options: RippleRevealAnimationOptions) {
    const { origin, initialRadius = 0, duration = Duration.SlowMs } = options
    return new AnimationTrait(RippleRevealAnimation, position => {
        const animOrigin = rectContainsPoint(position.content.rect, origin)
            ? origin
            : rectOrigin(position.content.rect, "center middle")
        const { x, y, width, height } = position.content.rect
        const radius = maxPossibleRadius(animOrigin.x, animOrigin.y, width, height)
        return {
            radiusStart: `${initialRadius}px`,
            radiusEnd: `${radius}px`,
            origin: `${animOrigin.x - x}px ${animOrigin.y - y}px`,
            duration: duration
        }
    })
}
