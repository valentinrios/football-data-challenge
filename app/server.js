"use strict";

const express = require("express");
var { graphqlHTTP } = require("express-graphql");
var { buildSchema } = require("graphql");

// Constants
const PORT = 8080;
const HOST = "0.0.0.0";

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  type Country{
    name: String,
    population: Int
  }
  type Query {
    hello: String,
    getCountry: Country
  }
  type Mutation {
    importLeague(leagueCode: String): String
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
    fetch("http://api.football-data.org/v4/competitions/PL", {
      method: "get",
      headers: new Headers({
        Authorization: "Basic c3ee902739e54d01920337af7edfc9dd",
        "Content-Type": "application/x-www-form-urlencoded",
      }),
      body: "",
    })
      .then((response) => response.json())
      .then((data) => console.log(data));
      return "aqui"
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
