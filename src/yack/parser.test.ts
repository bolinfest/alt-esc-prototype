import {parseYackFile} from './parser';
import {generateGDScript} from './codegen';

test('parseYackFile', () => {
  const ifElseChoice = `\
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
  const ast = parseYackFile(ifElseChoice, 'ifElseChoice.yack');
  expect(ast).toEqual([
    {
      type: 'knot',
      name: 'delores_dev',
      children: [
        {
          type: 'control_flow_choice',
          condition: '!inInventory(Inventory.camera)',
          consequent: {
            type: 'unconditional_choice',
            line: 'Where did you say the camera was again?',
            divert: 'where_is_camera',
          },
          alternate: {
            type: 'control_flow_choice',
            condition: 'Note.isDone()',
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
            "condition": "!inInventory(Inventory.camera)",
            "consequent": {
                "type": "unconditional_choice",
                "line": "Where did you say the camera was again?",
                "divert": "where_is_camera"
            },
            "alternate": {
                "type": "control_flow_choice",
                "condition": "Note.isDone()",
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
