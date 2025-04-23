/* eslint-disable max-len */
import { Meta, moduleMetadata, StoryFn, StoryObj } from "@storybook/angular"

import { AsyncPipe } from "@angular/common"
import { Component, Directive, ElementRef, HostListener, inject, input } from "@angular/core"

import { ActivityService } from "../activity/activity.service"
import { FocusState } from "./focus-state.directive"
import { FocusOrigin, FocusService } from "./focus.service"
import { Focusable } from "./focusable.directive"

@Component({
    selector: "story-focusable",
    hostDirectives: [Focusable],
    styles: `
        :host {
            display: block;
            border: 1px solid red;
            padding: 4px;
            display: flex;
            flex-flow: column nowrap;
            align-items: stretch;
            min-width: 300px;
            box-sizing: border-box;
            margin: 16px;

            &:focus {
                outline: none;
            }

            pre {
                padding: 10px;
                cursor: pointer;
                margin: 0;
                user-select: none;

                &:hover {
                    background: rgba(200, 200, 200, 0.5);
                }
            }

            &[focus~="mouse"] > pre {
                background: red;
                color: #fff;
            }

            &[focus~="program"] > pre {
                background: green;
                color: #fff;
            }

            &[focus~="keyboard"] > pre {
                background: blue;
                color: #fff;
            }

            &[focus~="touch"] > pre {
                background: rgb(26, 90, 83);
                color: #fff;
            }

            &[focusWithin] > pre {
                opacity: 0.8;
            }
        }
    `,
    template: `
        <pre>origin = {{ focus.origin() }} - within: {{ focus.within() }}</pre>
        <div><ng-content /></div>
    `
})
class FocusableComponent {
    focus = inject(FocusState)
}

@Directive({
    selector: ".remove-me",
    hostDirectives: [Focusable]
})
class RemoveMe {
    readonly #el: ElementRef<HTMLElement> = inject(ElementRef)

    @HostListener("click")
    onClick() {
        this.#el.nativeElement.parentElement?.removeChild(this.#el.nativeElement)
    }
}

@Directive({
    selector: "[focusOrigin]"
})
class FocusOriginDirective {
    el = inject(ElementRef)
    focusSvc = inject(FocusService)
    focusOrigin = input.required<FocusOrigin>()

    @HostListener("click", ["$event"])
    onClick(event: Event) {
        event.preventDefault()
        event.stopImmediatePropagation()

        this.focusSvc.focus(this.el, this.focusOrigin())
    }
}

@Component({
    selector: "story-form-field",
    hostDirectives: [FocusState],
    styles: `
        :host {
            display: block;
            padding: 4px;
            margin: 4px;

            &[focus~="mouse"] {
                background: red;
                color: #fff;
            }

            &[focus~="program"] {
                background: green;
                color: #fff;
            }

            &[focus~="keyboard"] {
                background: blue;
                color: #fff;
            }

            &[focusWithin] {
                opacity: 0.8;
            }
        }
    `,
    template: ` <ng-content></ng-content> `
})
class FormField { }

@Component({
    selector: "story-activity",
    imports: [AsyncPipe],
    providers: [ActivityService],
    template: ` <div>IsInactive: {{ (isInactive$ | async) ? "true" : "false" }}</div> `
})
class ActivityComponent {
    readonly #activity = inject(ActivityService)
    readonly isInactive$ = this.#activity.watchInactvity(10000)
}

export default {
    title: "Focus / Focusable",
    component: FocusableComponent,
    decorators: [moduleMetadata({ imports: [FormField, ActivityComponent, RemoveMe, FocusOriginDirective] })]
    // parameters: {
    //     layout: "fullscreen",
    //     controls: { include: [] }
    // },
    // render: (args: FocusableComponent) => {
    //     const content = args.content
    //     delete args.content
    //     return {
    //         props: {
    //             ...args
    //         },
    //         template: `<nu-story-slot ${argsToTemplate(args)}>${content || ""}</nu-story-slot>`
    //     }
    // }
} as Meta<FocusableComponent>

type Story = StoryObj<FocusableComponent>

export const Basic: StoryFn<Story> = args => {
    const template = `
        <story-activity />
        <story-focusable></story-focusable>
        <story-focusable tabindex="42"></story-focusable>
        <story-focusable></story-focusable>
        <story-focusable>
            <story-focusable>
                <story-focusable><button class="remove-me">REMOVE</button></story-focusable>
                <story-focusable><button [attr.inert]="inert ? '' : null" (click)="inert=true">INERT</button></story-focusable>
                <story-focusable><button [attr.disabled]="disabled ? '' : null" (click)="disabled=true">DISABLED</button></story-focusable>
            </story-focusable>
            <story-focusable [focusOrigin]="'touch'">TOUCH FOCUS</story-focusable>
            <story-focusable></story-focusable>
        </story-focusable>
        <story-focusable>
            <story-form-field>
                <input type="text" />
            </story-form-field>
        </story-focusable>
    `

    return {
        props: args,
        template
    }
}

export const Group: StoryFn<Story> = args => {
    const template = `
        <story-focusable></story-focusable>
        <story-focusable tabindex="42"></story-focusable>
        <story-focusable></story-focusable>
        <story-focusable>
            <story-focusable>
                <story-focusable></story-focusable>
                <story-focusable></story-focusable>
                <story-focusable></story-focusable>
            </story-focusable>
            <story-focusable></story-focusable>
            <story-focusable></story-focusable>
        </story-focusable>
        <story-focusable>
            <story-form-field>
                <input type="text" />
            </story-form-field>
        </story-focusable>
    `

    return {
        props: args,
        template
    }
}
