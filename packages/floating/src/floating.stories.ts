/* eslint-disable max-len */
import { applicationConfig, Meta, moduleMetadata, StoryObj } from "@storybook/angular"

import { Component, DestroyRef, effect, ElementRef, HostListener, inject, input, viewChild } from "@angular/core"
import { provideAnimations } from "@angular/platform-browser/animations"

import { Focusable, FocusState, KeystrokeService } from "@ngutil/aria"

import {
    backdrop,
    closeTrigger,
    dropAnimation,
    FloatingRef,
    FloatingService,
    focus,
    minWidth,
    modal,
    position,
    style
} from "./floating"
import { provideFloating } from "./index"
import { AlwaysOnTop } from "./layer"

@Component({
    selector: ".drop-down-trigger",
    standalone: true,
    hostDirectives: [Focusable],
    template: `
        <ng-content />
        <!-- &nbsp;( origin: {{ focus.origin() }} with: {{ focus.within() }} ) -->
    `
})
class DropDownTrigger {
    readonly floating = inject(FloatingService)
    readonly focus = inject(FocusState)
    readonly el = inject(ElementRef)

    readonly alwaysOnTop = input(AlwaysOnTop.None)
    readonly backdrop = input(true)

    constructor() {
        // this.focus.event$.pipe(takeUntilDestroyed()).subscribe(console.log)
    }

    @HostListener("click", ["$event"])
    onClick(event: MouseEvent) {
        const factory = this.floating.from(FloatingCmp, { alwaysOnTop: this.alwaysOnTop() }).trait(
            position({
                anchor: { ref: this.el, align: "bottom left" },
                content: { align: "top left", margin: 20 }
            }),

            // minWidth(3243524),
            // maxWidth(this.el),
            minWidth(this.el),
            style({ borderRadius: "3px", border: "1px solid black" }),
            // fadeAnimation(),
            dropAnimation(),
            focus({ connect: this.focus }),

            closeTrigger()
        )

        if (this.backdrop()) {
            factory.trait(
                // backdrop({ type: "solid", color: "rgba(0, 0, 0, .5)" }),
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
        }

        factory.subscribe(event => {
            if (event.type === "disposing") {
                this.el.nativeElement.focus()
            }
            // console.log(event)
        })
    }
}

@Component({
    selector: "floating-cmp",
    standalone: true,
    imports: [DropDownTrigger],
    styles: [
        `
            :host {
                display: block;
                width: 300px;
                padding: 16px;
                background-color: red;
                color: white;
            }
        `
    ],
    template: `
        <div>I'am Floating! yeah :)</div>
        <br />
        <button #close (click)="doClose()">close</button>
        <button (click)="newModal()">new modal</button>
        <button (click)="setResult()">set result</button>
        <button class="drop-down-trigger" [alwaysOnTop]="${AlwaysOnTop.Modal}">drop down</button>
        <button class="drop-down-trigger" [backdrop]="false">drop down without back</button>
        <button class="drop-down-trigger" [alwaysOnTop]="${AlwaysOnTop.UAC}">uac</button>
    `
})
class FloatingCmp {
    readonly floatingRef = inject(FloatingRef)
    readonly #floating = inject(FloatingService)
    readonly #ks = inject(KeystrokeService)
    readonly #destryRef = inject(DestroyRef)
    readonly closeEl = viewChild("close", { read: ElementRef })

    constructor() {
        effect(() => {
            const closeEl = this.closeEl()
            if (closeEl) {
                this.#ks.watch(closeEl, { key: "n", state: "up" }).subscribe(event => {
                    console.log(event)
                })
            }
        })
    }

    doClose() {
        this.floatingRef.close(true).subscribe()
    }

    newModal() {
        this.#floating.from(FloatingCmp, {}).trait(modal()).subscribe()
    }

    setResult() {
        this.floatingRef.setResult("RESULT FROM POPUP")
    }
}

@Component({
    standalone: true,
    selector: "floatings",
    imports: [FloatingCmp, DropDownTrigger],
    styles: [
        `
            :host {
                width: 100vw;
                height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 16px;
            }
        `
    ],
    template: `
        <button (click)="showDialog()">dialog</button>
        <button (click)="showModal()">modal</button>
        <button class="drop-down-trigger" style="width: 300px;">drop down</button>
    `
})
class Floatings {
    readonly #floating = inject(FloatingService)

    showDialog() {
        this.#floating
            .from(FloatingCmp, {})
            .position({})
            .trait(
                backdrop({
                    type: "solid",
                    color: "rgba(0, 0, 0, .5)",
                    style: { backdropFilter: "blur(10px)" }
                }),
                focus({ trap: true })
            )
            .subscribe()
    }

    showModal() {
        this.#floating
            .from(FloatingCmp, {})
            .trait(modal(), style({ borderRadius: "3px" }), closeTrigger())
            .subscribe(event => {
                console.log(event)
            })
    }

    dropDown() {}
}

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
