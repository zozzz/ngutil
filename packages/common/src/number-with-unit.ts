export type NumberWithUnitInput = number | string | NumberWithUnit

const specials = ["auto", "inherit"]

export const UNIT_REGEX = "v[h|w|min|max]|p[c|t|x]|[re|e|c|m]m|[l|c]h|%|in|Q|ex|m?s"
export const NUMBER_REGEX = "[+-]?(?:\\d*\\.\\d+|\\d+\\.\\d*|\\d+)"

const regex = new RegExp(`^(${NUMBER_REGEX})\\s*(${UNIT_REGEX})?$`)

export class NumberWithUnit {
    static coerce(value: any, defaultUnit?: string) {
        if (specials.includes(value)) {
            return new NumberWithUnit(NaN, value)
        } else if (typeof value === "string") {
            const match = value.match(regex)
            if (match) {
                return new NumberWithUnit(Number(match[1]), match[2] || defaultUnit)
            }
        } else if (typeof value === "number") {
            return new NumberWithUnit(value, defaultUnit)
        }

        throw new Error(`Not implemented number with unit: ${value}`)
    }

    constructor(
        public readonly value: number,
        public readonly unit?: string
    ) {}

    toString() {
        if (isNaN(this.value)) {
            return this.unit
        } else if (this.unit != null) {
            return `${this.value}${this.unit}`
        } else {
            return `${this.value}`
        }
    }
}
