"use strict";
exports.__esModule = true;
var axios = require("axios");

axios
.get('http://localhost:8021/api/docs/swagger.json', {
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})
.then((response) => {
    return axios
    .post('https://generator.swagger.io/api/gen/clients/typescript-node', {spec: response.data, options:{supportsES6: false}}, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })
    .then((response) => {
      console.dir(response.data)
    })
})
