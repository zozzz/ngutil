import { isPlainObject, NumberWithUnit } from "@ngutil/common"

export interface Sides {
    top: NumberWithUnit
    right: NumberWithUnit
    bottom: NumberWithUnit
    left: NumberWithUnit
}

export type SidesUnit = "px" | "%"
export type SidesNumber = `${number}${SidesUnit}` | number
export type SidesInputObj = { top?: SidesNumber; right?: SidesNumber; bottom?: SidesNumber; left?: SidesNumber }
export type SidesInput =
    | Sides
    | SidesNumber
    | SidesInputObj
    | `${SidesNumber} ${SidesNumber}`
    | `${SidesNumber} ${SidesNumber} ${SidesNumber}`
    | `${SidesNumber} ${SidesNumber} ${SidesNumber} ${SidesNumber}`

export function sidesNormalize(value: SidesInput): Sides {
    if (isPlainObject(value)) {
        return {
            top: NumberWithUnit.coerce(value.top || 0, "px"),
            right: NumberWithUnit.coerce(value.right || 0, "px"),
            bottom: NumberWithUnit.coerce(value.bottom || 0, "px"),
            left: NumberWithUnit.coerce(value.left || 0, "px")
        }
    } else if (typeof value === "number") {
        return sidesNormalize(`${value}px`)
    } else if (typeof value !== "string") {
        throw new Error(`Invalid sides: ${value}`)
    }

    const entries = value.split(/\s+/g).map(v => NumberWithUnit.coerce(v, "px")) as [NumberWithUnit]

    if (entries.length < 0 || entries.length > 4) {
        throw new Error(`Cannot parse: ${value}`)
    }

    return compose(...entries)
}

function compose(
    top: NumberWithUnit,
    right: NumberWithUnit = top,
    bottom: NumberWithUnit = top,
    left: NumberWithUnit = right
): Sides {
    return { top, right, bottom, left }
}
