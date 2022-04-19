# bcwallet-demo
## Overview
1. Clean up (optional)
```
docker ps -q | xargs docker kill
```

1. Start ngrok
```
ngrok http 8020
```

1. Start aca-py

MUST listen on localhost:8020 and localhost:2021
```
export WEBOOK_URL="http://$(grep -m 1 nameserver /etc/resolv.conf | awk '{print $2}'):8000/issuer/faber/webhooks"

export PUBLIC_TAILS_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '[.tunnels[] | select(.proto == "https")][0].public_url')

docker run -p 8020:8020 -p 8021:8021 -p 8023:8023 bcgovimages/aries-cloudagent:py36-1.16-1_0.7.3 start --endpoint $PUBLIC_TAILS_URL --label faber.agent --auto-ping-connection --auto-respond-messages --inbound-transport http 0.0.0.0 8020 --outbound-transport http --admin 0.0.0.0 8021 --admin-insecure-mode --wallet-type indy --wallet-name faber.agent910152 --wallet-key faber.agent910152 --preserve-exchange-records --auto-provision --public-invites --genesis-url "http://test.bcovrin.vonx.io/genesis"  --seed d_000000000000000000000000910152 --webhook-url "$WEBOOK_URL" --monitor-revocation-notification --trace-target log --trace-tag acapy.events --trace-label faber.agent.trace --auto-accept-invites --auto-accept-requests --auto-store-credential
```

1. Start server

MUST listen on localhost:8000
```
cd server && npm start
```

1. Start client
```
cd client && npm start
```

1. Setup use cases (e.g.: Schemas, Credential Definitions)
```
```

1. Start emulator
```
emulator -avd Pixel_4_API_30_-_gplay4demo -feature WindowsHypervisorPlatform -gpu host
```

1. Start appium
1. Run tests
```
cd test
npx wdio run test/wdio.conf.ts
```