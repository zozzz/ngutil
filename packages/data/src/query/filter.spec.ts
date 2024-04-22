import { Product, product1, product2, product3, product4, product5, products } from "./_fixtures"
import { Filter, filterBy, filterMerge } from "./filter"

describe("Filter", () => {
    // describe("Normalize", () => {
    //     const cases: { [key: string]: [Filters<Product>, any] } = {
    //         "{id:1}": [{ id: 1 }, { "&": [{ path: "id", op: "==", value: 1 }] }],
    //         "{id:1,kind:{===:VIRTUAL}}": [
    //             { id: 1, kind: { "===": ProductKind.Virtual } },
    //             {
    //                 "&": [
    //                     { path: "id", op: "==", value: 1 },
    //                     { path: "kind", op: "===", value: "VIRTUAL" }
    //                 ]
    //             }
    //         ],
    //         "{'|': [{id: 10}, {name: 'Product 1'}]}": [
    //             { "|": [{ id: 10 }, { name: "Product 1" }] },
    //             { "&": [{ id: { "==": 1 } }, { kind: { "===": ProductKind.Virtual } }] }
    //         ]
    //     }

    //     for (const [name, [filter, expected]] of Object.entries(cases)) {
    //         it(name, () => {
    //             const res = normalizeFilter(filter)
    //             console.log(name, util.inspect(res, { depth: null }))
    //             expect(res).toEqual(expected)
    //         })
    //     }
    // })

    describe("operators", () => {
        const cases: { [key: string]: [Filter<Product>, Product[]] } = {
            "default-eq": [{ id: 2 }, [product2]],
            "==": [{ id: { "==": 2 } }, [product2]],
            "==*": [{ name: { "==*": "PRODUCT 2" } }, [product2]],
            "!=": [{ id: { "!=": 2 } }, [product1, product3, product4, product5]],
            "!=*": [{ name: { "!=*": "PRODUCT 2" } }, [product1, product3, product4, product5]],
            ">": [{ id: { ">": 3 } }, [product4, product5]],
            ">*": [{ name: { ">*": "PRODUCT 3" } }, [product4, product5]],
            ">=": [{ id: { ">=": 4 } }, [product4, product5]],
            ">=*": [{ name: { ">=*": "PRODUCT 4" } }, [product4, product5]],
            "<": [{ id: { "<": 2 } }, [product1]],
            "<*": [{ name: { "<*": "PRODUCT 2" } }, [product1]],
            "<=": [{ id: { "<=": 1 } }, [product1]],
            "<=*": [{ name: { "<=*": "PRODUCT 1" } }, [product1]],
            "%": [{ name: { "%": "1" } }, [product1]],
            "%*": [{ name: { "%*": "CT 1" } }, [product1]],
            "^": [{ name: { "^": "Prod" } }, products],
            "^*": [{ name: { "^*": "PROD" } }, products],
            // eslint-disable-next-line prettier/prettier
            "$": [{ name: { $: "1" } }, [product1]],
            "$*": [{ name: { "$*": "PRODUCT 1" } }, [product1]],
            "~ (string input)": [{ name: { "~": "^P[roduct]+\\s*\\d+$" } }, products],
            "~ (regex input)": [{ name: { "~": /^P[roduct]+\s*\d+$/ } }, products],
            "~* (string input)": [{ name: { "~*": "^P[RODUCT]+\\s*\\d+$" } }, products],
            // TODO: recursive type
            // "|": [{ id: { "|": [1, 5] } }, [product1, product5]],
            // "&": [{ id: { "&": [{ ">": 0 }, { "<": 2 }] } }, [product1]],
            "& (indirect)": [{ id: { ">": 0, "<=": 2 } }, [product1, product2]],
            "categories.*.author.name.title==null": [
                { "categories.*.author.name.title": { "==": null } },
                [product1, product3, product4]
            ],
            "categories.*.author.name.title===null": [{ "categories.*.author.name.title": { "===": null } }, []],
            "kind===null": [{ kind: { "===": null } }, [product5]]
        }

        // TODO: chekc if some operators is missing from cases

        for (const [name, [filter, expected]] of Object.entries(cases)) {
            it(name, () => {
                const result = products.filter(filterBy(filter))
                expect(result).toEqual(expected)
            })
        }
    })

    type FilterInput = Filter<Product> | undefined | null
    describe("merge", () => {
        const cases: Array<[FilterInput, FilterInput, Filter<Product> | undefined]> = [
            [{}, {}, {}],
            [null, {}, {}],
            [undefined, {}, {}],
            [{}, null, {}],
            [{}, undefined, {}],
            [null, undefined, undefined],
            [{ id: 1 }, {}, { id: 1 }],
            [{}, { id: 1 }, { id: 1 }],
            [{ id: 1 }, { id: null }, { id: null }],
            [{ id: 1 }, { id: undefined }, {}]
        ]

        for (const [filter1, filter2, filterRes] of cases) {
            const name = `${JSON.stringify(filter1)} & ${JSON.stringify(filter2)}`
            it(name, () => {
                expect(filterMerge(filter1, filter2)).toEqual(filterRes)
            })
        }
    })
})
