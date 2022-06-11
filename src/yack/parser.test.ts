import {parseYackFile} from './parser';

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
    // Ideally, we should strip this empty knot.
    {
      type: 'knot',
      name: '',
      children: [],
    },
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
});
