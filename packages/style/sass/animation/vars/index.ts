/* eslint-disable */
/* eslint-disable prettier/prettier */
/* ! AUTO GENERATED DO NOT EDIT ! */

export class Ease {
    static readonly Deceleration = "cubic-bezier(0, 0, 0.2, 1)" as const
    static readonly Standard = "cubic-bezier(0.4, 0, 0.2, 1)" as const
    static readonly Acceleration = "cubic-bezier(0.4, 0, 1, 1)" as const
    static readonly Sharp = "cubic-bezier(0.4, 0, 0.6, 1)" as const
    /**
     * Reach nearly end position fast, and slowly move to final position
     */
    static readonly Emphasized = "cubic-bezier(0.12, 0.9, 0.12, 0.9)" as const
}

export class Duration {
    static readonly Fast = "200ms" as const
    static readonly FastMs = 200 as const
    static readonly Medium = "300ms" as const
    static readonly MediumMs = 300 as const
    static readonly Slow = "400ms" as const
    static readonly SlowMs = 400 as const
    static readonly Snail = "600ms" as const
    static readonly SnailMs = 600 as const
}
