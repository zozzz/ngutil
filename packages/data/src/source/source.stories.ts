/* eslint-disable max-len */
import { Meta, moduleMetadata, StoryObj } from "@storybook/angular"

import { AsyncPipe } from "@angular/common"
import { Component, inject } from "@angular/core"

import { map, switchMap, take } from "rxjs"

import { ArrayProvider } from "../provider"
import { DataSourceProxy } from "./proxy.directive"

function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
}

const ITEMS = new ArrayProvider(
    { keys: ["id"] },
    shuffleArray(
        Array.from({ length: 100 }, (_, i) => {
            return { id: i + 1, name: `Item ${i + 1}` }
        })
    )
)

@Component({
    standalone: true,
    selector: "basic-table",
    imports: [AsyncPipe],
    template: `
        <table>
            <thead>
                <tr>
                    @if (source.query$ | async; as query) {
                        @for (head of header; track head.field) {
                            <td style="width:150px" (click)="sortBy(head.field)">
                                {{ head.title }}
                                @if (query.sorter.of(head.field) | async; as entry) {
                                    @if (entry.isAsc === true) {
                                        ▲
                                    } @else {
                                        ▼
                                    }
                                }
                            </td>
                        }
                    }
                </tr>
            </thead>
            <tbody>
                @if (source.items$ | async; as items) {
                    @for (item of items; track $index) {
                        <tr>
                            <td>{{ item.id }}</td>
                            <td>{{ item.name }}</td>
                        </tr>
                    }
                }
            </tbody>
        </table>
    `
})
class BasicTable {
    readonly source = inject(DataSourceProxy)

    readonly header = [
        { field: "id", title: "ID" },
        { field: "name", title: "Name" }
    ]

    // constructor() {
    //     this.source.query$.subscribe(q => console.log(q))
    // }

    sortBy(field: string) {
        // TODO: Plans
        // this.source.sorter.directionOf().pipe(
        //     take(1),
        //     map(dir => {
        //     })
        // ).subscribe(nextDir => {
        //     this.source.sorter.set(nextDir)
        // })
        // this.source.sorter.mutate((value) => { })
        this.source.query$
            .pipe(
                map(query => query.sorter),
                switchMap(sorter =>
                    sorter.of(field).pipe(
                        map(entry => {
                            return { entry, sorter }
                        })
                    )
                ),
                take(1),
                map(({ entry, sorter }) => {
                    if (entry == null) {
                        sorter.normal.update([{ [field]: "asc" }])
                        return "asc"
                    } else if (entry.isAsc === true) {
                        sorter.normal.update([{ [field]: "desc" }])
                        return "desc"
                    } else {
                        sorter.normal.update([{ [field]: undefined }])
                    }
                    return undefined
                })
            )
            .subscribe()
    }
}

@Component({
    standalone: true,
    selector: "items-table",
    imports: [DataSourceProxy, BasicTable],
    template: `<basic-table [nuDataSource]="source" />`
})
class ItemsTable {
    readonly source = ITEMS.toDataSource().all()
}

export default {
    title: "Table",
    component: ItemsTable,
    decorators: [moduleMetadata({ imports: [ItemsTable] })],
    parameters: {
        layout: "fullscreen",
        controls: { include: [] }
    },
    render: args => {
        return {
            props: {
                ...args
            },
            template: `<items-table></items-table>`
        }
    }
} as Meta

type Story = StoryObj<BasicTable>

export const Simple: Story = {}
