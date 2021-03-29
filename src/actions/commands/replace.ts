import { Position } from 'vscode';
import { PositionDiff } from '../../common/motion/position';
import { Range } from '../../common/motion/range';
import { Mode } from '../../mode/mode';
import { VimState } from '../../state/vimState';
import { RegisterAction, BaseCommand } from '../base';

@RegisterAction
class ExitReplaceMode extends BaseCommand {
  modes = [Mode.Replace];
  keys = [['<Esc>'], ['<C-c>'], ['<C-[>']];

  public async exec(position: Position, vimState: VimState): Promise<void> {
    const replaceState = vimState.replaceState!;

    // `3Rabc` results in 'abc' being inserted 2 more times
    if (replaceState.timesToRepeat > 1) {
      vimState.recordedState.transformer.addTransformation({
        type: 'insertText',
        text: replaceState.newChars.join('').repeat(replaceState.timesToRepeat - 1),
        position,
        diff: new PositionDiff({ character: -1 }),
      });
    } else {
      vimState.cursorStopPosition = vimState.cursorStopPosition.getLeft();
    }

    await vimState.setCurrentMode(Mode.Normal);
  }
}

@RegisterAction
class ReplaceModeToInsertMode extends BaseCommand {
  modes = [Mode.Replace];
  keys = ['<Insert>'];

  public async exec(position: Position, vimState: VimState): Promise<void> {
    await vimState.setCurrentMode(Mode.Insert);
  }
}

@RegisterAction
class BackspaceInReplaceMode extends BaseCommand {
  modes = [Mode.Replace];
  keys = [['<BS>'], ['<C-h>']];

  public async exec(position: Position, vimState: VimState): Promise<void> {
    const replaceState = vimState.replaceState!;
    if (position.isBeforeOrEqual(replaceState.replaceCursorStartPosition)) {
      // If you backspace before the beginning of where you started to replace, just move the cursor back.

      const newPosition = position.getLeft();
      vimState.c1rsorStopPosition = newPosition;
      vimState.cursorStartPosition = newPosition;
      replaceState.replaceCursorStartPosition = newPosition;
    } else if (
      position.line > replaceState.replaceCursorStartPosition.line ||
      position.character > replaceState.originalChars.length
    ) {
      // We've gone beyond the originally existing text; just backspace.
      vimState.recordedState.transformer.addTransformation({
        type: 'deleteText',
        position,
      });
    } else {
      vimState.recordedState.transformer.addTransformation({
        type: 'replaceText',
        text: replaceState.originalChars[position.character - 1],
        range: new Range(position.getLeft(), position),
        diff: new PositionDiff({ character: -1 }),
      });
    }

    replaceState.newChars.pop();
  }
}

@RegisterAction
class ReplaceInReplaceMode extends BaseCommand {
  modes = [Mode.Replace];
  keys = ['<character>'];
  canBeRepeatedWithDot = true;

  public async exec(position: Position, vimState: VimState): Promise<void> {
    const char = this.keysPressed[0];
    const replaceState = vimState.replaceState!;

    if (!position.isLineEnd() && char !== '\n') {
      vimState.recordedState.transformer.addTransformation({
        type: 'replaceText',
        text: char,
        range: new Range(position, position.getRight()),
        diff: new PositionDiff({ character: 1 }),
      });
    } else {
      vimState.recordedState.transformer.addTransformation({
        type: 'insertText',
        text: char,
        position,
      });
    }

    replaceState.newChars.push(char);
  }
}