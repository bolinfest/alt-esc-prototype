export const ARCADE_ROOM = `\
# Arcade.room

# This defines state that should be persisted
# for the room. There can be multiple \`state\`
# blocks in the file so that state can be declared
# near the code that uses it.
state {

}

event enter() {
}

# Identifier after \`object\` must match Node id in .tscn file.
object door {
  name = "Door"
  is_exit = true
}

object meteor-mess {
  name = "Meteor Mess"

  LOOK_AT() {
    say player "It's out of order." [!mansion_has_power]
    say player "I need to find a quarter!" [mansion_has_power, !i/quarter]
    say player "Ah, my old nemesis, Meteor Mess." [mansion_has_power, i/quarter]
  }

  PICK_UP() {
    say player "I don't see a forklift around here."
  }

  USE() {
    > [mansion_has_power, i/quarter]
      say player "Game on!"
      @{
        # The \`@{ ... }\` indicates that this is a block
        # of GDScript that will be executed directly.
        # This can be thought of as an "anonymous ESC command."
      }
  }
}
`;
