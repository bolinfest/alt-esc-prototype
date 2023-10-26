import type {LiteralishValueOptions} from '../parser/literalish';

import chokidar from 'chokidar';
import fs from 'node:fs';
import path from 'path';
import {parseRoomScriptSource} from '../parser/parser';
import {generateFilesForRoom} from '../parser/codegen';

const directory = path.resolve(process.argv[2]);

log(`watching ${directory} recursively`);

const glob = `${directory}/**/*.room`;
const watcher = chokidar.watch(glob, {persistent: true});

watcher.on('change', evaluateFile);
watcher.on('add', evaluateFile);
watcher.on('unlink', path => {
  log(`TODO: remove generated files under ${path}`);
});

// -------- UTILITIES --------

// For now, we have no $T() function in GDScript to use.
const literalishValueOptions: LiteralishValueOptions = {
  omitTranslationWrapper: true,
};

/**
 * Note that .gd files are only written when there are changes, so
 * evaluating the `.room` file may not end up writing any files.
 */
function evaluateFile(roomFile: string) {
  log(`evaluating ${roomFile}`);
  const {name: roomName, dir: roomDir} = path.parse(roomFile);
  const roomSrc = fs.readFileSync(roomFile, {encoding: 'utf8'});
  const room = parseRoomScriptSource(roomSrc, roomName);

  const files = generateFilesForRoom(room, literalishValueOptions);

  // For now, put all generated content in a subfolder
  // so it is easy to blow it away.
  const genDir = path.join(roomDir, 'gen');
  mkdirp(genDir);
  // TODO: We should also remove files from the gen/ folder that are
  // no longer necessary.
  for (const [filename, gdscript] of files.entries()) {
    const gdFile = path.join(genDir, filename);
    if (!fs.existsSync(gdFile)) {
      log(`creating ${gdFile}`);
      fs.writeFileSync(gdFile, gdscript);
    } else {
      const existingGdscript = fs.readFileSync(gdFile, {encoding: 'utf8'});
      if (gdscript !== existingGdscript) {
        log(`updating ${gdFile}`);
        fs.writeFileSync(gdFile, gdscript);
      }
    }
  }
}

function mkdirp(directory: string) {
  try {
    fs.mkdirSync(directory);
  } catch (err) {
    if ((err as any).code !== 'EEXIST') {
      throw err;
    }
  }
}

function log(message: string) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${message}`);
}
