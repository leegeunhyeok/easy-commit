import inquirer from 'inquirer';
import { spawn } from 'child_process';
import { CommandResponse } from '../interface';
import { inputType } from '../enum';

export const main = async () => {
  const res = await inquirer.prompt([
    {
      name: inputType.SUBJECT,
      message: 'Commit message subject'
    },
    {
      name: inputType.BODY,
      message: 'Commit message body',
      type: 'editor'
    }
  ]);

  const subject = res[inputType.SUBJECT];
  const body = res[inputType.BODY];
  const commitMessage = subject + (body ? '\n\n' + body : '');

  const confirm = await inquirer.prompt([
    {
      name: inputType.CONFIRM,
      message: `Commit message preview\n${commitMessage}\nConfirm?`,
      type: 'confirm'
    }
  ]);

  if (confirm[inputType.CONFIRM]) {
    process.exit(0);
  } else {
    // TODO: Write commit message as file
  }
};

/**
 * @param cmd Command
 * @param args Arguments array
 * @return Command execute result
 */
export const command = (cmd: string, args: Array<string>): Promise<CommandResponse> => {
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
