import { animate, AnimationEvent, state, style, transition, trigger } from "@angular/animations"
import { CommonModule } from "@angular/common"
import { Component, computed, contentChildren, effect, input, model, output } from "@angular/core"

import { clamp } from "lodash-es"

import { Duration, Ease } from "@ngutil/style"

import { SlideAnimationState, SlideDirective, SlideState } from "./slide.directive"

const absolute = { position: "absolute", top: "0px", left: "0px" }

const anim = `${Duration.Fast} ${Ease.Acceleration}`

@Component({
    selector: "nu-sliding",
    imports: [CommonModule],
    styles: `
        :host {
            display: grid;
            grid-template-columns: 1fr;
            grid-template-rows: 1fr;
            overflow: hidden;
            position: relative;

            .nu-slide {
                grid-column: 1;
                grid-row: 1;

                display: flex;
                flex-direction: column;
                align-items: stretch;
                position: relative;

                overflow: hidden;
            }
        }
    `,
    animations: [
        trigger("animate", [
            state(SlideAnimationState.FastOut, style({ display: "none", ...absolute, transform: "translateX(-100%)" })),
            state(SlideAnimationState.LeftOut, style({ display: "none", ...absolute, transform: "translateX(-100%)" })),
            state(SlideAnimationState.RightOut, style({ display: "none", ...absolute, transform: "translateX(100%)" })),
            state(SlideAnimationState.FastIn, style({ display: "", position: "relative", transform: "translateX(0)" })),
            state(SlideAnimationState.LeftIn, style({ display: "", position: "relative", transform: "translateX(0)" })),
            state(
                SlideAnimationState.RightIn,
                style({ display: "", position: "relative", transform: "translateX(0)" })
            ),
            transition(`* => ${SlideAnimationState.LeftOut}`, [
                style({ width: "*", ...absolute, transform: "translateX(0)" }),
                animate(anim, style({ transform: "translateX(-100%)" }))
            ]),
            transition(`* => ${SlideAnimationState.RightOut}`, [
                style({ width: "*", ...absolute, transform: "translateX(0)" }),
                animate(anim, style({ transform: "translateX(100%)" }))
            ]),
            transition(`* => ${SlideAnimationState.LeftIn}`, [
                style({ display: "", position: "relative", transform: "translateX(-100%)" }),
                animate(anim, style({ transform: "translateX(0)" }))
            ]),
            transition(`* => ${SlideAnimationState.RightIn}`, [
                style({ display: "", position: "relative", transform: "translateX(100%)" }),
                animate(anim, style({ transform: "translateX(0%)" }))
            ])
        ])
    ],
    template: `
        @if (items(); as _items) {
            @for (item of _items; track item; let index = $index) {
                @if (item.rendered()) {
                    <div
                        class="nu-slide"
                        [@animate]="item.animation()"
                        (@animate.start)="onAnimationEvent($event, item)"
                        (@animate.done)="onAnimationEvent($event, item)"
                    >
                        <ng-template [ngTemplateOutlet]="item.tpl" />
                    </div>
                }
            }
        }
    `
})
export class SlidingComponent {
    /**
     * List of items
     */
    readonly items = contentChildren(SlideDirective)

    /**
     * Lazily rendering items
     */
    readonly lazy = input(true)

    /**
     * Index of the preferred item
     */
    readonly preferred = model(0)

    /**
     * Index of the active item
     */
    readonly active = computed(() => {
        const items = this.items()
        if (items.length === 0) {
            return -1
        }
        const index = this.preferred()
        return clamp(index, 0, items.length - 1)
    })

    /**
     * Changes of the active item
     */
    readonly changes = output<SlidingComponent>()

    constructor() {
        effect(() => {
            const activeIndex = this.active()
            const items = this.items()
            const lazy = this.lazy()
            const preferred = this.preferred()
            const currentActiveIndex = items.findIndex(item => item.active())
            if (activeIndex === currentActiveIndex) {
                if (items[activeIndex]?.active()) {
                    return
                }
            }

            let activeItem: SlideDirective | undefined
            let inAnimation: SlideAnimationState | null = null

            for (let i = 0; i < items.length; i++) {
                const item = items[i]
                const isActive = i === activeIndex

                if (isActive) {
                    activeItem = item
                } else {
                    const currentlyActive = item.active()
                    item.active.set(false)

                    if (lazy === false && !item.rendered()) {
                        item.rendered.set(true)
                    }

                    if (item.animation() || item.rendered()) {
                        if (currentlyActive) {
                            if (activeIndex < currentActiveIndex) {
                                item.animation.set(SlideAnimationState.RightOut)
                                inAnimation = SlideAnimationState.LeftIn
                            } else {
                                item.animation.set(SlideAnimationState.LeftOut)
                                inAnimation = SlideAnimationState.RightIn
                            }
                        } else {
                            item.animation.set(SlideAnimationState.FastOut)
                        }
                    }
                }
            }

            if (activeItem) {
                if (inAnimation) {
                    activeItem.animation.set(inAnimation)
                } else if (items.length === 1) {
                    activeItem.animation.set(SlideAnimationState.FastIn)
                } else if (activeIndex < currentActiveIndex) {
                    activeItem.animation.set(SlideAnimationState.LeftIn)
                } else {
                    activeItem.animation.set(SlideAnimationState.RightIn)
                }
                activeItem.active.set(true)
                activeItem.rendered.set(true)
            }

            const preferredClamp = clamp(preferred, 0, items.length - 1)
            if (preferred !== preferredClamp) {
                this.preferred.set(preferredClamp)
            }

            this.changes.emit(this)
        })
    }

    onAnimationEvent(event: AnimationEvent, item: SlideDirective) {
        const isHiding = event.toState.endsWith("-out")
        const isBegin = event.phaseName === "start"
        if (isBegin) {
            item.state.emit(isHiding ? SlideState.Hiding : SlideState.Showing)
        } else {
            item.state.emit(isHiding ? SlideState.Hidden : SlideState.Shown)
        }
    }
}
