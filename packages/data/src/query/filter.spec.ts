import { Product, product1, product2, product3, product4, product5, products } from "./_fixtures"
import {
    Filter,
    filterBy,
    type FilterCustom,
    filterMerge,
    filterNormalize,
    type FilterNormalized,
    FilterOp
} from "./filter"

const CUSTOM_OP_MAP = {
    eq: FilterOp.EqStrict,
    typeof: { custom: "typeof", matcher: (item, value) => typeof item === value } satisfies FilterCustom,
    is: { custom: "is" } satisfies FilterCustom,
    xxx: { custom: "xxx", matcher: (item, value) => item === value } satisfies FilterCustom
} as const

describe("Filter", () => {
    describe("Normalize", () => {
        const cases: Array<[Filter<Product>, FilterNormalized]> = [
            [{ id: 1 }, { path: "id", op: FilterOp.EqStrict, value: 1 }],
            [
                { id: 1, name: 2 },
                {
                    op: FilterOp.And,
                    value: [
                        { path: "id", op: FilterOp.EqStrict, value: 1 },
                        { path: "name", op: FilterOp.EqStrict, value: 2 }
                    ]
                }
            ],
            [
                { id: { "|": [1, 2] } },
                {
                    op: FilterOp.Or,
                    value: [
                        { path: "id", op: FilterOp.EqStrict, value: 1 },
                        { path: "id", op: FilterOp.EqStrict, value: 2 }
                    ]
                }
            ],
            [
                { "&": [{ id: { ">": 0 } }, { id: { "<": 100 } }] },
                {
                    op: FilterOp.And,
                    value: [
                        { path: "id", op: FilterOp.Gt, value: 0 },
                        { path: "id", op: FilterOp.Lt, value: 100 }
                    ]
                }
            ],

            [
                { id: { "&": [{ ">": 0 }, { "<": 100 }] } },
                {
                    op: FilterOp.And,
                    value: [
                        { path: "id", op: FilterOp.Gt, value: 0 },
                        { path: "id", op: FilterOp.Lt, value: 100 }
                    ]
                }
            ],
            [
                { id: { "!": [1, 2] } },
                {
                    op: FilterOp.Not,
                    value: [
                        { path: "id", op: FilterOp.EqStrict, value: 1 },
                        { path: "id", op: FilterOp.EqStrict, value: 2 }
                    ]
                }
            ],
            [
                { title: "Alma", parent: { "!": [{ is: "SOMETHING" }] } },
                {
                    op: FilterOp.And,
                    value: [
                        { path: "title", op: FilterOp.EqStrict, value: "Alma" },
                        {
                            op: FilterOp.Not,
                            value: [{ path: "parent", op: { custom: "is" }, value: "SOMETHING" }]
                        }
                    ]
                }
            ],
            [
                {
                    op: FilterOp.And,
                    value: [
                        { path: "title", op: FilterOp.EqStrict, value: "Alma" },
                        {
                            op: FilterOp.Not,
                            value: [{ path: "parent", op: { custom: "is" }, value: "SOMETHING" }]
                        }
                    ]
                },
                {
                    op: FilterOp.And,
                    value: [
                        { path: "title", op: FilterOp.EqStrict, value: "Alma" },
                        {
                            op: FilterOp.Not,
                            value: [{ path: "parent", op: { custom: "is" }, value: "SOMETHING" }]
                        }
                    ]
                }
            ],
            [
                { title: "Alma", address: { typeof: "string" } },
                {
                    op: FilterOp.And,
                    value: [
                        { path: "title", op: FilterOp.EqStrict, value: "Alma" },
                        { path: "address", op: CUSTOM_OP_MAP["typeof"], value: "string" }
                    ]
                }
            ],
            // nested object filter
            [
                { parent: { id: { eq: 1 } } },
                {
                    path: "parent.id",
                    op: FilterOp.EqStrict,
                    value: 1
                }
            ],
            [
                { parent: { id: 1 } },
                {
                    path: "parent.id",
                    op: FilterOp.EqStrict,
                    value: 1
                }
            ],
            [
                { parent: { id: { "|": [1, 2] } } },
                {
                    op: FilterOp.Or,
                    value: [
                        { path: "parent.id", op: FilterOp.EqStrict, value: 1 },
                        { path: "parent.id", op: FilterOp.EqStrict, value: 2 }
                    ]
                }
            ]
        ]

        for (const [filter, expected] of cases) {
            it(JSON.stringify(filter), () => {
                const res = filterNormalize(filter, CUSTOM_OP_MAP)
                // console.log(util.inspect(res, { depth: null }))
                expect(res).toEqual(expected)
            })
        }
    })

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
            "|": [{ id: { "|": [1, 5] } }, [product1, product5]],
            "&": [{ id: { "&": [{ ">": 0 }, { "<": 2 }] } }, [product1]],
            "!": [{ id: { "!": [{ ">": 0 }, { "<": 2 }] } }, [product2, product3, product4, product5]],
            "!2": [{ id: { "!": [{ "===": 2 }] } }, [product1, product3, product4, product5]],
            "& (indirect)": [{ id: { ">": 0, "<=": 2 } }, [product1, product2]],
            "categories.*.author.name.title==null": [
                { "categories.*.author.name.title": { "==": null } },
                [product1, product3, product4]
            ],
            "categories.*.author.name.title===null": [{ "categories.*.author.name.title": { "===": null } }, []],
            "kind===null": [{ kind: { "===": null } }, [product5]],
            // eslint-disable-next-line prettier/prettier
            "xxx": [{ id: { xxx: 1 } }, [product1]]
        }

        // TODO: chekc if some operators is missing from cases

        for (const [name, [filter, expected]] of Object.entries(cases)) {
            it(name, () => {
                const result = products.filter(filterBy(filter, CUSTOM_OP_MAP))
                expect(result).toEqual(expected)
            })
        }
    })

    type FilterInput = Filter<Product> | undefined | null
    describe("merge", () => {
        const cases: Array<[...FilterInput[], Filter<Product> | undefined]> = [
            [{}, {}, undefined],
            [null, {}, undefined],
            [undefined, {}, undefined],
            [{}, null, undefined],
            [{}, undefined, undefined],
            // clear filter
            [{ id: 1 }, undefined, undefined],
            // clear filter
            [{ id: 1 }, null, undefined],
            // clear & set filter
            [{ id: 1 }, null, { name: "test" }, { path: "name", op: "===", value: "test" }],
            [null, undefined, undefined],
            // do nothing
            [{ id: 1 }, {}, { path: "id", op: "===", value: 1 }],
            // add id filter
            [{}, { id: 1 }, { path: "id", op: "===", value: 1 }],
            // replace id with null
            [{ id: 1 }, { id: null }, { path: "id", op: "===", value: null }],
            // remove id form filters
            [{ id: 1 }, { id: undefined }, undefined],
            // do nothing
            [{ id: 1 }, { name: undefined }, { path: "id", op: "===", value: 1 }],
            // add new filter name, with null value
            [
                { id: 1 },
                { name: null },
                {
                    op: "&",
                    value: [
                        { path: "id", op: "===", value: 1 },
                        { path: "name", op: "===", value: null }
                    ]
                }
            ],
            [
                { name: { typeof: "string" } },
                { name: { typeof: "number" } },
                { path: "name", op: CUSTOM_OP_MAP["typeof"], value: "number" }
            ]
        ]

        for (const c of cases) {
            const merge = c.slice(0, c.length - 1).map(v => filterNormalize(v, CUSTOM_OP_MAP))
            const filterRes = c[c.length - 1] as Filter<Product> | undefined
            const name = `${JSON.stringify(c.slice(0, -1))}`
            it(name, () => {
                expect(filterMerge(...merge)).toEqual(filterRes)
            })
        }
    })
})
