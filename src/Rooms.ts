export const ARCADE_ROOM = `\
# Arcade.room

# This defines state that should be persisted
# for the room. There can be multiple \`state\`
# blocks in the file so that state can be declared
# near the code that uses it.
state {
  light_switch_on = true
}

event enter() {
}

# Identifier after \`item\` must match Node id in .tscn file.
item door {
  tooltip = $T("Door")
  is_exit = true
}

item meteor_mess {
  tooltip = $T("Meteor Mess")

  LOOK_AT() %{
    say player "It's out of order." [!mansion_has_power]
    say player "I need to find a quarter!" [mansion_has_power, !i/quarter]
    say player "Ah, my old nemesis, Meteor Mess." [mansion_has_power, i/quarter]
  }

  USE() %{
    # This should get rewritten in our custom scripting language
    # to support C-style conditionals.
    > [mansion_has_power, i/quarter]
      say player "Game on!"
      stop
    say player "I don't see a forklift around here."
  }
}
`;
