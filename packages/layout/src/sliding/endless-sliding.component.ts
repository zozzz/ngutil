import { NgTemplateOutlet } from "@angular/common"
import { ChangeDetectionStrategy, Component, contentChild, signal, Signal, TemplateRef } from "@angular/core"

import { SlidingItemDirective } from "./sliding-item.directive"
import { SlidingComponent } from "./sliding.component"

export type EndlessSlidingContext<T> = { $implicit: T }

interface Item<T> {
    readonly id: string
    readonly data: T
}

let uid = 0

@Component({
    selector: "nu-endless-sliding",
    exportAs: "nuEndlessSliding",
    imports: [SlidingComponent, SlidingItemDirective, NgTemplateOutlet],
    template: `
        <nu-sliding (changes)="onSlidingChange($event)" [lazy]="true">
            @for (item of items(); track item.id) {
                <ng-template nuSlidingItem>
                    <ng-template
                        [ngTemplateOutlet]="itemTemplate"
                        [ngTemplateOutletContext]="{ $implicit: item.data }"
                    />
                </ng-template>
            }
        </nu-sliding>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EndlessSlidingComponent<T = any> {
    readonly itemTemplate: Signal<TemplateRef<EndlessSlidingContext<T>>> = contentChild.required("item", {
        read: TemplateRef
    })

    readonly items = signal<Array<Item<T>>>([])

    push(data: T) {
        this.items.update(items => [...items, { data, id: `${++uid}` }])
    }
    unshift(data: T) {
        this.items.update(items => [{ data, id: `${++uid}` }, ...items])
    }

    onSlidingChange(cmp: SlidingComponent) { }
}
