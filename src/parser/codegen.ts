import type {Item, Verb, Room} from './parser';
import type {LiteralishValue, LiteralishValueOptions} from './literalish';
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
  out.push('extends ESCItem\n\n');

  const overrideProperties: Array<[ItemPropertyMapping, LiteralishValue]> = [];
  const customProperties: Array<[ItemPropertyMapping, LiteralishValue]> = [];
  for (const prop of item.properties) {
    const mapping = mapItemProperty(prop.id);
    if (mapping.override) {
      overrideProperties.push([mapping, prop.value]);
    } else {
      customProperties.push([mapping, prop.value]);
    }
  }

  for (const [mapping, value] of customProperties) {
    out.push(
      `var ${mapping.name} = ${renderLiteralishValue(value, options)}\n`,
    );
  }

  if (overrideProperties.length > 0) {
    out.push('func _init():');
    for (const [mapping, value] of overrideProperties) {
      out.push(
        `    self.${mapping.name} = ${renderLiteralishValue(value, options)}`,
      );
    }
    out.push('\n');
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

type ItemPropertyMapping = {
  /**
   * Name of the property to use in GDScript. May differ from the name used
   * in the .room file.
   */
  name: string;

  /**
   * true if the field is defined in a parent class and therefore the value
   * must be overridden in the constructor.
   */
  override: boolean;
};

function mapItemProperty(propertyName: string): ItemPropertyMapping {
  switch (propertyName) {
    case 'tooltip':
      return {name: 'tooltip_name', override: true};
    case 'is_exit':
      return {name: 'is_exit', override: true};
    default:
      return {name: propertyName, override: false};
  }
}
