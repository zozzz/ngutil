// import { NUMBER_REGEX, UNIT_REGEX } from "@ngutil/common"

// TODO: fix this shit
// XXX: copied from @ngutil/common/number-with-unit, becuase jest unable to run if i mport ...
export const UNIT_REGEX = "v[h|w|min|max]|p[c|t|x]|[re|e|c|m]m|[l|c]h|%|in|Q|ex|m?s"
export const NUMBER_REGEX = "[+-]?(?:\\d*\\.\\d+|\\d+\\.\\d*|\\d+)"

const LITERAL_NUMBER = `(?<number>${NUMBER_REGEX})\\s*(?<unit>${UNIT_REGEX})?`
const LITERAL_COMMENT = `(?:\\s*;\\s*///?\\s*(?<comment>.*?))?`
const LITERAL_FLAGS = ["str", "color", "default"] as const
const LITERAL_FALGS_REGEX = "(?:" + LITERAL_FLAGS.map(value => `(?:\\s*(?<${value}>!${value})\\s*)`).join("|") + ")*"
const LITERAL_REGEX = new RegExp(
    `^(?:(?:${LITERAL_NUMBER})|(?<value>[^!;\\\\]+))${LITERAL_FALGS_REGEX}${LITERAL_COMMENT}$`
)

export type LiteralFlag = (typeof LITERAL_FLAGS)[number]
export type LiteralFlags = { [key in LiteralFlag]?: boolean }

const AUTO_DETECT_FLAGS: { [key in LiteralFlag]?: (value: string) => boolean } = {
    str: value => value.startsWith("(") || !!value.match(/[\r\n\s]+(?:and|or)[\r\n\s]+/),
    color: value =>
        value.startsWith("rgb(") ||
        value.startsWith("rgba(") ||
        value.startsWith("hsl(") ||
        value.startsWith("hsla(") ||
        value.startsWith("#")
}

export class Literal {
    static parse(value: any): Literal {
        if (typeof value === "number" || typeof value === "boolean") {
            return new Literal(value)
        } else {
            const raw = `${value}`.trim()
            const match = raw.match(LITERAL_REGEX)

            const baseValue =
                match.groups["number"] != null ? Number(match.groups["number"]) : match.groups["value"].trim()

            const unit = match.groups["unit"] != null ? match.groups["unit"].trim() : undefined
            const comment = match.groups["comment"] != null ? match.groups["comment"].trim() : undefined
            const flags = {}

            for (const k of LITERAL_FLAGS) {
                if (match.groups[k]) {
                    flags[k] = true
                }
            }

            for (const [flag, detect] of Object.entries(AUTO_DETECT_FLAGS)) {
                if (typeof baseValue === "string" && flags[flag] == null && detect(baseValue)) {
                    flags[flag] = true
                }
            }

            return new Literal(baseValue, unit, comment, flags)
        }
    }

    constructor(
        public readonly value: number | boolean | string,
        public readonly unit?: string,
        public readonly comment?: string,
        public readonly flags: LiteralFlags = {}
    ) {}
}
