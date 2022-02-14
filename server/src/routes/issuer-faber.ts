import express ,{Response,Request,Router} from 'express'
import axios, { AxiosResponse, CancelTokenSource } from 'axios';

const route=Router()

export interface IndyProofRequestAttributeSpec {
    name: string;
    restrictions: any[];
}

export interface IndyProofRequestAttributeMapSpec {
    [key: string]: IndyProofRequestAttributeSpec;
}

export interface IndyProofRequest {
    name: string;
    version: string;
    requested_attributes: IndyProofRequestAttributeMapSpec;
    requested_predicates: any;
  }

function generate_credential_offer(connection_id: string, cred_def_id: string){
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


function createDegreeProofRequest(): IndyProofRequest {
    const attributes:IndyProofRequestAttributeSpec[] = [
        {name: "name", restrictions:[{"schema_name": "degree schema"}]},
        {name: "date", restrictions:[{"schema_name": "degree schema"}]},
        {name: "degree", restrictions:[{"schema_name": "degree schema"}]},
    ]
    return {
        name: 'Proof request',
        version: '1.0',
        requested_attributes: attributes.reduce((accumulator:any, currentValue) =>{
            accumulator[`0_${currentValue.name}_uuid`] = currentValue
            return accumulator;
        }, {}),
        requested_predicates: {}
    }
}

route.post("/issuer/faber/present-proof/send-request",async (req:Request,res:Response):Promise<any>=>{
    const connection_id = req.query.connection_id as string
    const schema_name = req.query.schema_name as string
    console.log(`Requesting proof of '${schema_name}' from '${connection_id}'`)
    await axios
    .post(`http://localhost:8021/present-proof/send-request`
      , {connection_id: connection_id, proof_request: createDegreeProofRequest(), trace: false}
      , {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })
    .then((response) => {
        console.dir(response.data);
        res.json(response.data);
    })
})

route.post("/issuer/faber/issue-credential/send-offer",async (req:Request,res:Response):Promise<any>=>{
    console.log(`request.url: ${req.url}`)
    const schema_name = req.query.schema_name as string
    const connection_id = req.query.connection_id as string
    console.log(`Sending '${schema_name}' credentinal to '${connection_id}'`)
    await axios
    .get(`http://localhost:8021/credential-definitions/created?${new URLSearchParams({schema_name:schema_name}).toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })
    .then((response) => {
      return response.data.credential_definition_ids[0] as string
    })
    .then((credential_definition_id)=>{
        return axios
        .post(`http://localhost:8021/issue-credential/send-offer`
        , generate_credential_offer(connection_id, credential_definition_id)
        , {
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: 10000,
        })
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
        return axios
        .post(`http://localhost:8021/present-proof/records/${presentation_exchange_id}/verify-presentation`
        , undefined
        , {
        headers: {
            'Content-Type': 'application/json',
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

route.post("/issuer/faber/webhooks/topic/issue_credential/",async (req:Request,res:Response):Promise<any>=>{
    console.log(`request.url: ${req.url}`)
    console.log(`response.statusCode: 200`)
    res.sendStatus(200).end()
});

route.post("/issuer/faber/webhooks/topic/connections/?",async (req:Request,res:Response):Promise<any>=>{
    console.log(`request.url: ${req.url}`)
    console.log(`response.statusCode: 200`)
    res.sendStatus(200).end()
});

export default route