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
                    @if ((source.value$ | async).sorter; as sorter) {
                        @for (head of header; track head.field) {
                            <td style="width:150px" (click)="sortBy(head.field)">
                                {{ head.title }}
                                <!-- TODO: better: source.directionOf(head.field) -->
                                <!-- TODO: better: source.query.sorter.directionOf(head.field) -->
                                @if (sorter.directionOf(head.field) | async; as dir) {
                                    @if (dir === "asc") {
                                        ▲
                                    } @else if (dir === "desc") {
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

        this.source.value$
            .pipe(
                map(value => value.sorter),
                switchMap(sorter =>
                    sorter.directionOf(field).pipe(
                        map(dir => {
                            return { dir, sorter }
                        })
                    )
                ),
                take(1),
                map(({ dir, sorter }) => {
                    if (dir == null) {
                        sorter.normal.update([{ [field]: "asc" }])
                        return "asc"
                    } else if (dir === "asc") {
                        sorter.normal.update([{ [field]: "desc" }])
                        return "desc"
                    } else if (dir === "desc") {
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
