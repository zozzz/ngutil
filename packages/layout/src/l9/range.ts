/**
 * -----------------------------------------------
 * | TOP:LEFT     |  TOP:CENTER   | TOP:RIGHT    |
 * -----------------------------------------------
 * | MIDDLE:LEFT  | MIDDLE:CENTER | MIDDLE:RIGH  |
 * -----------------------------------------------
 * | BOTTOMN:LEFT | BOTTOM:CENTER | BOTTOM:RIGHT |
 * -----------------------------------------------
 */

const vertical = ["top", "middle", "bottom"] as const
const horizontal = ["left", "center", "right"] as const

export type L9Vertical = "top" | "middle" | "bottom"
export type L9Horizontal = "left" | "center" | "right"
export type L9CellName = `${L9Vertical}:${L9Horizontal}`
export type L9RangeName = L9Vertical | L9Horizontal | L9CellName | `${L9CellName}-${L9CellName}`
export type L9Orient = "horizontal" | "vertical" | "rect"

export class L9Cell {
    static coerce(value: L9CellName) {
        const [v, h] = value.split(":")

        if (vertical.includes(v as any) && horizontal.includes(h as any)) {
            return new L9Cell(v as any, h as any)
        }

        throw new Error(`Invalid cell value: ${value}`)
    }

    constructor(
        public readonly v: L9Vertical,
        public readonly h: L9Horizontal
    ) {}
}

export class L9Range {
    static coerce(value: L9Range | L9RangeName) {
        if (value instanceof L9Range) {
            return value
        } else {
            return new L9Range(value)
        }
    }

    readonly cells: Array<L9Cell>
    readonly orient: L9Orient

    constructor(range: L9RangeName) {
        this.cells = parse(range)
        this.orient = this.#determineOrient()
    }

    isEq(other: L9Range) {
        if (other instanceof L9Range) {
            const selfFirst = this.cells[0]
            const otherFirst = other.cells[0]

            if (selfFirst.h !== otherFirst.h || selfFirst.v !== otherFirst.v) {
                return false
            }

            const selfLast = this.cells[this.cells.length - 1]
            const otherLast = other.cells[other.cells.length - 1]

            if (selfLast.h === otherLast.h && selfLast.v === otherLast.v) {
                return true
            }
        }
        return false
    }

    #determineOrient(): L9Orient {
        const { v: sv, h: sh } = this.cells[0]
        const { v: ev, h: eh } = this.cells[this.cells.length - 1]

        if (sv === ev) {
            return "horizontal"
        } else if (sh === eh) {
            return "vertical"
        } else {
            return "rect"
        }
    }
}

function parse(value: any): Array<L9Cell> {
    const cells: Array<L9Cell> = []

    if (vertical.includes(value)) {
        for (const h of horizontal) {
            cells.push(new L9Cell(value, h))
        }
    } else if (horizontal.includes(value)) {
        for (const v of vertical) {
            cells.push(new L9Cell(v, value))
        }
    } else if (value.includes("-")) {
        const [begin, end] = value.split("-")
        const beginCells = parse(begin)
        const endCells = parse(end)

        if (beginCells.length > 1) {
            throw new Error(`Currently not supported begin range value: ${begin}`)
        }

        if (endCells.length > 1) {
            throw new Error(`Currently not supported end range value: ${end}`)
        }

        const { v: bv, h: bh } = beginCells[0]
        const { v: ev, h: eh } = endCells[0]

        const vstart = Math.min(vertical.indexOf(bv as any), vertical.indexOf(ev as any))
        const vend = Math.max(vertical.indexOf(bv as any), vertical.indexOf(ev as any))
        const hstart = Math.min(horizontal.indexOf(bh as any), horizontal.indexOf(eh as any))
        const hend = Math.max(horizontal.indexOf(bh as any), horizontal.indexOf(eh as any))

        for (let vi = vstart; vi <= vend; vi++) {
            for (let hi = hstart; hi <= hend; hi++) {
                cells.push(new L9Cell(vertical[vi], horizontal[hi]))
            }
        }
    } else if (value.includes(":")) {
        cells.push(L9Cell.coerce(value))
    }

    if (cells.length === 0) {
        throw Error(`Undefined l9cell: "${value}"`)
    }

    return cells
}
