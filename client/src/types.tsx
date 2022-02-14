export interface IConnection {
  state: string;
  connection_id: string;
  connection_protocol: string;
  my_did: string;
  their_did: string;
  created_at: string;
  updated_at: string;
}
export interface GetConnectionReponse {
  results: IConnection[];
}
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

export interface ApiSendRequestRequest {
  connection_id: string;
  proof_request: IndyProofRequest;
  trace: Boolean;
}

export interface ApiSendRequestResponse {}

export interface ApiSchemaSpec {
  id: string;
  name: string;
  version: string;
  attrNames: string[];
}
