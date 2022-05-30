/**
 * Example .yack file that exercises various language features.
 */
export const KITCHEN_SINK = `\
// Sample .yack file that exercises various language features.

=== lunch ===

susie: "What would you like for lunch?"

* "Peanut butter and jelly." [once] -> pbj
* "Tuna fish." [once] -> tuna
* "A quesadilla." [once] -> quesadilla
* "Pizza!" [once] -> pizza

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

-> exit

=== delores_dev ===

* if [!inInventory(Inventory.camera)]
    "Where did you say the camera was again?" -> where_is_camera
  elif [Note.isDone()]
    "I think I'm done with the assignment." -> assignment_done
  else
    "Can I get some more film?" -> film
  endif
* "Want to see my work so far?" [temponce] [!Note.isDone() && !YACK(natalie_seen_work)]
`;
