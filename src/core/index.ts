import os from 'os';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { spawn } from 'child_process';
import { FlowData, FlowResponseObject, CommandResponse } from '../interface';
import { inputType } from '../enum';
import 'colors';

const TEMP_FOLDER: string = '.easycommit';
const TEMP_FILE_NAME: string = 'message';
const FLOW: Array<FlowData> = [
  {
    type: inputType.SUBJECT,
    message: 'Commit message subject'
  },
  {
    type: inputType.BODY,
    message: 'Commit message body'
  },
  {
    type: inputType.BODY,
    message: null
  }
];

class FlowResponseObject {
  public subject: string = null;
  private body: Array<string> = [];

  addBody (bodyMessage: string): void {
    this.body.push(bodyMessage);
  }

  getMessage (): string {
    return this.subject.cyan.underline +
           '\n\n' +
           this.body.join('\n').yellow;
  }
}

export const main = async () => {
  const response: FlowResponseObject = new FlowResponseObject();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer () {}, // TODO: Auto complete tag (UPDATE, FIX etc..)
    prompt: '',
    tabSize: 2
  });
  let running: boolean = true;

  const flowGenerator = (function* () {
    const getFirst = () => FLOW.shift();
    let curr = getFirst();

    while (!(yield curr));
    while (running) {
      yield (curr = getFirst() || curr);
    }
  })();

  const ask = (question = ''): void => {
    if (question) console.log('>'.green.bold, question);
  };

  const handler = (line: string = ''): void => {
    const { done, value } = flowGenerator.next(line);

    if (done) rl.close();

    ask(value['message']);
    switch (value['type']) {
    case inputType.SUBJECT:
      response.subject = line;
      break;

    case inputType.BODY:
      response.addBody(line);
      break;
    }
  };

  const doCommit = (): void => {
    const commitMessage = response.getMessage();
    rl.question(commitMessage + '\n\n> Commit? [Y/n]', (answer) => {
      running = false;
      rl.close();

      // TODO: Commit
      if (!answer || answer === 'Y' || answer === 'y') {
        console.log('Yes!');
      } else {
        console.log('No!');
      }
    });
  };

  handler();
  rl
    .on('line', handler)
    .on('SIGINT', doCommit);
};

/**
 * @param cmd Command
 * @param args Arguments array
 * @return Command execute result
 */
const command = (cmd: string, args: Array<string>): Promise<CommandResponse> => {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args);
    const res = { data: '', code: -1 };

    c.stdout.on('data', data => {
      res.data += data.toString();
    });
  
    c.stderr.on('data', data => {
      res.data += data.toString();
    });
  
    c.on('exit', code => {
      res.code = code;
      (code !== 0 ? reject : resolve)(res);
    });
  });
};
