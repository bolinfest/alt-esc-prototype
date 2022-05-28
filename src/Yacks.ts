/**
 * Example .yack file that exercises various language features.
 */
export const KITCHEN_SINK = `\
// Sample .yack file that exercises various language features.

=== lunch ===

susie: "What would you like for lunch?"

1 "Peanut butter and jelly." [once] -> pbj
2 "Tuna fish." [once] -> tuna
3 "A quesadilla." [once] -> quesadilla
4 "Pizza!" [once] -> pizza

-> out_of_options

=== pbj ===

susie: "This is a nut-free kitchen."

-> lunch

=== tuna ===

susie: "."

-> lunch

=== quesadilla ===

susie: "Lo siento, no queso."

-> lunch

=== pizza ===

susie: "."

-> lunch

=== out_of_options ===

clara: "Well, what do you have?"
susie: "Beets."

`;