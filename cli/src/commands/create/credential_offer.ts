import path from 'path';
import type { Arguments, CommandBuilder } from 'yargs';
import { Agent } from '../../agent';
type Options = {
  connection: string;
  name: string;
  wallet: string;
  source: string;
};

export const command: string = 'credential_offer <connection> <name>';
export const desc: string = 'Generate Invitation Code';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
  yargs
  .options({
    wallet: { type: 'string', demandOption: true },
    source: { type: 'string', demandOption: true },
  })
  .positional('connection', { type: 'string', demandOption: true, description: "Connection alias or id"})
  .positional('name', { type: 'string', demandOption: true})

  export const handler = async (argv: Arguments<Options>): Promise<void> => {
    const { source, wallet, connection, name } = argv;
    const agent = new Agent(wallet)
    await agent.initialize()
    const sourcePath = path.resolve(process.cwd(), source)
    const spec = require(sourcePath)
    const credDef = spec.credential_definitions[name]
    await agent.sendOffer({connection_id: connection, schema_name: credDef.schema.name})
  };