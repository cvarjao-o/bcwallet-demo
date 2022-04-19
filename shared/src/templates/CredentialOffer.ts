
import _merge from 'lodash.merge';

const CRED_PREVIEW_TYPE = "https://didcomm.org/issue-credential/2.0/credential-preview"

export enum AIP_VERSION {
    AIP10 = '10',
    AIP20 = '20',
}


export interface BaseCredentialOffer {
    overrides: any
    target: any
    render(target:any, overrides:any): any;
}

export interface DegreeCredentialAttributes {
    name: string;
    date: string;
    degree: string;
    birthdate_dateint: string
    timestamp: string
}
export class Degree implements BaseCredentialOffer {
    overrides: any;
    target: any;
    constructor(target: any, overrides: any) {
        this.overrides = overrides
    }
    render() {
        const attributes: any = {
            name: "Alice Smith",
            date: "2018-05-28",
            degree: "Maths",
            birthdate_dateint: "19831104",
            timestamp: Date.now().toString()
        }
        _merge(attributes, this.overrides || {})
        const cred_preview = {
            "@type": CRED_PREVIEW_TYPE,
            "attributes": Object.entries(attributes).reduce((accumulator: any[], currentValue)=>{
                accumulator.push({name: currentValue[0], value: currentValue[1]})
                return accumulator
            }, [])
        }
        if (this.target.api_version === AIP_VERSION.AIP20) {
            const offer_request = {
                "connection_id": this.target.connection_id,
                "comment": `Offer on cred def id ${this.target.cred_def_id}`,
                "auto_issue": true,
                "auto_remove": false,
                "credential_preview": cred_preview,
                "filter": {"indy": {"cred_def_id": this.target.cred_def_id}},
                "trace": false,
            }
            console.log('offer_request:')
            console.dir(offer_request)
            return offer_request
        }
    
        // Defaults to AIP 1.0
        const offer_request = {
            "connection_id": this.target.connection_id,
            "cred_def_id": this.target.cred_def_id,
            "comment": `Offer on cred def id ${this.target.cred_def_id}`,
            "auto_issue": true,
            "auto_remove": false,
            "credential_preview": cred_preview,
            "trace": false,
        }
        return offer_request
    }

}

export class LawyerCredential {
    
}