/* eslint-disable max-len */
import { applicationConfig, Meta, moduleMetadata, StoryObj } from "@storybook/angular"

import { JsonPipe } from "@angular/common"
import { Component, computed, ElementRef, inject, input, viewChild } from "@angular/core"
import { toSignal } from "@angular/core/rxjs-interop"
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms"
import { provideAnimations } from "@angular/platform-browser/animations"

import { filter, finalize, map, Observable, startWith, Subscriber, Subscription } from "rxjs"

import { Focusable, FocusState } from "@ngutil/aria"
import { Alignment, FloatingPosition, floatingPositionDirection } from "@ngutil/style"

import {
    backdrop,
    closeTrigger,
    fallAnimation,
    FloatingRef,
    FloatingService,
    focus,
    position,
    rippleRevealAnimation,
    slideAwayAnimation,
    slideNearAnimation,
    style
} from "./floating"
import { provideFloating } from "./index"
import { AlwaysOnTop } from "./layer"

@Component({
    selector: "floating-trigger",
    imports: [ReactiveFormsModule],
    hostDirectives: [Focusable],
    styles: [
        `
            :host {
                display: grid;
                justify-items: stretch;
                align-items: center;
                justify-content: center;
                align-content: center;
                gap: 12px;

                background: #f0f0f0;
                color: #333;
                font-family: sans-serif;
                font-size: 12px;
                cursor: pointer;
                padding: 6px 10px;
                border-radius: 3px;
            }

            .link {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                grid-template-rows: auto;
                justify-items: stretch;
                align-items: center;
                gap: 12px;
            }
        `
    ],
    template: `
        <div class="link" [formGroup]="anchorLinkGroup">
            <div>Anchor</div>
            <select formControlName="horizontal">
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
            </select>
            <select formControlName="vertical">
                <option value="top">Top</option>
                <option value="middle">Middle</option>
                <option value="bottom">Bottom</option>
            </select>
        </div>
        <div class="link" [formGroup]="contentLinkGroup">
            <div>Content</div>
            <select formControlName="horizontal">
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
            </select>
            <select formControlName="vertical">
                <option value="top">Top</option>
                <option value="middle">Middle</option>
                <option value="bottom">Bottom</option>
            </select>
        </div>
        <button (click)="open($event)">OPEN</button>
        <button #removeBtn (click)="doRemoveOpen($event)" style="z-index:121313432145435">REMOVE THIS</button>
    `
})
class FloatingTrigger {
    readonly floating = inject(FloatingService)
    readonly focus = inject(FocusState)
    readonly el = inject(ElementRef)

    readonly removeBtn = viewChild.required("removeBtn", { read: ElementRef })

    readonly anchorLinkGroup = new FormGroup({
        horizontal: new FormControl("left"),
        vertical: new FormControl("bottom")
    })

    readonly anchorLink = toSignal(
        this.anchorLinkGroup.valueChanges.pipe(
            startWith(null),
            map(() => this.anchorLinkGroup.value as Alignment),
            filter(value => value != null)
        )
    )

    readonly contentLinkGroup = new FormGroup({
        horizontal: new FormControl("left"),
        vertical: new FormControl("top")
    })

    readonly contentLink = toSignal(
        this.contentLinkGroup.valueChanges.pipe(
            startWith(null),
            map(() => this.contentLinkGroup.value as Alignment),
            filter(value => value != null)
        )
    )

    readonly alwaysOnTop = input(AlwaysOnTop.None)
    readonly backdrop = input<"crop" | "solid">("solid")

    open(event: MouseEvent) {
        let placementRect: Subscription | undefined = undefined
        let positionSub: Subscription | undefined = undefined
        this.#build(event)
            .show()
            .pipe(finalize(() => console.log("FINALIZE")))
            .subscribe(event => {
                console.log("EVENT", event.type)
                if (event.type === "init") {
                    placementRect?.unsubscribe()
                    positionSub?.unsubscribe()
                    placementRect = this.#rect(event.floatingRef).subscribe()
                    positionSub = event.floatingRef.watchTrait<FloatingPosition>("position").subscribe(position => {
                        // console.log(
                        //     "anchor", position.anchor.rect,
                        //     "placement.rect", position.placement.rect,
                        //     "area", position.placement.area)

                    })
                } else if (event.type === "disposing") {
                    placementRect?.unsubscribe()
                    positionSub?.unsubscribe()
                }
            })
    }

    #build(event: MouseEvent) {
        const factory = this.floating.from(FloatingPopover, { alwaysOnTop: this.alwaysOnTop() }).trait(
            position({
                anchor: { ref: this.el, link: this.anchorLink()!, margin: 0 },
                content: {
                    link: this.contentLink()!,
                    constraints: { minWidth: this.el, minHeight: 150, maxWidth: this.el }
                    // constraints: { minWidth: 50, minHeight: 1, maxWidth: this.el }
                    // constraints: { minWidth: 50, minHeight: 200, maxWidth: 50 }
                    // constraints: { minWidth: "link", minHeight: "link", maxWidth: "link", maxHeight: "link" }
                    // constraints: { minWidth: "viewport", maxWidth: "viewport" }
                },
                placement: { ref: "viewport", padding: 20 },
                horizontalAlt: "flip",
                verticalAlt: "flip"
            }),

            style({ borderRadius: "3px", border: "1px solid black" }),
            // fadeAnimation(),
            fallAnimation(),
            slideNearAnimation(),
            slideAwayAnimation(),
            rippleRevealAnimation({ origin: { x: event.clientX, y: event.clientY } }),
            focus({ connect: this.focus }),
            closeTrigger({ clickOutside: { allowedElements: [event.currentTarget as HTMLElement, this.removeBtn()] } })
        )

        if (0) {
        if (this.backdrop() === "crop") {
            factory.trait(
                backdrop({
                    type: "crop",
                    shape: { type: "rect", borderRadius: 3 },
                    expand: 10,
                    color: "rgba(0, 0, 0, .8)",
                    crop: event.target as HTMLElement,
                    disablePointerEvents: false,
                    style: { backdropFilter: "blur(10px)" }
                })
            )
        } else if (this.backdrop() === "solid") {
            factory.trait(backdrop({ type: "solid", color: "rgba(0, 0, 0, .5)" }))
        }
    }

        return factory
    }

    #rect(floatingRef: FloatingRef<any>) {
        return new Observable((dst: Subscriber<void>) => {
            const placementArea = document.createElement("div")
            placementArea.style.position = "absolute"
            placementArea.style.border = "1px solid red"
            placementArea.style.backgroundColor = "rgba(0, 0, 0, .6)"
            placementArea.style.fontSize = "10px"
            placementArea.style.fontFamily = "monospace"
            // div.style.zIndex = "22222222222"
            placementArea.style.color = "white"
            placementArea.style.pointerEvents = "none"
            placementArea.style.boxSizing = "border-box"
            document.body.appendChild(placementArea)

            const placementRect = document.createElement("div")
            placementRect.style.position = "absolute"
            placementRect.style.border = "1px solid blue"
            placementRect.style.backgroundColor = "rgba(0, 0, 255, .3)"
            placementRect.style.fontSize = "10px"
            placementRect.style.fontFamily = "monospace"
            placementRect.style.color = "white"
            placementRect.style.pointerEvents = "none"
            placementRect.style.boxSizing = "border-box"
            document.body.appendChild(placementRect)

            dst.add(
                floatingRef.watchTrait<FloatingPosition>("position").subscribe(pos => {
                    Object.assign(placementArea.style, {
                        width: `${pos.placement.area.width}px`,
                        height: `${pos.placement.area.height}px`,
                        top: `${pos.placement.area.y}px`,
                        left: `${pos.placement.area.x}px`
                    })

                    Object.assign(placementRect.style, {
                        width: `${pos.placement.rectWithPadding.width}px`,
                        height: `${pos.placement.rectWithPadding.height}px`,
                        top: `${pos.placement.rectWithPadding.y}px`,
                        left: `${pos.placement.rectWithPadding.x}px`
                    })

                    // div.innerHTML = JSON.stringify(pos.placement.area)
                })
            )

            dst.add(() => placementRect.parentElement?.removeChild(placementRect))
            dst.add(() => placementArea.parentElement?.removeChild(placementArea))
        })
    }

    doRemoveOpen(event: Event) {
        event.stopImmediatePropagation()
        event.preventDefault()
        this.el.nativeElement.parentElement.removeChild(this.el.nativeElement)
    }
}

@Component({
    selector: "floating-popover",
    imports: [JsonPipe],
    styles: [
        `
            :host {
                /* white-space: pre-wrap; */
                flex: 1 1 auto;
                font-size: 10px;
                background: #2e3440;
                color: #55bbad;
                font-family: monospace;
                padding: 8px;
                box-sizing: border-box;
            }
        `
    ],
    template: `{{ links() | json }}`
})
class FloatingPopover {
    readonly #ref = inject(FloatingRef)
    readonly position$ = this.#ref.watchTrait<FloatingPosition>("position")
    readonly position = toSignal(this.position$)
    readonly links = computed(() => {
        const pos = this.position()
        if (!pos) {
            return null
        }
        return {
            anchor: pos.anchor.link,
            content: pos.content.link
        }
    })
}

@Component({
    selector: "floatings",
    imports: [FloatingTrigger],
    styles: [
        `
            :host {
                width: 100vw;
                height: 100vh;
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                grid-template-rows: repeat(3, 1fr);
                gap: 16px;
            }
        `
    ],
    template: `
        <floating-trigger />
        <floating-trigger />
        <floating-trigger />
        <floating-trigger />
        <floating-trigger />
        <floating-trigger />
        <floating-trigger />
        <floating-trigger />
        <floating-trigger />
    `
})
class Floatings {}




@Component({
    selector: "floatings-scrolling",
    imports: [FloatingTrigger],
    styles: `
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
    `,
    template: `
        @for (item of rows; track item) {
            <div>{{item}}</div>
            @if (item % 20 === 0) {
                <floating-trigger />
            }
        }
    `
})
class FloatingsScrolling {
    readonly rows = Array(100).fill(0).map((v, i) => i)
}


@Component({
    selector: "floatings-fixed",
    imports: [FloatingTrigger, FloatingsScrolling],
    template: `
        @for (item of rows; track item) {
            <div>{{item}}</div>
        }

        <div style="position: fixed; top: 0; right: 0; bottom: 0; width: 400px; background: #ccc; overflow: auto;">
            <floatings-scrolling />
        </div>
    `
})
class FloatingsFixed {
    readonly rows = Array(100).fill(0).map((v, i) => i)
}

export default {
    title: "Floatings",
    component: Floatings,
    decorators: [
        applicationConfig({
            providers: [provideAnimations(), provideFloating()]
        }),
        moduleMetadata({ imports: [FloatingsScrolling, FloatingsFixed] })
    ],
    parameters: {
        layout: "fullscreen",
        controls: { include: [] }
    },

} as Meta

type Story = StoryObj<Floatings>

export const Simple: Story = {
    render: args => {
        return {
            props: {
                ...args
            },
            template: `<floatings></floatings>`
        }
    }
}

export const Fixed: Story = {
    render: args => {
        return {
            props: {
                ...args
            },
            template: `<floatings-fixed></floatings-fixed>`
        }
    }
}


export const Scrolling: Story = {
    render: args => {
        return {
            props: {
                ...args
            },
            template: `<floatings-scrolling></floatings-scrolling>`
        }
    }
}
