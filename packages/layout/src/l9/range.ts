/**
 * -----------------------------------------------
 * | TOP:LEFT     |  TOP:CENTER   | TOP:RIGHT    |
 * ----------------------------------------------
 * | MIDDLE:LEFT  | MIDDLE:CENTER | MIDDLE:RIGHT |
 * ----------------------------------------------
 * | BOTTOMN:LEFT | BOTTOM:CENTER | BOTTOM:RIGHT |
 * -----------------------------------------------
 */
import { Rect } from "@ngutil/style"

const vertical = ["top", "middle", "bottom"] as const
const horizontal = ["left", "center", "right"] as const

export type L9Vertical = (typeof vertical)[number]
export type L9Horizontal = (typeof horizontal)[number]
export type L9CellName = `${L9Vertical}:${L9Horizontal}` | `${L9Horizontal}:${L9Vertical}`
export type L9RangeName = L9Vertical | L9Horizontal | L9CellName | `${L9CellName}-${L9CellName}`
export type L9Orient = "horizontal" | "vertical"

export const L9GridTopLeft = { row: 1, col: 1 }

export class L9Cell {
    static coerce(value: L9CellName) {
        const [v1, v2] = value.split(":")
        const v = vertical.includes(v1 as any) ? v1 : v2
        const h = horizontal.includes(v1 as any) ? v1 : v2

        if (v === h) {
            throw new Error(`Invalid cell value: ${value}`)
        }

        return new L9Cell(v as any, h as any)
    }

    constructor(
        public readonly v: L9Vertical,
        public readonly h: L9Horizontal
    ) {}

    intoGridArea(gridTopLeft: typeof L9GridTopLeft = L9GridTopLeft) {
        return `${gridTopLeft.row + vertical.indexOf(this.v)}/${gridTopLeft.col + horizontal.indexOf(this.h)}`
    }

    isEq(other: L9Cell) {
        return this.v === other.v && this.h === other.h
    }
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

    intoGridArea(gridTopLeft: typeof L9GridTopLeft = L9GridTopLeft) {
        const start = this.cells[0]
        const end = this.cells[this.cells.length - 1]
        const endTopLeft = { row: gridTopLeft.row + 1, col: gridTopLeft.col + 1 }
        return `${start.intoGridArea(gridTopLeft)}/${end.intoGridArea(endTopLeft)}`
    }

    intoRect(): Rect {
        const start = this.cells[0]
        const end = this.cells[this.cells.length - 1]
        const x = horizontal.indexOf(start.h)
        const y = vertical.indexOf(start.v)

        return { x, y, width: horizontal.indexOf(end.h) - x + 1, height: vertical.indexOf(end.v) - y + 1 }
    }

    #determineOrient(): L9Orient {
        const rect = this.intoRect()
        if (rect.width === rect.height) {
            // corner
            if (rect.x === rect.y) {
                return "vertical"
            }

            if (rect.x === 0 || rect.x === 2) {
                return "vertical"
            } else if (rect.y === 0 || rect.y === 2) {
                return "horizontal"
            }
        } else if (rect.width > rect.height) {
            return "horizontal"
        } else if (rect.height > rect.width) {
            return "vertical"
        }

        return "vertical"
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
