// import { NUMBER_REGEX, UNIT_REGEX } from "@ngutil/common"

// TODO: fix this shit
// XXX: copied from @ngutil/common/number-with-unit, becuase jest unable to run if i mport ...
export const UNIT_REGEX = "v[h|w|min|max]|p[c|t|x]|[re|e|c|m]m|[l|c]h|%|in|Q|ex|m?s"
export const NUMBER_REGEX = "[+-]?(?:\\d*\\.\\d+|\\d+\\.\\d*|\\d+)"

const LITERAL_NUMBER = `(?<number>${NUMBER_REGEX})\\s*(?<unit>${UNIT_REGEX})?`
const LITERAL_COMMENT = `(?:\\s*;\\s*///?\\s*(?<comment>.*?))?`
const LITERAL_REGEX = new RegExp(`^(?:(?:${LITERAL_NUMBER})|(?<str>[^;\\\\]+))${LITERAL_COMMENT}$`)

export class Literal {
    static parse(value: any): Literal {
        if (typeof value === "number" || typeof value === "boolean") {
            return new Literal(value)
        } else {
            const raw = `${value}`.trim()
            const match = raw.match(LITERAL_REGEX)

            const baseValue =
                match.groups["number"] != null ? Number(match.groups["number"]) : match.groups["str"].trim()

            const unit = match.groups["unit"] != null ? match.groups["unit"].trim() : undefined
            const comment = match.groups["comment"] != null ? match.groups["comment"].trim() : undefined

            return new Literal(baseValue, unit, comment)
        }
    }

    constructor(
        public readonly value: number | boolean | string,
        public readonly unit?: string,
        public readonly comment?: string
    ) {}
}
