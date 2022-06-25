"use strict";

const express = require("express");
var { graphqlHTTP } = require("express-graphql");
var { buildSchema } = require("graphql");
const axios = require('axios').default;
const MongoClient = require('mongodb').MongoClient


// Constants
const PORT = 8080;
const HOST = "0.0.0.0";

let db, competition, team, player
MongoClient.connect('mongodb://root:example@santex-football-data-mongo:27017/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
},
  async (err, client) => {
    if (err) {
      console.error(err)
      return
    }
    db = client.db("santex-football-data-database")
    competition = db.collection("competition")
    competition.createIndex({"code":1})
    team = db.collection("team")    
    player = db.collection("player")

  })

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
  importLeague: (req) => {
    var config = {
      method: 'get',
      url: `https://api.football-data.org/v2/competitions/${req.leagueCode}`,
      headers: {
        'X-Auth-Token': 'c3ee902739e54d01920337af7edfc9dd'
      }
    };

    return axios(config)
      .then(function (response) {
        let competitionRetrieved = {
          name: response.data.name,
          code: response.data.code,
          areaName: response.data.area.name
        }
      
        competition.findOneAndUpdate({ "code": competitionRetrieved.code }, { $set: competitionRetrieved}, { upsert: true, returnNewDocument: true })

        return competitionRetrieved
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
  res.send("Welcome to Santex");
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);