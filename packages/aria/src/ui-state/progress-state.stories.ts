/* eslint-disable max-len */
import { Meta, moduleMetadata, StoryObj } from "@storybook/angular"

import { AsyncPipe } from "@angular/common"
import { Component, inject } from "@angular/core"
import { takeUntilDestroyed } from "@angular/core/rxjs-interop"

import { sampleTime, shareReplay } from "rxjs"

import { ProgressState } from "./progress-state"

@Component({
    standalone: true,
    selector: "progress-test",
    imports: [AsyncPipe],
    providers: [ProgressState],
    styles: `
        :host {
            display: grid;
            grid-template-columns: max-content 1fr;
            grid-template-rows: auto;
            row-gap: 14px;
            column-gap: 14px;

            .progress {
                position: relative;
                background: #ccc;
                height: 30px;

                .indicator {
                    position: absolute;
                    top: 0;
                    left: 0;
                    bottom: 0;
                    background: #333;
                    display: grid;
                }
            }
        }
    `,
    template: `
        <div>parent:</div>
        <div class="progress"><div class="indicator" [style.width.%]="(self.percent$ | async) * 100"></div></div>

        <div>bar1:</div>
        <div class="progress"><div class="indicator" [style.width.%]="(bar1.percent$ | async) * 100"></div></div>

        <div>bar2:</div>
        <div class="progress"><div class="indicator" [style.width.%]="(b2percent | async) * 100"></div></div>
    `
})
class ProgressTest {
    readonly self = inject(ProgressState)
    readonly bar1 = new ProgressState()
    readonly bar2 = new ProgressState()

    readonly b2percent = this.bar2.percent$.pipe(sampleTime(200), shareReplay(1))

    constructor() {
        const bar1s1 = this.bar1.segment("s1", 1)
        const bar1s2 = this.bar1.segment("s2", 0.7)
        const bar2s1 = this.bar2.segment("s3")

        this.self.connect(this.bar1, "bar1").pipe(takeUntilDestroyed()).subscribe()
        this.self.connect(this.bar2, "bar2").pipe(takeUntilDestroyed()).subscribe()

        this.#infinite(percent => bar1s1.next({ type: "fix", percent }), 0.3)
        this.#infinite(percent => bar1s2.next({ type: "fix", percent }), 0.2)

        setInterval(() => {
            this.#infinite(percent => bar1s1.next({ type: "fix", percent }), 0.4)
        }, 3000)

        bar2s1.next({ type: "lax", predictedTime: 1000 })
        setInterval(() => {
            // bar2s1.next({ type: "lax", predictedTime: 500 })
            bar2s1.complete()
        }, 2000)
        // this.#infinite(percent => bar2s1.next({ type: "lax", predictedTime: 1000 }), 0.3)
    }

    #infinite(cb: (percent: number) => void, increment: number) {
        let percent = 0
        const emit = () => {
            cb(percent)
            if (percent < 1) {
                percent += increment
                setTimeout(emit, 1000 * increment)
            }
        }
        emit()
    }
}

export default {
    title: "UI State",
    component: ProgressTest,
    decorators: [moduleMetadata({ imports: [] })]
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
} as Meta<ProgressTest>

type Story = StoryObj<ProgressTest>

export const Progress: Story = {}
