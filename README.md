# alt-esc-prototype

This is an experiment to create an alternative to
[ESC](https://docs.escoria-framework.org/en/devel/scripting/z_esc_reference.html)
that is more in the style of **Dinky**, the scripting language used by [Delores:
A Thimbleweed Park mini-adventure](https://github.com/grumpygamer/DeloresDev).
Whereas ESC favors a number of small `.esc` scripts, a room and the objects it
contains is defined in a single `.dinky` file in Dolores, e.g.,
[`MainStreet.dinky`](https://github.com/grumpygamer/DeloresDev/blob/master/Scripts/Rooms/MainStreet.dinky).

While Dinky is a custom language based on
[Squirrel](https://github.com/albertodemichelis/squirrel), because Escoria is
using Godot as the underlying engine, this prototype uses
[GDScript](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
as the target language, so it also supports embedding directly,
as appropriate.

## .room files

### item declarations

A `.room` file may have multiple `item` declarations.

#### properties

A property declaration must be of the form:

```
<name> = <literalish-value>
```

where `literalish-value` is one of:

- a double-quoted string literal
- a double-quoted string literal passed to `$T()`, the translation function
- a numeric literal (whatever `JSON.parse()` accepts)
- a boolean: `true` or `false`
- `null`

#### events

Functions that correspond to events are in all caps so they stand out.
Currently, we support the following:

`LOOK_AT()`

Invoked when the player looks at this item.

`TALK_TO()`

Invoked when the player talks to this item. (Most likely, this is an NPC.)
This could be folded into USE(), though that would preclude the possibility
of being able to support both "push Nurse Edna" and "talk to Nurse Edna."
as separate actions.

`USE(target?)`

For an item not in the player's inventory, USE() invoked when the player
tries to "act on" this item. (In this case, \`target\` will be \`null\`.)
This could mean different things:

- For an item that can be picked up, USE would pick it up.
- In all other cases, it would cause the player to _act_ on the item.
  For example, if the item is a door, USE would open it.
  For a light switch, USE would toggle it.
- For an item that could be pushed OR pulled, we would have two
  hotspots where one you USE to push and the other you USE to pull.

For an item in the player's inventory, `target` will be the item the
player is trying to use this item on. This could be an item in the
scene or another item in the player's inventory. For example, if
`target` is an NPC, this could be interpreted as "give."

Admittedly, this means if there is an item like a telephone, the player
cannot really use the telephone in place to make a call OR pick it up
because USE() has to be interpreted as one or the other. In practice,
this is probably fine.

In this way, `USE()` subsumes 7/9 of the 9-verb SCUMM system:
everything except for "Look at" and "Talk to."

The code associated with an event is in curly braces. If the code
inside the block is ESC, then the block must start with `%{` instead of
a plain `{`.

```
item meteor_mess {
  name = $T("Meteor Mess")

  LOOK() %{
    say player "It's out of order." [!mansion_has_power]
    say player "I need to find a quarter!" [mansion_has_power, !i/quarter]
    say player "Ah, my old nemesis, Meteor Mess." [mansion_has_power, i/quarter]
  }

  # This should get replaced with proper conditionals.
  USE() %{
    > [mansion_has_power, i/quarter]
      say player "Game on!"
      stop
    say player "I don't see a forklift around here."
  }
}
```
