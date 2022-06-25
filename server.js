"use strict";

const express = require("express");
var { graphqlHTTP } = require("express-graphql");
var { buildSchema } = require("graphql");
const axios = require('axios').default;
const MongoClient = require('mongodb').MongoClient
require('dotenv').config()

let db, competition, team, player
MongoClient.connect(`mongodb://${process.env.MONGO_ROOT_USERNAME}:${process.env.MONGO_ROOT_PASSWORD}@santex-football-data-mongo:27017/`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
},
  async (err, client) => {
    if (err) {
      console.error(err)
      return
    }
    db = client.db(process.env.MONGO_DATABASE)
    competition = db.collection("competition")
    competition.createIndex({"code":1})
    team = db.collection("team")    
    team.createIndex({"id":1})
    player = db.collection("player")
    player.createIndex({"id":1})

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
      url: `${process.env.FOOTBALL_DATA_API_URL}/competitions/${req.leagueCode}`,
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY
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
      })
      .then((response)=>{
        axios({
          method: 'get',
          url: `${process.env.FOOTBALL_DATA_API_URL}/competitions/${req.leagueCode}/teams`,
          headers: {
            'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY
          }
        })
          .then(function (response) {
            // let competitionRetrieved = {
            //   name: response.data.name,
            //   code: response.data.code,
            //   areaName: response.data.area.name
            // }
            response.data.teams.map((teamRetrieved)=>{
              team.findOneAndUpdate({ "id": teamRetrieved.id }, { $set: teamRetrieved}, { upsert: true, returnNewDocument: true })
            })
          })
          .then((response)=>{
            axios({
              method: 'get',
              url: `${process.env.FOOTBALL_DATA_API_URL}/competitions/${req.leagueCode}/scorers`,
              headers: {
                'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY
              }
            })
              .then(function (response) {
                console.log(JSON.stringify(response.data))
                // let competitionRetrieved = {
                //   name: response.data.name,
                //   code: response.data.code,
                //   areaName: response.data.area.name
                // }
                response.data.scorers.map((scorerRetrieved)=>{
                  player.findOneAndUpdate({ "id": scorerRetrieved.id }, { $set: scorerRetrieved}, { upsert: true, returnNewDocument: true })
                })
              })
            return response
          })
        return response
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

app.listen(process.env.NODE_PORT, process.env.NODE_HOST);
console.log(`Running on http://${process.env.NODE_HOST}:${process.env.NODE_PORT}`);