import type { Arguments, CommandBuilder } from "yargs";
import util from "util";
import * as controller from "server";
import {
  ChildProcess,
  spawn,
  SpawnOptions,
  SpawnOptionsWithoutStdio,
  SpawnOptionsWithStdioTuple,
  StdioNull,
  StdioOptions,
  StdioPipe,
} from "child_process";

type Options = {
  revocation: boolean;
  basic: boolean;
};
type CancellableSignal = {
  signal: Promise<any>;
  cancel: () => void;
};

function createCancellableSignal() {
  const ret: CancellableSignal = {} as unknown as CancellableSignal;
  ret.signal = new Promise((resolve, reject) => {
    ret.cancel = () => {
      reject(new Error("Promise was cancelled"));
    };
  });
  return ret;
}

class CancellablePromise<T> extends Promise<T> {
  constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ) => void
  ) {
    super(executor);
  }
}

class ProcessReadinessCheck {
   constructor(){

   }
}

function spawnSync(
  command: string,
  args: ReadonlyArray<string>,
  options: SpawnOptions,
  lineProcessor?: (source: string, line: Buffer, ready:  (value: any) => void) => void
) {
  const proc = spawn(command, args, options);
  let  ready_callback:  (value: any) => void
  const readinessCheck = new Promise<any>((resolve)=>{
    ready_callback = resolve
  })
  const executor = new CancellablePromise((resolve, reject) => {
    let stdoutBuffer: Buffer = Buffer.alloc(0);
    proc.stdout?.on("data", (data: Buffer) => {
      if (lineProcessor) {
        stdoutBuffer = Buffer.concat([stdoutBuffer, data]);
        let eol = stdoutBuffer.indexOf(10);
        while (eol > 0) {
          const bufferLine = stdoutBuffer.slice(0, eol);
          lineProcessor("stdout", bufferLine, ready_callback);
          //const bufferString = bufferLine.toString('utf-8')
          //console.log(`bufferLine={{${bufferString}}}`)
          stdoutBuffer = stdoutBuffer.slice(eol + 1);
          eol = stdoutBuffer.indexOf(10);
        }
      }
      process.stdout.write(data);
    });
    proc.stderr?.on("data", (data) => {
      process.stderr.write(data);
    });
    proc.on("close", (code) => {
      console.log(`Ending processs ${args.join(' ')}`)
      resolve({ code });
    });
  })
  return {executor, readinessCheck};
}

export const command: string = "start";
export const desc: string = "start";

export const builder: CommandBuilder<Options, Options> = (yargs) =>
  yargs.options({
    revocation: { type: "boolean", default: false },
    basic: { type: "boolean", default: false },
  });
export const handler = async (argv: Arguments<Options>): Promise<void> => {
  const { basic } = argv;
  const { spawnSync: _spawnSync } = require("child_process");
  //const spawnSync = util.promisify(require('child_process').spawn)
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const stdio: StdioOptions = ["ignore", process.stdout, process.stderr];
  // for clean builds
  /*
  docker system prune
  docker builder prune -a
  docker system prune -a -f
  */
  _spawnSync(
    "wsl",
    [
      "git",
      "clone",
      "https://github.com/hyperledger/aries-cloudagent-python.git",
      "~/.aries-cloudagent-python",
    ],
    { stdio }
  );
  _spawnSync("wsl", ["git", "checkout", "tags/0.7.3", "-B", "v0.7.3"], {
    stdio,
    env: { PWD: "~/.aries-cloudagent-python", WSLENV: "PWD/u" },
  });
  _spawnSync("wsl", ["git", "branch", "-avv"], {
    stdio,
    env: { PWD: "~/.aries-cloudagent-python", WSLENV: "PWD/u" },
  });
  _spawnSync("wsl", ["env"], {
    stdio,
    env: { PWD: "~/.aries-cloudagent-python", WSLENV: "PWD/u" },
  });

  const procs: Promise<any>[] = [];
  const ngrokBackend = spawnSync("wsl", ["ngrok", "http", "8020", "--log=stdout"], {
    stdio: ["ignore", "pipe", "pipe"],
  }, (source, buffer, ready)=>{
    const line:string = buffer.toString('utf-8')
    const ngrok_prefix = 'msg="started tunnel" obj=tunnels name="command_line (http)" addr=http://localhost:8020 url='
    const index = line.indexOf(ngrok_prefix)
    if (index >0){
      ready({addr:line.substring(index + ngrok_prefix.length )})
    }
  })
  const ngrokApi = spawnSync("wsl", ["ngrok", "http", "8021", "--log=stdout"], {
    stdio: ["ignore", "pipe", "pipe"],
  }, (source, buffer, ready)=>{
    const line:string = buffer.toString('utf-8')
    const ngrok_prefix = 'msg="started tunnel" obj=tunnels name="command_line (http)" addr=http://localhost:8021 url='
    const index = line.indexOf(ngrok_prefix)
    if (index >0){
      ready({addr:line.substring(index + ngrok_prefix.length )})
    }
  })
  const ngrokBackendPublicUrl = (await ngrokBackend.readinessCheck).addr as string
  const ngrokApiPublicUrl = (await ngrokApi.readinessCheck).addr as string
  console.log(`ngrokBackendPublicUrl=${ngrokBackendPublicUrl}`)
  console.log(`ngrokApiPublicUrl=${ngrokApiPublicUrl}`)
  procs.push(ngrokBackend.executor);
  procs.push(ngrokApi.executor);
  //await Promise.all(procs);
  await sleep(5000);
  if (basic === true) {
    procs.push(
      spawnSync(
        "wsl",
        [
          "~/.aries-cloudagent-python/demo/run_demo",
          "faber",
          "--aip",
          "10",
          "--events",
          "--multitenant",
        ],
        {
          stdio,
          env: {
            LEDGER_URL: "http://test.bcovrin.vonx.io",
            WSLENV: "LEDGER_URL/u",
          },
        }
      ).executor
    );
  } else {
    const serverInfo = await controller.start({ ngrok: true });
    function shutDown() {
      console.log("Received kill signal, shutting down gracefully");
      serverInfo.server.close(() => {
        console.log("Closed out remaining connections");
      });
    }
    process.on("SIGINT", shutDown);
    process.on("SIGBREAK", shutDown);
    const cmd: readonly string[] = [
      "docker",
      "run",
      "-p",
      "8020:8020",
      "-p",
      "8021:8021",
      "-p",
      "8023:8023",
      "bcgovimages/aries-cloudagent:py36-1.16-1_0.7.3",
      "start",
      "--endpoint",
      `${ngrokBackendPublicUrl}`,
      "--label",
      "faber.agent",
      "--auto-ping-connection",
      "--auto-respond-messages",
      "--inbound-transport",
      "http",
      "0.0.0.0",
      "8020",
      "--outbound-transport",
      "http",
      "--admin",
      "0.0.0.0",
      "8021",
      "--admin-insecure-mode",
      "--wallet-type",
      "indy",
      "--wallet-name",
      "faber.agent910152",
      "--wallet-key",
      "faber.agent910152",
      "--preserve-exchange-records",
      "--auto-provision",
      "--public-invites",
      "--genesis-url",
      "http://test.bcovrin.vonx.io/genesis",
      "--seed",
      "d_000000000000000000000000910152",
      "--webhook-url",
      `${serverInfo.public_url}/issuer/faber/webhooks`,
      "--monitor-revocation-notification",
      "--trace-target",
      "log",
      "--trace-tag",
      "acapy.events",
      "--trace-label",
      "faber.agent.trace",
      "--auto-accept-invites",
      "--auto-accept-requests",
      "--auto-store-credential",
      "--multitenant",
      "--multitenant-admin",
      "--jwt-secret",
      "SuperSecret!",
    ];
    procs.push(spawnSync('wsl', [...cmd], { stdio }).executor)
  }

  await Promise.all(procs);
};
