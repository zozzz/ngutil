type ConcatTail<SEP extends string, V extends string> = V extends never ? "" : `${SEP}${V}`

/**
 * Concatenate strings with separator
 *
 * @example
 * ```ts
 * type C = Concat<".", ["A", "B", "C"]> = "A.B.C"
 * ```
 */
export type Concat<SEP extends string, VALS extends string[]> = VALS extends [
    infer V1 extends string,
    ...infer OV extends string[]
]
    ? OV["length"] extends 0
        ? `${V1}`
        : `${V1}${ConcatTail<SEP, Concat<SEP, OV>>}`
    : never
