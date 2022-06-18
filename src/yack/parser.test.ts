import {parseYackFile} from './parser';
import {generateGDScript} from './codegen';

test('parseYackFile', () => {
  const ifElseChoice = `\
=== delores_dev ===

* if [!inInventory(Inventory.camera)] [once]
    "Where did you say the camera was again?" -> where_is_camera
  elif [Note.isDone()]
    "I think I'm done with the assignment." -> assignment_done
  else
    "Can I get some more film?" -> film
  endif
* "Want to see my work so far?" [temponce] [!Note.isDone() && !YACK(natalie_seen_work)]
`;
  const ast = parseYackFile(ifElseChoice, 'ifElseChoice.yack');
  expect(ast).toEqual([
    {
      type: 'knot',
      name: 'delores_dev',
      children: [
        {
          type: 'control_flow_choice',
          conditions: ['!inInventory(Inventory.camera)', 'once'],
          consequent: {
            type: 'unconditional_choice',
            line: 'Where did you say the camera was again?',
            divert: 'where_is_camera',
          },
          alternate: {
            type: 'control_flow_choice',
            conditions: ['Note.isDone()'],
            consequent: {
              type: 'unconditional_choice',
              line: "I think I'm done with the assignment.",
              divert: 'assignment_done',
            },
            alternate: {
              type: 'unconditional_choice',
              line: 'Can I get some more film?',
              divert: 'film',
            },
          },
        },
        {
          type: 'simple_choice',
          line: 'Want to see my work so far?',
          conditions: [
            'temponce',
            '!Note.isDone() && !YACK(natalie_seen_work)',
          ],
          divert: null,
        },
      ],
    },
  ]);

  const gdscript = generateGDScript(ast);
  expect(gdscript).toBe(`\
func main(init_state):
    var state = init_state
    while state != null:
        match state:
            "delores_dev":
                state = yield __knot__delores_dev()


func __knot__delores_dev() -> String:
    var __genvar_0 = yield menu([
        {
            "type": "control_flow_choice",
            "conditions": [
                "!inInventory(Inventory.camera)",
                "once"
            ],
            "consequent": {
                "type": "unconditional_choice",
                "line": "Where did you say the camera was again?",
                "divert": "where_is_camera"
            },
            "alternate": {
                "type": "control_flow_choice",
                "conditions": [
                    "Note.isDone()"
                ],
                "consequent": {
                    "type": "unconditional_choice",
                    "line": "I think I'm done with the assignment.",
                    "divert": "assignment_done"
                },
                "alternate": {
                    "type": "unconditional_choice",
                    "line": "Can I get some more film?",
                    "divert": "film"
                }
            }
        },
        {
            "type": "simple_choice",
            "line": "Want to see my work so far?",
            "conditions": [
                "temponce",
                "!Note.isDone() && !YACK(natalie_seen_work)"
            ],
            "divert": null
        },
    ])
    if __genvar_0 != null:
        return __genvar_0
    return null


`);
});

test('dialog conditional with null option', () => {
  const topLevelConditional = `\
=== example ===

* if [has_key]
    none  // Nothing to say.
  elif [not tried_key]
    "I have an idea--let's try that key we found!"
  else
    "We could try the key again?"
  endif
* "I don't have any ideas."
`;
  const ast = parseYackFile(
    topLevelConditional,
    'dialog_with_null_option.yack',
  );
  const gdscript = generateGDScript(ast);
  expect(gdscript).toBe(`\
func main(init_state):
    var state = init_state
    while state != null:
        match state:
            "example":
                state = yield __knot__example()


func __knot__example() -> String:
    var __genvar_0 = yield menu([
        {
            "type": "control_flow_choice",
            "conditions": [
                "has_key"
            ],
            "consequent": null,
            "alternate": {
                "type": "control_flow_choice",
                "conditions": [
                    "not tried_key"
                ],
                "consequent": {
                    "type": "unconditional_choice",
                    "line": "I have an idea--let's try that key we found!",
                    "divert": null
                },
                "alternate": {
                    "type": "unconditional_choice",
                    "line": "We could try the key again?",
                    "divert": null
                }
            }
        },
        {
            "type": "simple_choice",
            "line": "I don't have any ideas.",
            "conditions": [],
            "divert": null
        },
    ])
    if __genvar_0 != null:
        return __genvar_0
    return null


`);
});

test('knot fallthrough', () => {
  const firstKnotFallsThroughToSecond = `\
=== first ===

alice: "Hi, Bob!"
bob: "Hi, Alice!"

=== second ===

alice: "It's so nice to talk in person instead of sending messages all the time."
`;
  const ast = parseYackFile(
    firstKnotFallsThroughToSecond,
    'alice_and_bob.yack',
  );
  const gdscript = generateGDScript(ast);
  expect(gdscript).toBe(`\
func main(init_state):
    var state = init_state
    while state != null:
        match state:
            "first":
                state = yield __knot__first()
            "second":
                state = yield __knot__second()


func __knot__first() -> String:
    sayLine(alice, "Hi, Bob!")
    sayLine(bob, "Hi, Alice!")
    return "second"


func __knot__second() -> String:
    sayLine(alice, "It's so nice to talk in person instead of sending messages all the time.")
    return null


`);
});

test('top-level conditional, consequent only', () => {
  const topLevelConditional = `\
=== example ===

if [not door_unlocked] [jiggled_handle]
  alice: "This door is locked."
  -> ask_about_key
endif
`;
  const ast = parseYackFile(topLevelConditional, 'top_level_conditional.yack');
  expect(ast).toEqual([
    {
      type: 'knot',
      name: 'example',
      children: [
        {
          type: 'conditional',
          conditions: ['not door_unlocked', 'jiggled_handle'],
          consequent: [
            {
              type: 'actor_line',
              actor: 'alice',
              line: 'This door is locked.',
            },
            {
              type: 'divert',
              target: 'ask_about_key',
            },
          ],
          alternate: [],
        },
      ],
    },
  ]);
});

test('top-level conditional with elif', () => {
  const topLevelConditional = `\
=== example ===

if [not door_visible]
  alice: "There is no way out!"
elif [not door_unlocked]
  alice: "This door is locked."
  -> ask_about_key
endif
`;
  const ast = parseYackFile(topLevelConditional, 'top_level_conditional.yack');
  expect(ast).toEqual([
    {
      type: 'knot',
      name: 'example',
      children: [
        {
          type: 'conditional',
          conditions: ['not door_visible'],
          consequent: [
            {
              type: 'actor_line',
              actor: 'alice',
              line: 'There is no way out!',
            },
          ],
          alternate: [
            {
              type: 'conditional',
              conditions: ['not door_unlocked'],
              consequent: [
                {
                  type: 'actor_line',
                  actor: 'alice',
                  line: 'This door is locked.',
                },
                {
                  type: 'divert',
                  target: 'ask_about_key',
                },
              ],
              alternate: [],
            },
          ],
        },
      ],
    },
  ]);
});

test('complex conditional', () => {
  const topLevelConditional = `\
=== example ===

if [a]
  alice: "a"
  if [b]
    alice: "a & b"
  elif [c]
    alice: "a & !b & c"
  else
    alice: "a & !b & !c"
  endif
elif [d]
  alice: "!a & d"
  if [e]
    alice: "!a & d & e"
  elif [f]
    alice: "!a & d & !e & f"
  else
    alice: "!a & d & !e & !f"
  endif
else
  alice: "!a & !d"
  if [g]
    alice: "!a & !d & g"
  else
    alice: "!a & !d & !g"
  endif
endif

alice: "Well, that was fun."
`;
  const ast = parseYackFile(topLevelConditional, 'complex_conditional.yack');
  expect(ast).toEqual([
    {
      type: 'knot',
      name: 'example',
      children: [
        {
          type: 'conditional',
          conditions: ['a'],
          consequent: [
            {
              type: 'actor_line',
              actor: 'alice',
              line: 'a',
            },
            {
              type: 'conditional',
              conditions: ['b'],
              consequent: [
                {
                  type: 'actor_line',
                  actor: 'alice',
                  line: 'a & b',
                },
              ],
              alternate: [
                {
                  type: 'conditional',
                  conditions: ['c'],
                  consequent: [
                    {
                      type: 'actor_line',
                      actor: 'alice',
                      line: 'a & !b & c',
                    },
                  ],
                  alternate: [
                    {
                      type: 'actor_line',
                      actor: 'alice',
                      line: 'a & !b & !c',
                    },
                  ],
                },
              ],
            },
          ],
          alternate: [
            {
              type: 'conditional',
              conditions: ['d'],
              consequent: [
                {
                  type: 'actor_line',
                  actor: 'alice',
                  line: '!a & d',
                },
                {
                  type: 'conditional',
                  conditions: ['e'],
                  consequent: [
                    {
                      type: 'actor_line',
                      actor: 'alice',
                      line: '!a & d & e',
                    },
                  ],
                  alternate: [
                    {
                      type: 'conditional',
                      conditions: ['f'],
                      consequent: [
                        {
                          type: 'actor_line',
                          actor: 'alice',
                          line: '!a & d & !e & f',
                        },
                      ],
                      alternate: [
                        {
                          type: 'actor_line',
                          actor: 'alice',
                          line: '!a & d & !e & !f',
                        },
                      ],
                    },
                  ],
                },
              ],
              alternate: [
                {
                  type: 'actor_line',
                  actor: 'alice',
                  line: '!a & !d',
                },
                {
                  type: 'conditional',
                  conditions: ['g'],
                  consequent: [
                    {
                      type: 'actor_line',
                      actor: 'alice',
                      line: '!a & !d & g',
                    },
                  ],
                  alternate: [
                    {
                      type: 'actor_line',
                      actor: 'alice',
                      line: '!a & !d & !g',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'actor_line',
          actor: 'alice',
          line: 'Well, that was fun.',
        },
      ],
    },
  ]);

  const gdscript = generateGDScript(ast);
  expect(gdscript).toBe(`\
func main(init_state):
    var state = init_state
    while state != null:
        match state:
            "example":
                state = yield __knot__example()


func __knot__example() -> String:
    if eval_cond("a"):
        sayLine(alice, "a")
        if eval_cond("b"):
            sayLine(alice, "a & b")
        else:
            if eval_cond("c"):
                sayLine(alice, "a & !b & c")
            else:
                sayLine(alice, "a & !b & !c")
    else:
        if eval_cond("d"):
            sayLine(alice, "!a & d")
            if eval_cond("e"):
                sayLine(alice, "!a & d & e")
            else:
                if eval_cond("f"):
                    sayLine(alice, "!a & d & !e & f")
                else:
                    sayLine(alice, "!a & d & !e & !f")
        else:
            sayLine(alice, "!a & !d")
            if eval_cond("g"):
                sayLine(alice, "!a & !d & g")
            else:
                sayLine(alice, "!a & !d & !g")
    sayLine(alice, "Well, that was fun.")
    return null


`);
});

test('macros and args', () => {
  const macroExample = `\
=== example ===

play_sound rumbling_stomach
play_animation "harry_devours_sandwich"
`;
  const ast = parseYackFile(macroExample, 'macroExample.yack');
  expect(ast).toEqual([
    {
      type: 'knot',
      name: 'example',
      children: [
        {
          type: 'macro',
          name: 'play_sound',
          args: ['rumbling_stomach'],
        },
        {
          type: 'macro',
          name: 'play_animation',
          args: ['harry_devours_sandwich'],
        },
      ],
    },
  ]);
  const gdscript = generateGDScript(ast);
  expect(gdscript).toBe(`\
func main(init_state):
    var state = init_state
    while state != null:
        match state:
            "example":
                state = yield __knot__example()


func __knot__example() -> String:
    call_macro("play_sound", ["rumbling_stomach"])
    call_macro("play_animation", ["harry_devours_sandwich"])
    return null


`);
});

test('inline script', () => {
  const macroExample = `\
=== example ===

{ call_some_gdscript( true ) }
`;
  const ast = parseYackFile(macroExample, 'inlineScriptExample.yack');
  expect(ast).toEqual([
    {
      type: 'knot',
      name: 'example',
      children: [
        {
          type: 'script',
          code: 'call_some_gdscript( true )',
        },
      ],
    },
  ]);
  const gdscript = generateGDScript(ast);
  expect(gdscript).toBe(`\
func main(init_state):
    var state = init_state
    while state != null:
        match state:
            "example":
                state = yield __knot__example()


func __knot__example() -> String:
    call_some_gdscript( true )
    return null


`);
});
