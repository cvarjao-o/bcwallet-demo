
import axios, { AxiosResponse, CancelTokenSource,  AxiosInstance} from 'axios';

const cache = new Map<string, string>()
enum AIP_VERSION {
    AIP10 = '10',
    AIP20 = '20',
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
        //console.log('offer_request:')
        //console.dir(offer_request)
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
    //console.log('offer_request:')
    //console.dir(offer_request)
    return offer_request
}

function createDegreeProofRequestTemplate1(options:{requested_attributes:any[]}): any {
    const proofRequest: any = Object.assign({
        name: 'Proof request',
        version: '1.0',
        requested_predicates: {}
    }, options)
    return proofRequest
}

export class Agent {
    adminClient!: AxiosInstance;
    walletClient!: AxiosInstance;
    walletName?: string;
    authToken?: string;
    schemas: any[]= [];
    credential_definitions: any[] = [];
    constructor(wallet?:string) {
        this.walletName = wallet
    }
    async getWalletAuthToken(walletName:string) {
        //console.dir(`Wallet Name: ${walletName}`)
        const resp = await this.adminClient.get(
            `/multitenancy/wallets?wallet_name=${walletName}`,
            {
                headers: {
                    "accept": "application/json",
                },
                timeout: 10000,
            }
        );
        //console.dir(resp.data)
        const walletId = resp.data.results[0].wallet_id as string;
        //console.dir(`Wallet Id: ${walletId}`)
        const resp_1 = await this.adminClient.post(
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
    async getAuthToken() {
        if (!this.authToken && this.walletName){
            this.authToken =  await this.getWalletAuthToken(this.walletName)
        }
        return this.authToken
    }
    async initialize() {
        this.adminClient = axios.create({
            baseURL: 'http://localhost:8021'
        })
        this.walletClient = axios.create({
            baseURL: 'http://localhost:8021'
        })
        this.walletClient.interceptors.request.use(async (config) => {
            config.headers = config.headers || {}
            if (config.headers){
                const authToken = await this.getAuthToken()
                //const walletName = config.headers?.["x-wallet-name"] as string
                if (authToken){
                    //const walletName = config.headers?.["x-wallet-name"] as string
                    config.headers["Authorization"] = `Bearer ${authToken}`
                }
                delete config.headers["x-wallet-name"]
            }
            return config;
        })
        const wallets: any[] = (await this.adminClient.get('/multitenancy/wallets', {headers:{accept:'application/json'}})).data.results
        //console.dir(wallets)
        for (const wallet of wallets) {
            if (wallet.wallet_id === this.walletName || wallet.settings['wallet.name'].startsWith(this.walletName)){
                this.walletName = wallet.settings['wallet.name']
                break;
            }
        }
        const schema_ids: string[] = (await this.walletClient.get('/schemas/created', {headers:{accept:'application/json'}})).data.schema_ids
        for (const schema_id of schema_ids) {
            const schema = (await this.walletClient.get(`/schemas/${schema_id}`, {headers:{accept:'application/json'}})).data.schema
            this.schemas.push(schema)
        }
        const credential_definition_ids: string[] = (await this.walletClient.get('/credential-definitions/created', {headers:{accept:'application/json'}})).data.credential_definition_ids
        for (const credential_definition_id of credential_definition_ids) {
            const schema = (await this.walletClient.get(`/credential-definitions/${credential_definition_id}`, {headers:{accept:'application/json'}})).data.credential_definition
            this.credential_definitions.push(schema)
        }
        //console.dir(this.schemas)
        //console.dir(this.credential_definitions)
    }
    async createInvitation(options?:any) {
        return this.walletClient
        .post('/connections/create-invitation', options, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
          params:{alias: "MyAlias2", auto_accept: true}
        })
        .then((response) => {
            return response.data;
        })
    }
    async listConnections() {
        return this.walletClient
        .get('/connections', {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        })
        .then(async (response) => {
            const connections: any[] = []
            for (const connection of response.data.results) {
                const connectionDetails = (await this.walletClient
                .get(`/connections/${connection.connection_id}`, {
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  timeout: 10000,
                })).data
                connections.push(connectionDetails)
            }
            return connections.sort((x, y) => {
                const date1 = new Date(x.created_at).getTime();
                const date2 = new Date(y.created_at).getTime();
                return date1 - date2 ;
            });
        })
    }
    async resolveConnection(connection:string){
        if (connection === ':last:') {
            const sorted = (await this.listConnections())
            return sorted[sorted.length - 1].connection_id
        }
        return connection
    }
    async sendOffer({schema_name, connection_id}: {schema_name: string, connection_id: string}) {
        const credential_definition_id = await this.walletClient
        .get(`/credential-definitions/created?${new URLSearchParams({schema_name:schema_name}).toString()}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        })
        .then((response) => {
            return response.data.credential_definition_ids[0] as string
        })
        const _connection_id = await this.resolveConnection(connection_id)
        //console.log(`Sending '${credential_definition_id}' credentinal to '${_connection_id}'`)
        return this.walletClient
        .post(`/issue-credential/send-offer`
        , generate_credential_offer(AIP_VERSION.AIP10, _connection_id, credential_definition_id)
        , {
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: 10000,
        })
        .then((response) => {
            return response.data
        })
    }
    async sendProofRequest ({connection_id, proof_request:template_proof_request}: {connection_id: string, proof_request: any}) {
        //console.log(`Requesting proof from '${connection_id}'`)
        const proof_request = createDegreeProofRequestTemplate1(template_proof_request)
        const payload:any={
            proof_request,
            trace: false
        }
        if (connection_id){
            payload.connection_id=await this.resolveConnection(connection_id)
        }
        //console.dir(payload)
        return await this.walletClient
        .post(`/present-proof/send-request`
          , payload
          , {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        })
        .then((response) => {
            return response.data
        })
    }
}