import path from 'path';
import type { Arguments, CommandBuilder } from 'yargs';
import { Agent } from '../../agent';
type Options = {
  wallet: string;
  name: string;
  connection: string;
  source: string;
};

export const command: string = 'proof_request <connection> <name>';
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
    const proof_request = spec.proof_requests[name]
    const response = await agent.sendProofRequest({connection_id: connection, proof_request})
    //process.stdout.write(JSON.stringify(response));
    console.dir(response, {depth:99})
  };