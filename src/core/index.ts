import readline from 'readline';
import { spawn } from 'child_process';
import { FlowData, CommitMessage, CommandResponse } from '../interface';
import { inputType } from '../enum';
import 'colors';

const MESSAGE = {
  'SUBJECT_REQUIRE': 'Subject is required.',
  'PREVIEW': 'Commit message preview',
  'EMPTY': '(Empty)',
  'CONFIRM': 'Commit? [Y/n]',
  'DONE': 'Done!',
  'CANCELED': 'Canceled!',
  'ERROR': 'ERROR!'
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


/**
 * Waiting for Async task
 */
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

/**
 * Commit flow response data object
 */
class FlowResponseObject {
  private subject: string = null;
  private body: Array<string> = [];
  private maxLength: number = 0;
  public isCommitable: boolean = false;

  private updateLength (str: string): void {
    const len = this.getLength(str);
    if (this.maxLength < len) {
      this.maxLength = len;
    }
  }

  private getLength (str: string): number {
    let len = 0;
    for (let i = 0; i < str.length; ++i, ++len) {
      // Multibyte character length checking
      if (escape(str.charAt(i)).length === 6) {
        ++len;
      }
    }
    return len;
  }

  public setSubject (subject: string): void {
    this.isCommitable = true;
    this.subject = subject.trim();
    this.updateLength(this.subject);
  }

  public addBody (bodyMessage: string): void {
    const message = bodyMessage.trim();
    this.body.push(message);
    this.updateLength(message);
  }

  public getMessage (): CommitMessage {
    return {
      subject: this.subject,
      body: this.body.join('\n').trim()
    };
  }

  public toString (): string {
    const temp: Array<string> = [];
    let padding = true;
    this.body.reverse().forEach((message) => {
      if (message || !padding) {
        temp.push(message);
        padding = false;
      }
    });

    const maxLength = temp.length ? this.maxLength : Math.max(7, this.maxLength);
    const getPadding = (length: number): string => new Array(Math.max(length + 1, 0)).join(' ');
    const line = new Array(maxLength).fill('─').join('');
    const top = '┌' + line + '┐';
    const middle = '├' + line + '┤';
    const bottom = '└' + line + '┘';
    const subject = '│' + this.subject + getPadding(
      maxLength - this.getLength(this.subject)
    ) + '│';

    const isEmpty = !temp.length;
    const body = (isEmpty ? [MESSAGE.EMPTY['gray']] : temp.reverse())
      .map((message) => {
        return '│' +
          message +
          getPadding(
            isEmpty ?
              (maxLength - message.length + 10) :// ANSI Color code (EX: \u001b90m)
              (maxLength - this.getLength(message))
          ) +
          '│';
      })
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

  // Print message & input handing
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

  // Execute commit command
  const doCommit = (): void => {
    if (running && response.isCommitable) {
      print(MESSAGE.PREVIEW);
      console.log(response.toString());
    } else {
      console.log(MESSAGE.CANCELED['yellow']);
      rl.close();
      return;
    }

    rl.question('\n>'['green'].bold + ' ' + MESSAGE.CONFIRM, async (answer) => {
      rl.close();
      if (!answer || answer === 'Y' || answer === 'y') {
        try {
          const { subject, body } = response.getMessage();
          await command('git', ['commit', '-m', subject, ...(body ? ['-m', body] : [])]);
          console.log(MESSAGE.DONE['green']);
        } catch (e) {
          console.log(MESSAGE.ERROR['red']);
          defer.reject(e['data']);
        }
      }
      defer.resolve();
    });

    running = false;
  };

  // Readline (User input)
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
