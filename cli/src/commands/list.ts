import type { Arguments, CommandBuilder } from 'yargs';
import { Agent } from '../agent';
import QRCode, { QRCodeToStringOptions } from 'qrcode'
type Options = {
  wallet?: string;
  type: string;
};

export const command: string = 'list <type>';
export const desc: string = 'List Connections';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
  yargs
  .options({
    wallet: { type: 'string', demandOption: true },
  })
  .positional('type', { type: 'string', demandOption: true});

export const handler = async (argv: Arguments<Options>): Promise<void> => {
  const { wallet, type: object_type } = argv;
  const agent = new Agent(wallet)
  await agent.initialize()
  //console.log(`object_type = ${object_type}`)
  if (object_type === 'connection') {
    const connections = await agent.listConnections()
    console.dir(connections)
    //console.log(`${connections.length}`)
  }
  //process.stdout.write(JSON.stringify(invitation));
};