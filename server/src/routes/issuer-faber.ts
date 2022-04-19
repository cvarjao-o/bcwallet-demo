import express ,{Response,Request,Router} from 'express'
import axios, { AxiosResponse, CancelTokenSource } from 'axios';
import { URL } from 'url';

const route=Router()
const WALLET_NAME = false//'faber.agent.initial.438773'
const IS_MULTITENANCY_ENABLED = typeof WALLET_NAME === 'string'
const REQ_PROOF_OF_NON_REVOCATION = true

enum AIP_VERSION {
    AIP10 = '10',
    AIP20 = '20',
  }

export interface IndyProofRequestAttributeSpec {
    name: string;
    restrictions: any[];
    non_revoked?: any;
}

export interface IndyProofRequestAttributeMapSpec {
    [key: string]: IndyProofRequestAttributeSpec;
}

export interface IndyProofRequest {
    name: string;
    version: string;
    requested_attributes: IndyProofRequestAttributeMapSpec;
    requested_predicates: any;
    non_revoked?: any;
  }

function generate_credential_offer(api_version:AIP_VERSION, connection_id: string, cred_def_id: string){
    const CRED_PREVIEW_TYPE = "https://didcomm.org/issue-credential/2.0/credential-preview"
    const age = 24

    const attributes = {
        name: "Alice Smith",
        date: "2018-05-28",
        degree: "Maths",
        birthdate_dateint: "19831104",
        timestamp: Date.now().toString()
    }
    const cred_preview = {
        "@type": CRED_PREVIEW_TYPE,
        "attributes": Object.entries(attributes).reduce((accumulator: any[], currentValue)=>{
            accumulator.push({name: currentValue[0], value: currentValue[1]})
            return accumulator
        }, [])
    }
    if (api_version === AIP_VERSION.AIP20) {
        const offer_request = {
            "connection_id": connection_id,
            "comment": `Offer on cred def id ${cred_def_id}`,
            "auto_issue": true,
            "auto_remove": false,
            "credential_preview": cred_preview,
            "filter": {"indy": {"cred_def_id": cred_def_id}},
            "trace": false,
        }
        console.log('offer_request:')
        console.dir(offer_request)
        return offer_request
    }

    // Defaults to AIP 1.0
    const offer_request = {
        "connection_id": connection_id,
        "cred_def_id": cred_def_id,
        "comment": `Offer on cred def id ${cred_def_id}`,
        "auto_issue": true,
        "auto_remove": false,
        "credential_preview": cred_preview,
        "trace": false,
    }
    console.log('offer_request:')
    console.dir(offer_request)
    return offer_request
}


function createDegreeProofRequestTemplate1({non_revoked}:{non_revoked:boolean}): IndyProofRequest {
    const attributes:IndyProofRequestAttributeSpec[] = [
        {name: "name", restrictions:[{"schema_name": "degree schema"}]},
        {name: "date", restrictions:[{"schema_name": "degree schema"}]},
    ]
    if (non_revoked) {
        attributes.push({name: "degree", restrictions:[{"schema_name": "degree schema"}], "non_revoked": {"to": (Math.floor(new Date().getTime() / 1000) - 1)}})
    }else{
        attributes.push({name: "degree", restrictions:[{"schema_name": "degree schema"}]})
    }

    const proofRequest:IndyProofRequest = {
        name: 'Proof request',
        version: '1.0',
        requested_attributes: attributes.reduce((accumulator:any, currentValue) =>{
            accumulator[`0_${currentValue.name}_uuid`] = currentValue
            return accumulator;
        }, {}),
        requested_predicates: {}
    }
    if (non_revoked) {
        proofRequest.non_revoked = {"to": (Math.floor(new Date().getTime() / 1000) - 1)}
    }
    return proofRequest
}

const adminClient = axios.create({
    baseURL: 'http://localhost:8021'
})

const walletClient = axios.create({
    baseURL: 'http://localhost:8021'
})
const controllerClient = axios.create({
    baseURL: 'http://localhost:8022'
})

const cache = new Map<string, string>()
walletClient.interceptors.request.use(async (config) => {
    config.headers = config.headers || {}
    if (config.headers){
        if (IS_MULTITENANCY_ENABLED){
            const walletName = config.headers?.["x-wallet-name"] as string
            const cacheKey = `${walletName}.authToken`
            let authToken = cache.get(cacheKey)
            if (authToken===null || authToken === undefined){
                authToken = await getWalletAuthToken(walletName)
                cache.set(cacheKey, authToken);
            }
            config.headers["Authorization"] = `Bearer ${authToken}`
        }
        delete config.headers["x-wallet-name"]
    }
    return config;
})

async function getWalletAuthToken(walletName:string) {
    const resp = await adminClient.get(
        `/multitenancy/wallets?wallet_name=${walletName}`,
        {
            headers: {
                "accept": "application/json",
            },
            timeout: 10000,
        }
    );
    const walletId = resp.data.results[0].wallet_id as string;
    const resp_1 = await adminClient.post(
        `/multitenancy/wallet/${walletId}/token`,
        undefined,
        {
            headers: {
                "Content-Type": "application/json",
            },
            timeout: 10000,
        }
    );
    return resp_1.data.token as string;
}

route.post("/setup",async (req:Request,res:Response):Promise<any>=>{
    const walletID = new Date().getTime()
    const name = WALLET_NAME
    const cacheKey = `${name}.authToken`
    try{
        let wallet= undefined
        if (IS_MULTITENANCY_ENABLED){
            console.log(`Creating Wallet "${name}"`)
            wallet = await adminClient.post(
                `/multitenancy/wallet`,
                {
                    "wallet_key": `faber.agent.initial.${walletID}`,
                    "wallet_name": name,
                    "wallet_type": "indy",
                    "label": `FABER (${walletID})`,
                    "wallet_webhook_urls": "http://172.24.16.1:8000/issuer/faber/webhooks",
                    "wallet_dispatch_type": "both"
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 10000,
                }
            );
            console.dir(wallet.data)
            cache.set(cacheKey, wallet.data.token);
        }
        console.log(`Creating DID`)
        const localDid = await walletClient.post(
            `/wallet/did/create`,
            {
                "method": "sov",
                "options": {
                "key_type": "ed25519"
                }
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-wallet-name": WALLET_NAME
                },
                timeout: 10000,
            }
        )
        console.log('Local DID:')
        console.dir(localDid.data)
        const localDID = localDid.data.result.did
        console.log(`Registering DID "${localDID}"`)
        const registration = await axios.post(
            `http://test.bcovrin.vonx.io/register`,
            {
                did: localDid.data.result.did,
                verkey: localDid.data.result.verkey,
                role: "TRUST_ANCHOR"
            },
            {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 10000,
            }
        );
        console.log(`DID Registration`)
        console.dir(registration.data)

        console.log(`Assigning DID "${localDID}"`)
        const publicDid = await walletClient.post(
            `/wallet/did/public?did=${localDID}`,
            undefined,
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-wallet-name": WALLET_NAME
                },
                timeout: 10000,
            }
        );
        return res.json({wallet:wallet?.data, did: localDid.data, publicDid:publicDid.data});
    }catch (ex){
        console.dir(ex)
        res.sendStatus(500).end()
    }
})

route.post("/issuer/faber/setup",async (req:Request,res:Response):Promise<any>=>{
    console.log(`Creating 'degree schema' schema`)
    await walletClient
    .post(
    `/schemas`,
    {
        schema_name: "degree schema",
        schema_version: `83.35.${Date.now()}`,
        attributes: [
        "name",
        "date",
        "degree",
        "birthdate_dateint",
        "timestamp",
        ],
    },
    {
        headers: {
            "Content-Type": "application/json",
            "x-wallet-name": WALLET_NAME
        },
        timeout: 100000,
    }
    )
    .then(async (response) => {
        console.log(`Creating non-revocable 'degree schema' credential definition`)
        const response1 = await walletClient.post(
            `/credential-definitions`,
            {
                schema_id: response.data.schema_id,
                support_revocation: false,
                tag: "faber.agent.degree_schema.nr",
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-wallet-name": WALLET_NAME
                },
                timeout: 100000,
            }
        );
        /*
        console.log(`Creating revocable 'degree schema' credential definition`)
        const response2 = await axios.post(
            `/credential-definitions`,
            {
                schema_id: response.data.schema_id,
                support_revocation: true,
                revocation_registry_size: 100,
                tag: "faber.agent.degree_schema.r",
            },
            {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 100000,
            }
        );
        */
        return [response1.data];
    })

    .then((response) => {
        console.dir(response);
        res.json(response);
    })
})
route.get("/issuer/faber/connections",async (req:Request,res:Response):Promise<any>=>{
    try {
        await walletClient
        .get('/connections', {
        headers: {
            'Content-Type': 'application/json',
            "x-wallet-name": WALLET_NAME
        },
        timeout: 10000,
        })
        .then((response) => {
            res.json(response.data);
        })
    } catch (ex){
        console.dir(ex)
        res.sendStatus(500).end()
    }
})

route.get("/issuer/faber/connections/:connectionId",async (req:Request,res:Response):Promise<any>=>{
    try {
        await walletClient
        .get(`/connections/${req.params.connectionId}`, {
        headers: {
            'Content-Type': 'application/json',
            "x-wallet-name": WALLET_NAME
        },
        timeout: 10000,
        })
        .then((response) => {
            res.json(response.data);
        })
    } catch (ex){
        console.dir(ex)
        res.sendStatus(500).end()
    }
})

route.get("/issuer/faber/schemas/created",async (req:Request,res:Response):Promise<any>=>{
    try {
        await walletClient
        .get('/schemas/created', {
        headers: {
            'Content-Type': 'application/json',
            "x-wallet-name": WALLET_NAME
        },
        timeout: 10000,
        })
        .then((response) => {
            res.json(response.data);
        })
    } catch (ex){
        console.dir(ex)
        res.sendStatus(500).end()
    }
})

route.get("/issuer/faber/schemas/:schemaId",async (req:Request,res:Response):Promise<any>=>{
    try {
        await walletClient
        .get(`/schemas/${req.params.schemaId}`, {
        headers: {
            'Content-Type': 'application/json',
            "x-wallet-name": WALLET_NAME
        },
        timeout: 10000,
        })
        .then((response) => {
            res.json(response.data);
        })
    } catch (ex){
        console.dir(ex)
        res.sendStatus(500).end()
    }
})

route.post("/issuer/faber/connections/create-invitation",async (req:Request,res:Response):Promise<any>=>{
    walletClient
    .post('/connections/create-invitation', undefined, {
      headers: {
        'Content-Type': 'application/json',
        "x-wallet-name": WALLET_NAME
      },
      timeout: 10000,
    })
    .then((response) => {
        res.json(response.data);
    })
})
route.post("/issuer/faber/present-proof/create-request",async (req:Request,res:Response):Promise<any>=>{
    const connection_id:(string | undefined) = req.query.connection_id as string
    const schema_name = req.query.schema_name as string
    const non_revoked =  req.query.non_revoked === 'true'? true: false
    console.log(`Requesting proof of '${schema_name}' from '${connection_id}'`)
    const proof_request = createDegreeProofRequestTemplate1({non_revoked})
    const payload:any={
        proof_request,
        trace: false
    }
    if (connection_id){
        payload.connection_id=connection_id
    }
    console.dir(payload)
    await walletClient
    .post(`/present-proof/create-request`
      , payload
      , {
      headers: {
        'Content-Type': 'application/json',
        "x-wallet-name": WALLET_NAME
      },
      timeout: 10000,
    })
    .then((response) => {
        console.dir(response.data);
        res.json(response.data);
    })
})
route.post("/issuer/faber/present-proof/send-request",async (req:Request,res:Response):Promise<any>=>{
    const connection_id:(string | undefined) = req.query.connection_id as string
    const schema_name = req.query.schema_name as string
    const non_revoked =  req.query.non_revoked === 'true'? true: false
    console.log(`Requesting proof of '${schema_name}' from '${connection_id}'`)
    const proof_request = createDegreeProofRequestTemplate1({non_revoked})
    const payload:any={
        proof_request,
        trace: false
    }
    if (connection_id){
        payload.connection_id=connection_id
    }
    console.dir(payload)
    await walletClient
    .post(`/present-proof/send-request`
      , payload
      , {
      headers: {
        'Content-Type': 'application/json',
        "x-wallet-name": WALLET_NAME
      },
      timeout: 10000,
    })
    .then((response) => {
        console.dir(response.data);
        res.json(response.data);
    })
})

route.get("/issuer/faber/present-proof/records",async (req:Request,res:Response):Promise<any>=>{
    const connection_id = req.query.connection_id as string
    console.log(`Presentation Proofs requested from '${connection_id}'`)
    await walletClient
    .get(`/present-proof/records?connection_id=${connection_id}`
      , {
      headers: {
        'Content-Type': 'application/json',
        "x-wallet-name": WALLET_NAME
      },
      timeout: 10000,
    })
    .then((response) => {
        console.dir(response.data);
        res.json(response.data);
    })
})

route.post("/issuer/faber/issue-credential/send-offer/2.0",async (req:Request,res:Response):Promise<any>=>{
    console.log(`request.url: ${req.url}`)
    let credential_definition_id = req.query.credential_definition_id as string
    const schema_name = req.query.schema_name as string
    const connection_id = req.query.connection_id as string
    
    if (!credential_definition_id){
        await walletClient
        .get(`/credential-definitions/created?${new URLSearchParams({schema_name:schema_name}).toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            "x-wallet-name": WALLET_NAME
          },
          timeout: 10000,
        })
        .then((response) => {
            credential_definition_id=response.data.credential_definition_ids[0] as string
        })
    }
    console.log(`Sending '${credential_definition_id}' credentinal to '${connection_id}'`)
    return walletClient
    .post(`/issue-credential-2.0/send-offer`
    , generate_credential_offer(AIP_VERSION.AIP20, connection_id, credential_definition_id)
    , {
    headers: {
        'Content-Type': 'application/json',
        "x-wallet-name": WALLET_NAME
    },
    timeout: 10000,
    })
    .then((response) => {
        console.dir(response.data);
        res.json(response.data);
    })
})
route.get("/issuer/faber/issue-credential/records/:cred_ex_id",async (req:Request,res:Response):Promise<any>=>{
    try {
        await walletClient
        .get(`/issue-credential/records/${req.params.cred_ex_id}`, {
        headers: {
            'Content-Type': 'application/json',
            "x-wallet-name": WALLET_NAME
        },
        timeout: 10000,
        })
        .then((response) => {
            res.json(response.data);
        })
    } catch (ex){
        console.dir(ex)
        res.sendStatus(500).end()
    }
})

route.post("/issuer/faber/issue-credential/send-offer",async (req:Request,res:Response):Promise<any>=>{
    console.log(`request.url: ${req.url}`)
    let credential_definition_id = req.query.credential_definition_id as string
    const schema_name = req.query.schema_name as string
    const connection_id = req.query.connection_id as string
    
    if (!credential_definition_id){
        await walletClient
        .get(`/credential-definitions/created?${new URLSearchParams({schema_name:schema_name}).toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            "x-wallet-name": WALLET_NAME
          },
          timeout: 10000,
        })
        .then((response) => {
            credential_definition_id=response.data.credential_definition_ids[0] as string
        })
    }
    console.log(`Sending '${credential_definition_id}' credentinal to '${connection_id}'`)
    return walletClient
    .post(`/issue-credential/send-offer`
    , generate_credential_offer(AIP_VERSION.AIP10, connection_id, credential_definition_id)
    , {
    headers: {
        'Content-Type': 'application/json',
        "x-wallet-name": WALLET_NAME
    },
    timeout: 10000,
    })
    .then((response) => {
        console.dir(response.data);
        res.json(response.data);
    })
})

route.post("/issuer/faber/webhooks/topic/present_proof/",async (req:Request,res:Response):Promise<any>=>{
    console.log(`request.url: ${req.url}`)
    console.dir(req.body.presentation_exchange_id)
    const presentation_exchange_id = req.body.presentation_exchange_id as string
    console.dir(req.body)
    if (req.body.state === "presentation_received") {
        return walletClient
        .post(`/present-proof/records/${presentation_exchange_id}/verify-presentation`
        , undefined
        , {
        headers: {
            'Content-Type': 'application/json',
            "x-wallet-name": WALLET_NAME
        },
        timeout: 10000,
        })
        .then((response) => {
            console.dir(response.data);
            res.json(response.data);
        })
    } else if (req.body.state === "request_sent" || req.body.state === "verified") {
        res.sendStatus(200).end()
        return
    }
    res.sendStatus(404).end()
});
route.get("/issuer/faber/credential-definitions",async (req:Request,res:Response):Promise<any>=>{
    await walletClient
    .get(`/credential-definitions/created?`, {
      headers: {
        'Content-Type': 'application/json',
        "x-wallet-name": WALLET_NAME
      },
      timeout: 10000,
    })
    .then((response) => {
        const definitions: any[] = []
        for (const credential_definition_id of response.data.credential_definition_ids) {
            definitions.push(credential_definition_id)
        }
        res.json(definitions);
    })
});

route.post("/issuer/faber/webhooks/topic/issue_credential/",async (req:Request,res:Response):Promise<any>=>{
    console.log(`request.url: ${req.url}`)
    console.log(`response.statusCode: 200`)
    console.dir(req.body)
    // if (req.body.state === 'offer_sent') { }
    res.sendStatus(200).end()
});

route.post("/issuer/faber/webhooks/topic/connections/?",async (req:Request,res:Response):Promise<any>=>{
    console.log(`request.url: ${req.url}`)
    console.log(`response.statusCode: 200`)
    res.sendStatus(200).end()
});

route.post("/issuer/faber/revocation/revoke",async (req:Request,res:Response):Promise<any>=>{
    console.log(`request.url: ${req.url}`)
    console.dir(req.body)
    await walletClient
    .post(`/revocation/revoke`
      , req.body
      , {
      headers: {
        'Content-Type': 'application/json',
        "x-wallet-name": WALLET_NAME
      },
      timeout: 10000,
    })
    .then((response) => {
        console.log(`response.status: ${response.status}`)
        console.dir(response.data);
        res.json(response.data);
    })
    .catch((ex)=>{
        console.dir(ex)
        res.sendStatus(500).end()
    })
})

route.get("/issuer/faber/webhooks",async (req:Request,res:Response):Promise<any>=>{
    console.log(`request.url: ${req.url}`)
    console.log(`request.baseUrl: ${req.baseUrl}`)
    console.log(`response.statusCode: 200`)
    const controllerUrl = req.url.substring('/issuer/faber'.length)
    console.log(`controllerUrl: ${controllerUrl}`)
    //res.sendStatus(500).end()
    //return;
    await controllerClient
    .get(controllerUrl
      , {
      timeout: 10000
    })
    .then((response) => {
        console.log(`response.status: ${response.status}`)
        console.dir(response.data);
        res.json(response.data);
    })
    .catch((ex)=>{
        console.dir(ex)
        res.sendStatus(500).end()
    })
})

route.get("/issuer/faber/webhooks/pres_req/:cred_ex_id/",async (req:Request,res:Response):Promise<any>=>{
    console.log(`request.url: ${req.url}`)
    console.log(`response.statusCode: 200`)
    await controllerClient
    .get(`/webhooks/pres_req/${req.params.cred_ex_id}/`
      , {
      timeout: 10000,
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status <= 302; // default
      },
    })
    .then((response) => {
        console.log(`response.status: ${response.status}`)
        const redirectToUrl = new URL(response.headers.location)
        redirectToUrl.host = '192.168.1.70:8000'
        redirectToUrl.pathname = '/issuer/faber'+ redirectToUrl.pathname
        console.dir(redirectToUrl.toString());
        //res.json(response.data);
        //res.sendStatus(500).end()
        res.writeHead(302, {location:redirectToUrl.toString()})
        res.end()
    })
    .catch((ex)=>{
        console.dir(ex)
        res.sendStatus(500).end()
    })
});

export default route
