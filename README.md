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
