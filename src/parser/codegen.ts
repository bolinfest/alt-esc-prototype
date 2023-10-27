import type {Item, Verb, Room} from './parser';
import type {LiteralishValueOptions} from './literalish';
import {renderLiteralishValue} from './literalish';

export function generateFilesForRoom(
  room: Room,
  options: LiteralishValueOptions,
): Map<string, string> {
  const fileToSource = new Map();

  // .gd file for room
  fileToSource.set(`${room.name}.gd`, generateGDScriptForRoom(room, options));

  for (const item of room.items) {
    const gdscript = generateGDScriptForItem(item, options);
    fileToSource.set(`${item.name}.gd`, gdscript);
  }
  return fileToSource;
}

function generateGDScriptForRoom(
  room: Room,
  options: LiteralishValueOptions,
): string {
  const out: string[] = [];
  out.push('extends ESCRoom\n');
  for (const prop of room.properties) {
    out.push(
      `var ${prop.id} = ${renderLiteralishValue(prop.value, options)}\n`,
    );
  }

  return out.join('\n') + '\n';
}

function generateGDScriptForItem(
  item: Item,
  options: LiteralishValueOptions,
): string {
  const out: string[] = [];

  out.push();
  out.push('extends ESCItem');
  out.push('');

  for (const prop of item.properties) {
    out.push(`var ${prop.id} = ${renderLiteralishValue(prop.value, options)}`);
    out.push('');
  }

  const {verbs} = item;
  const eventMapEntries = [];
  if (verbs.length > 0) {
    out.push('func generate_events() -> Dictionary:');
    for (const verb of verbs) {
      const esc_verb_name = rewriteVerbName(verb);
      const var_name = `event_${esc_verb_name}`;
      out.push(`    var ${var_name} = escoria.esc_compiler.compile([`);
      out.push(`        ":${esc_verb_name}",`);
      for (const line of verb.lines) {
        out.push(`        ${JSON.stringify(line)},`);
      }
      out.push(`    ]).events["${esc_verb_name}"]`);
      eventMapEntries.push(`        "${esc_verb_name}": ${var_name},`);
    }

    out.push('    return {');
    out.push(...eventMapEntries);
    out.push('    }');
  }

  return out.join('\n') + '\n';
}

function rewriteVerbName(verb: Verb): string {
  const normalizedName = verb.name.toLowerCase();
  // Currently, we only have one special case.
  switch (normalizedName) {
    case 'look_at':
      return 'look';
    default:
      return normalizedName;
  }
}
