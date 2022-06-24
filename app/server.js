"use strict";

const express = require("express");
var { graphqlHTTP } = require("express-graphql");
var { buildSchema } = require("graphql");
const axios = require('axios').default;

// Constants
const PORT = 8080;
const HOST = "0.0.0.0";

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  type Country{
    name: String,
    population: Int
  }
  type Competition{
    name: String
    code: String
    areaName: String
  }
  type Query {
    hello: String,
    getCountry: Country
  }
  type Mutation {
    importLeague(leagueCode: String): Competition
  }
`);

// The root provides a resolver function for each API endpoint
var root = {
  hello: () => {
    return "Hello world!";
  },
  getCountry: () => {
    return {
      name: "Venezuela",
      population: 30000000,
    };
  },
  importLeague: () => {
    let info;
    var config = {
      method: 'get',
      url: 'https://api.football-data.org//v2/competitions/PL',
      headers: { 
        'X-Auth-Token': 'c3ee902739e54d01920337af7edfc9dd'
      }
    };
    
    return axios(config)
    .then(function (response) {
      return {
        name: response.data.name,
        code: response.data.code,
        areaName: response.data.area.name
      }
    })
    .catch(function (error) {
      console.log(error);
    });    
    
  },
};

var app = express();
app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  })
);

app.get("/", (req, res) => {
  
  res.send("AAAAHeasdsdfsdfaa  aqqq llo Wo rl  d 334538dddfdf88   5 aaaa");
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
