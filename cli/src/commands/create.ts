import type { Arguments, CommandBuilder } from 'yargs';
import { Agent } from '../agent';
import QRCode, { QRCodeToStringOptions } from 'qrcode'
type Options = {
  type: string;
};

export const command: string = 'create <type>';
export const desc: string = 'Generate Invitation Code';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
  yargs
  .commandDir('create')

export const handler = async (argv: Arguments<Options>): Promise<void> => {

};