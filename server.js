"use strict";

const express = require("express");
let { graphqlHTTP } = require("express-graphql");
let { buildSchema } = require("graphql");
const axios = require("axios").default;
const MongoClient = require("mongodb").MongoClient;
require("dotenv").config();

let db, competition, team, player;
MongoClient.connect(
  `mongodb://${process.env.MONGO_ROOT_USERNAME}:${process.env.MONGO_ROOT_PASSWORD}@santex-football-data-mongo:27017/`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  async (err, client) => {
    if (err) {
      console.error(err);
      return;
    }
    db = client.db(process.env.MONGO_DATABASE);
    competition = db.collection("competition");
    competition.createIndex({ code: 1 });
    team = db.collection("team");
    team.createIndex({ id: 1, tla: 1 });
    player = db.collection("player");
    player.createIndex({ id: 1 });
  }
);

// Construct a schema, using GraphQL schema language
let schema = buildSchema(`
  type Area{
    id: Int
    name: String
  }
  type Competition{
    name: String
    code: String
    areaName: String
  }
  type Team{
    id: Int
    address: String
    area: Area
    clubColors: String
    crestUrl: String
    email: String
    founded: Int
    lastUpdated: String
    league: [String]
    name: String
    phone: String
    shortName: String
    tla: String
    venue: String
    website: String
  }
  type Query {
    team(name: String, getPlayers: Boolean): Team
  }
  type Mutation {
    importLeague(leagueCode: String): Competition
  }
`);

// The root provides a resolver function for each API endpoint
let root = {
  hello: () => {
    return "Hello world!";
  },
  team: (req) => {
    let teamDB = team.findOne({ name: req.name });
    return teamDB;
  },
  importLeague: (req) => {
    let config = {
      method: "get",
      url: `${process.env.FOOTBALL_DATA_API_URL}/competitions/${req.leagueCode}`,
      headers: {
        "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY,
      },
    };

    return axios(config)
      .then((response)=>saveCompetitionToDB(response))
      .then(() => {
        config.url = `${process.env.FOOTBALL_DATA_API_URL}/competitions/${req.leagueCode}/teams`;
        axios(config)
          .then((response)=>saveteamsToDB(response, req.leagueCode))
          .then(() => {
            (config.url = `${process.env.FOOTBALL_DATA_API_URL}/competitions/${req.leagueCode}/scorers`),
              axios(config).then((response) =>
                savePlayersToDB(response, req.leagueCode)
              );
          });
      })
      .catch(function (error) {
        console.log(error);
      });
  },
};

function saveCompetitionToDB(response) {
  let competitionRetrieved = {
    name: response.data.name,
    code: response.data.code,
    areaName: response.data.area.name,
  };

  competition.findOneAndUpdate(
    { code: competitionRetrieved.code },
    { $set: competitionRetrieved },
    { upsert: true, returnNewDocument: true }
  );
}

function saveteamsToDB(response, leagueCode) {
  response.data.teams.map(async (teamRetrieved) => {
    let teamDB = await team.findOne({ id: teamRetrieved.id });
    if (teamDB) {
      if (!teamDB.league.includes(leagueCode)) {
        teamDB.league.push(leagueCode);
        team.findOneAndUpdate(
          { id: teamDB.id },
          { $set: teamDB },
          { upsert: true, returnNewDocument: true }
        );
      }
    } else {
      teamRetrieved.league = [leagueCode];
      team.findOneAndUpdate(
        { id: teamRetrieved.id },
        { $set: teamRetrieved },
        { upsert: true, returnNewDocument: true }
      );
    }
  });
}

function savePlayersToDB(response, leagueCode) {
  response.data.scorers.map(async (scorerRetrieved) => {
    let idToInsert, scorerToInsert;
    let scorerDB = await player.findOne({ id: scorerRetrieved.player.id });
    if (scorerDB) {
      if (scorerDB.team.some((e) => e.id === scorerRetrieved.team.id)) {
        idToInsert = scorerDB.player.id;
        scorerToInsert = scorerDB;
      } else {
        scorerDB.team.push(scorerRetrieved.team);
        idToInsert = scorerDB.player.id;
        scorerToInsert = scorerDB;
      }
      if (!scorerDB.league.includes(leagueCode)) {
        scorerDB.league.push(leagueCode);
      }
    } else {
      scorerRetrieved.team = [scorerRetrieved.team];
      scorerRetrieved.league = [leagueCode];
      idToInsert = scorerRetrieved.player.id;
      scorerToInsert = scorerRetrieved;
    }

    player.findOneAndUpdate(
      { id: idToInsert },
      { $set: scorerToInsert },
      { upsert: true, returnNewDocument: true }
    );
  });
}

let app = express();
app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  })
);

app.get("/", (req, res) => {
  res.send("Welcome!");
});

app.listen(process.env.NODE_PORT, process.env.NODE_HOST);
console.log(
  `Running on http://${process.env.NODE_HOST}:${process.env.NODE_PORT}`
);
