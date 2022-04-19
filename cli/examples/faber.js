const DEGREE_SCHEMA_NAME = "degree schema";
const degree_schema = {
  name: DEGREE_SCHEMA_NAME,
  version: `83.35.${Date.now()}`,
  attrNames: ["name", "date", "degree", "birthdate_dateint", "timestamp"],
};

const schemas = {degree_schema};

const non_revocable_degree_cred_def = {
  schema: schemas.degree_schema,
  support_revocation: false,
  tag: "faber.agent.degree_schema.nr",
  _default_attributes: {
    name: "Alice Smith",
    date: "2018-05-28",
    degree: "Maths",
    birthdate_dateint: "19831104",
    timestamp: Date.now().toString(),
  }
};

const revocable_degree_cred_def = {
  schema: schemas.degree_schema,
  support_revocation: true,
  tag: "faber.agent.degree_schema.r",
  _default_attributes: {
    name: "Alice Smith",
    date: "2018-05-28",
    degree: "Maths",
    birthdate_dateint: "19831104",
    timestamp: Date.now().toString(),
  }
};

const credential_definitions = {non_revocable_degree_cred_def, revocable_degree_cred_def};

const simple_proof_request = {
  requested_attributes: [
    {
      name: "name",
      restrictions: [{ schema_name: degree_schema.name }],
    },
    {
      name: "date",
      restrictions: [{ schema_name: degree_schema.name }],
    },
  ].reduce((accumulator, currentValue) => {
    accumulator[`0_${currentValue.name}_uuid`] = currentValue;
    return accumulator;
  }, {}),
};

const simple_proof_request2 = {
  requested_attributes: {"0_group_uuid":{
    names: ["name", "date"],
    restrictions: [{ schema_name: degree_schema.name }],
  }}
};

// non_revoked = {"to": (Math.floor(new Date().getTime() / 1000) - 1)}
const proof_requests = {simple_proof_request, simple_proof_request2}

module.exports = {
  schemas,
  credential_definitions,
  proof_requests,
};
