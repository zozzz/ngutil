/* eslint-disable */
/* eslint-disable prettier/prettier */
/* ! AUTO GENERATED DO NOT EDIT ! */

export class Primary {
    static readonly Normal = [
        "#CCC" as const,
        "#000" as const
    ] as const
    static readonly Light = [
        "#FFF" as const,
        "#000" as const
    ] as const
    static readonly Dark = [
        "#333" as const,
        "#CCC" as const
    ] as const
}

class Deep_Level1_Level2 {
    static readonly X = "10px" as const
    static readonly XPx = 10 as const
    static readonly Y = "20px" as const
    static readonly YPx = 20 as const
}

class Deep_Level1_Level2X {
    static readonly Level3 = [
        "Array 1" as const,
        "Array 2" as const,
        "Array 3" as const
    ] as const
}

class Deep_Level1 {
    static readonly Level2 = Deep_Level1_Level2
    static readonly Level2X = Deep_Level1_Level2X
}

export class Deep {
    static readonly Level1 = Deep_Level1
}

export class Sizes {
    static readonly Zero = [] as const
    static readonly One = [1 as const] as const
    static readonly Many = [
        1 as const,
        2 as const,
        3 as const
    ] as const
}
