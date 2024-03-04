/* eslint-disable */
/* eslint-disable prettier/prettier */
/* ! AUTO GENERATED DO NOT EDIT ! */

export class Primary {
    static readonly Light = "#FFF" as const
    static readonly Dark = "#000" as const
}

export class UnitVariants {
    static readonly Duration1 = "0.1s" as const
    static readonly Duration1Ms = 100 as const
    static readonly Duration2 = "200ms" as const
    static readonly Duration2Ms = 200 as const
    static readonly Percent = "50%" as const
    static readonly PercentPercent = 0.5 as const
    static readonly Pixel = "50px" as const
    static readonly PixelPx = 50 as const
}

class Accent_Light {
    /**
     * With comment
     */
    static readonly Fg = "#000" as const
    static readonly Bg = "#FFF" as const
}

export class Accent {
    static readonly Light = Accent_Light
}

export const Gradient = [
    "#FFF" as const,
    "#000" as const
] as const

export const Simple = "#CC3300" as const

/**
 * some color
 */
export const SimpleWithComment = "#CC3300" as const

export const DictInArray = [
    {
        "X": 10 as const,
        "Y": "20%" as const
    } as const,
    {
        "X": "20px" as const,
        "Y": "30px" as const
    } as const
] as const

export const True = true as const

export const ArrayInArray = [
    [
        1 as const,
        2 as const,
        3 as const
    ] as const,
    [
        [
            1 as const,
            2 as const,
            3 as const
        ] as const,
        [
            4 as const,
            5 as const,
            6 as const
        ] as const
    ] as const
] as const
