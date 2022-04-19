# Usage

```
npx tsc && node .\lib\cli.js list connection --wallet=faber
npx tsc && node .\lib\cli.js create connection --wallet=faber
npx tsc && node .\lib\cli.js create connection --file=:android_emulator --wallet=faber
npx tsc && node .\lib\cli.js create credential_offer --wallet=faber --source=examples/faber.js :last: non_revocable_degree_cred_def
npx tsc && node .\lib\cli.js create proof_request --wallet=faber --source=examples/faber.js :last: simple_proof_request2
```