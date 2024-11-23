/* eslint-disable max-len */
import { applicationConfig, Meta, moduleMetadata, StoryObj } from "@storybook/angular"

import { JsonPipe } from "@angular/common"
import { Component, computed, ElementRef, inject, input } from "@angular/core"
import { toSignal } from "@angular/core/rxjs-interop"
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms"
import { provideAnimations } from "@angular/platform-browser/animations"

import { filter, map, Observable, startWith, Subscriber, Subscription } from "rxjs"

import { Focusable, FocusState } from "@ngutil/aria"
import { Alignment, FloatingPosition } from "@ngutil/style"

import { backdrop, closeTrigger, dropAnimation, FloatingRef, FloatingService, focus, position, style } from "./floating"
import { provideFloating } from "./index"
import { AlwaysOnTop } from "./layer"

@Component({
    selector: "floating-trigger",
    standalone: true,
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
    `
})
class FloatingTrigger {
    readonly floating = inject(FloatingService)
    readonly focus = inject(FocusState)
    readonly el = inject(ElementRef)

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

    open(event: Event) {
        let placementRect: Subscription | undefined = undefined
        let positionSub: Subscription | undefined = undefined
        this.#build(event).subscribe(event => {
            if (event.type === "init") {
                placementRect?.unsubscribe()
                positionSub?.unsubscribe()
                placementRect = this.#rect(event.floatingRef).subscribe()
                positionSub = event.floatingRef.watchTrait<FloatingPosition>("position").subscribe(position => {
                    console.log(position)
                })
            } else if (event.type === "disposing") {
                placementRect?.unsubscribe()
                positionSub?.unsubscribe()
            }
        })
    }

    #build(event: Event) {
        const factory = this.floating.from(FloatingPopover, { alwaysOnTop: this.alwaysOnTop() }).trait(
            position({
                anchor: { ref: this.el, link: this.anchorLink()!, margin: 0 },
                content: {
                    link: this.contentLink()!,
                    constraints: { minWidth: this.el, minHeight: 150, maxWidth: this.el }
                },
                placement: { ref: "viewport", padding: 20 },
                horizontalAlt: "flip",
                verticalAlt: "flip"
            }),

            style({ borderRadius: "3px", border: "1px solid black" }),
            // fadeAnimation(),
            dropAnimation(),
            focus({ connect: this.focus }),
            closeTrigger()
        )

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

        return factory
    }

    #rect(floatingRef: FloatingRef<any>) {
        return new Observable((dst: Subscriber<void>) => {
            const div = document.createElement("div")
            div.style.position = "absolute"
            div.style.border = "1px solid red"
            div.style.backgroundColor = "rgba(0, 0, 0, .6)"
            div.style.fontSize = "10px"
            div.style.fontFamily = "monospace"
            // div.style.zIndex = "22222222222"
            div.style.color = "white"
            div.style.pointerEvents = "none"
            div.style.boxSizing = "border-box"
            document.body.appendChild(div)

            dst.add(
                floatingRef.watchTrait<FloatingPosition>("position").subscribe(pos => {
                    div.style.width = `${pos.placement.area.width}px`
                    div.style.height = `${pos.placement.area.height}px`
                    div.style.top = `${pos.placement.area.y}px`
                    div.style.left = `${pos.placement.area.x}px`
                    // div.innerHTML = JSON.stringify(pos.placement.area)
                })
            )

            dst.add(() => div.parentElement?.removeChild(div))
        })
    }
}

@Component({
    selector: "floating-popover",
    standalone: true,
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
    standalone: true,
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

export default {
    title: "Floatings",
    component: Floatings,
    decorators: [
        applicationConfig({
            providers: [provideAnimations(), provideFloating()]
        }),
        moduleMetadata({ imports: [] })
    ],
    parameters: {
        layout: "fullscreen",
        controls: { include: [] }
    },
    render: args => {
        return {
            props: {
                ...args
            },
            template: `<floatings></floatings>`
        }
    }
} as Meta

type Story = StoryObj<Floatings>

export const Simple: Story = {}
