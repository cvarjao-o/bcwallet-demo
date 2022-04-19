import path from 'path';
import type { Arguments, CommandBuilder } from 'yargs';
import { Agent } from '../agent';

type Options = {
  source: string;
  wallet: string | undefined;
};

export const command: string = 'setup <source>';
export const desc: string = 'setup <name> with Hello';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
  yargs
  .options({
    wallet: { type: 'string' },
  })
  .positional('source', { type: 'string', demandOption: true});

export const handler = async (argv: Arguments<Options>): Promise<void> => {
  const { source, wallet } = argv;
  const sourcePath = path.resolve(process.cwd(), source)
  const spec = require(sourcePath)
  const agent = new Agent(wallet)
  await agent.initialize()

  //process.stdout.write(JSON.stringify(spec));
  process.exit(0);
};