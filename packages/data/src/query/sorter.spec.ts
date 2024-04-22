import { toSorted } from "@ngutil/common"

import { Product, products } from "./_fixtures"
import { sortBy, Sorter } from "./sorter"

describe("sorter", () => {
    const cases: { [key: string]: [Sorter<Product>, number[]] } = {
        "id ASC": [[{ id: "asc" }], [1, 2, 3, 4, 5]],
        "id DESC": [[{ id: "desc" }], [5, 4, 3, 2, 1]],

        "categories.*.id ASC, emptyFirst=true": [
            [{ "categories.*.id": { dir: "asc", emptyFirst: true } }],
            [5, 1, 4, 2, 3]
        ],
        "categories.*.id ASC, emptyFirst=false": [
            [{ "categories.*.id": { dir: "asc", emptyFirst: false } }],
            [1, 4, 2, 3, 5]
        ],
        "categories.*.id ASC, emptyFirst=false, default": [
            [{ "categories.*.id": { dir: "asc", emptyFirst: false } }],
            toSorted(products, sortBy([{ "categories.*.id": "asc" }])).map(v => v.id)
        ],
        "categories.*.id DESC, emptyFirst=true": [
            [{ "categories.*.id": { dir: "desc", emptyFirst: true } }],
            [5, 3, 2, 4, 1]
        ],
        "categories.*.id DESC, emptyFirst=true, default": [
            [{ "categories.*.id": { dir: "desc", emptyFirst: true } }],
            toSorted(products, sortBy([{ "categories.*.id": "desc" }])).map(v => v.id)
        ],
        "categories.*.id DESC, emptyFirst=false": [
            [{ "categories.*.id": { dir: "desc", emptyFirst: false } }],
            [3, 2, 4, 1, 5]
        ],

        "categories.*.author.roles.*.value ASC": [[{ "categories.*.author.roles.*.value": "asc" }], [3, 2, 1, 4, 5]],
        "categories.*.name ASC, name DESC": [
            [{ "categories.*.name": "asc" }, { name: "desc" }],
            [1, 4, 2, 3, 5]
        ]
    }

    for (const [name, [sorter, expected]] of Object.entries(cases)) {
        it(name, () => {
            const result = toSorted(products, sortBy<Product>(sorter)).map(v => v.id)
            expect(result).toEqual(expected)
        })
    }
})
