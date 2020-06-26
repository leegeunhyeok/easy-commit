import readline from 'readline';
import { spawn } from 'child_process';
import { FlowData, CommandResponse } from '../interface';
import { inputType } from '../enum';
import 'colors';

const MESSAGE = {
  'SUBJECT_REQUIRE': 'Subject is required.'
};

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

class Defer {
  private promise: Promise<void> = null;
  private res: Function = null;
  private rej: Function = null;

  constructor () {
    this.promise = new Promise((resolve, reject) => {
      this.res = resolve;
      this.rej = reject;
    });
  }

  public valueOf (): Promise<void> {
    return this.promise;
  }

  public resolve (): void {
    this.res();
  }

  public reject (e): void {
    this.rej(e);
  }
}

class FlowResponseObject {
  private subject: string = null;
  private body: Array<string> = [];
  private maxLength: number = 0;

  private updateLength (str: string): void {
    if (this.maxLength < str.length) {
      this.maxLength = str.length;
    }
  }

  public setSubject (subject: string): void {
    this.subject = subject;
    this.updateLength(subject);
  }

  public addBody (bodyMessage: string): void {
    this.body.push(bodyMessage);
    this.updateLength(bodyMessage);
  }

  public getMessage (): string {
    return this.subject + '\n\n' + this.body.join('\n').trim();
  }

  public toString (): string {
    const getPadding = (length: number): string => new Array(length + 1).join(' ');
    const line = new Array(this.maxLength).fill('─').join('');
    const top = '┌' + line + '┐';
    const middle = '├' + line + '┤';
    const bottom = '└' + line + '┘';
    const subject = '│' + this.subject + getPadding(this.maxLength - this.subject.length) + '│';
    const temp = [];
    
    let padding = true;
    this.body.reverse().forEach((message) => {
      if (message || !padding) {
        temp.push(message);
        padding = false;
      }
    });

    const body = temp
      .reverse()
      .map((message) => '│' + message + getPadding(this.maxLength - message.length) + '│')
      .join('\n');

    return [
      top,
      subject,
      middle,
      body,
      bottom
    ].join('\n');
  }
}

export const main = () => {
  const response: FlowResponseObject = new FlowResponseObject();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer () {}, // TODO: Auto complete tag (UPDATE, FIX etc..)
    prompt: '',
    tabSize: 2
  });
  let running: boolean = true;
  let subjectPassed: boolean = false;
  let nextType: inputType = null;

  const defer = new Defer();

  const flowGenerator = (function* () {
    const getFirst = () => FLOW.shift();
    let curr = getFirst();

    // Subject (Require)
    while (!(yield curr));

    // Body
    while (running) {
      yield (curr = getFirst() || curr);
    }
  })();

  const print = (message: string = '', symbol: string='?', color: string='green'): void => {
    if (message) console.log('\n' + symbol[color].bold, message);
  };

  const handler = (line: string = ''): void => {
    const { value } = flowGenerator.next(line);
    if (value['type'] === inputType.SUBJECT) {
      if (subjectPassed) {      
        print(MESSAGE.SUBJECT_REQUIRE, '!', 'yellow');
      }
      subjectPassed = true;
    }

    print(value['message']);

    switch (nextType) {
    case inputType.SUBJECT:
      response.setSubject(line);
      break;

    case inputType.BODY:
      response.addBody(line);
      break;
    }
    nextType = value['type'];
  };

  const doCommit = (): void => {
    print('Commit message preview');
    console.log(response.toString());
    rl.question('\n>'.green.bold + ' Commit? [Y/n] ', async (answer) => {
      running = false;
      rl.close();

      // TODO: Commit
      if (!answer || answer === 'Y' || answer === 'y') {
        try {
          // await command('git', ['commit', '-m', response.getMessage()]);
        } catch (e) {
          defer.reject(e['data']);
        }
      }
      defer.resolve();
    });
  };

  handler();
  rl
    .on('line', handler)
    .on('SIGINT', doCommit);

  return defer.valueOf();
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
