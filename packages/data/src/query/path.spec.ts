import { product1 } from "./_fixtures"
import { pathGetterCompile } from "./path"

describe("Path", () => {
    const cases: { [key: string]: [string, any, any[]] } = {
        // eslint-disable-next-line quote-props
        name: ["name", product1, ["Product 1"]],
        "0": ["0", [1], [1]],
        "categories.1.name": ["categories.1.name", product1, ["Category 3"]],
        "categories.*.name": ["categories.*.name", product1, ["Category 1", "Category 3"]],
        "categories.*.author.name.first": ["categories.*.author.name.first", product1, ["Elek", "Jane"]],
        "categories.*.tuples.*.0": ["categories.*.tuples.*.0", product1, [1, 3, 3]]
    }

    for (const [name, [pth, inp, exp]] of Object.entries(cases)) {
        it(name, () => {
            const getter = pathGetterCompile(pth)
            const value = getter(inp)
            expect(value).toEqual(exp)
        })
    }
})
