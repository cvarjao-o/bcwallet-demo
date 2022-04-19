import path from 'path';
import { Agent } from '../../agent';
import QRCode, { QRCodeToStringOptions } from 'qrcode'
import type { Arguments, CommandBuilder } from 'yargs';
type Options = {
  file: string | undefined;
  wallet: string;
};

export const command: string = 'connection [alias]';
export const desc: string = 'Generate Invitation Code';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
  yargs
  .options({
    wallet: { type: 'string', demandOption: true },
    file: { type: 'string', demandOption: false },
  })

  export const handler = async (argv: Arguments<Options>): Promise<void> => {
    const { wallet, file } = argv;
    const agent = new Agent(wallet)
    await agent.initialize()
    const invitation = await agent.createInvitation()
    if (file === undefined || file === ':terminal') {
      QRCode.toString(invitation.invitation_url,{type:'terminal', small: true} as unknown as QRCodeToStringOptions,  (err, QRcode) => {
        if(err) return console.log("error occurred")
        process.stdout.write(JSON.stringify(invitation));
        process.stdout.write(QRcode)
        process.exit(0);
      })  
    } else if (file === ':android_emulator') {
      if (!process.env.ANDROID_SDK_ROOT) {
        return console.log("Missing ANDROID_SDK_ROOT environment variable")
      }
      await QRCode.toFile(path.resolve(process.env.ANDROID_SDK_ROOT, 'emulator/resources/custom.png'),  invitation.invitation_url, {scale: 8})
      process.stdout.write(JSON.stringify(invitation));
      process.stdout.write('\n')
      process.stdout.write('QR Code saved to $ANDROID_SDK_ROOT/emulator/resources/custom.png\n')
      process.stdout.write(`ANDROID_SDK_ROOT=${process.env.ANDROID_SDK_ROOT}\n`)
      process.exit(0);
    }    
  };
