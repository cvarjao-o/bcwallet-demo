import type { Arguments, CommandBuilder } from 'yargs';
import { Agent } from '../agent';
import QRCode, { QRCodeToStringOptions } from 'qrcode'
type Options = {
  file: string | undefined;
  wallet: string;
};

export const command: string = 'invitation';
export const desc: string = 'Generate Invitation Code';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
  yargs
  .options({
    wallet: { type: 'string', demandOption: true },
  })

export const handler = async (argv: Arguments<Options>): Promise<void> => {
  const { wallet } = argv;
  const agent = new Agent(wallet)
  await agent.initialize()
  const invitation = await agent.createInvitation()
  QRCode.toString(invitation.invitation_url,{type:'terminal', small: true} as unknown as QRCodeToStringOptions,  (err, QRcode) => {
    if(err) return console.log("error occurred")
    process.stdout.write(JSON.stringify(invitation));
    process.stdout.write('\n')
    process.stdout.write(QRcode)
    process.exit(0);
  })
  
};