import { NgTemplateOutlet } from "@angular/common"
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    contentChild,
    linkedSignal,
    model,
    signal,
    untracked
} from "@angular/core"

import { InfiniteSlideDirective } from "./infinite-slide.directive"
import { SlideDirective, SlideState } from "./slide.directive"
import { SlidingComponent } from "./sliding.component"

export type InfiniteSlideContext<T> = { $implicit: T }

export interface InfiniteSlideData<T> {
    position: -1 | 0 | 1
    data: T
}

class Item<T> {
    readonly id: string
    readonly state = signal<SlideState>(SlideState.Pending)
    // readonly data: WritableSignal<T>

    constructor(public data: T) {
        this.id = `${++uid}`
        // this.data = signal<T>(data)
    }

    setState(state: SlideState): void {
        const current = untracked(this.state)
        if (current !== state) {
            this.state.set(state)
        }
    }
}

let uid = 0

/**
 * @example
 * ```html
 * <nu-infinite-sliding [data]="newSlide">
 *     <ng-template nuInfiniteSlide let-data>{{ data }}</ng-template>
 * </nu-infinite-sliding>
 * ```
 *
 * ```typescript
 * export class MyComponent {
 *      readonly newSlide = signal<SlideData<string>>({ position: 1, data: "Hello" })
 *
 *      addNewSlide() {
 *          this.newSlide.set({ position: 1, data: "World" })
 *      }
 * }
 * ```
 */
@Component({
    selector: "nu-infinite-sliding",
    exportAs: "nuInfiniteSliding",
    imports: [SlidingComponent, SlideDirective, NgTemplateOutlet],
    template: `
        <nu-sliding [lazy]="true" [preferred]="preferredIndex()">
            @for (item of items(); track item.id) {
                <ng-template nuSlide (state)="item.setState($event)">
                    <ng-template
                        [ngTemplateOutlet]="slide().tpl"
                        [ngTemplateOutletContext]="{ $implicit: item.data }"
                    />
                </ng-template>
            }
        </nu-sliding>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InfiniteSlidingComponent<T = any> {
    readonly slide = contentChild.required(InfiniteSlideDirective)

    readonly data = model<InfiniteSlideData<T>>()

    readonly #items = linkedSignal<InfiniteSlideData<T> | undefined, Array<Item<T>>>({
        source: this.data,
        computation: (data, prev) => insertData(prev?.value ?? [], data)
    })

    readonly items = computed(() => this.#items().filter(item => item.state() !== SlideState.Hidden))

    readonly preferredIndex = linkedSignal<number, number>({
        source: computed(() => this.items().findIndex(item => item.state() === SlideState.Pending)),
        computation: (index, prev) => (index > -1 ? index : prev?.value ?? 0)
    })

    push(data: T) {
        this.data.set({ position: 1, data })
    }

    unshift(data: T) {
        this.data.set({ position: -1, data })
    }

    update(data: T) {
        this.data.set({ position: 0, data })
    }
}

function insertData<T>(list: Array<Item<T>>, slideData: InfiniteSlideData<T> | undefined): Array<Item<T>> {
    if (slideData == null) {
        return list
    }

    const { position, data } = slideData
    if (position === 0) {
        const visible = list.find(item =>
            [SlideState.Pending, SlideState.Showing, SlideState.Shown].includes(item.state())
        )
        if (!visible) {
            return [...list, new Item(data)]
        } else {
            visible.data = data
            return list.slice(0)
        }
    } else if (position === -1) {
        return [new Item(data), ...list]
    } else {
        return [...list, new Item(data)]
    }
}
