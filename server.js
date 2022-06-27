"use strict";

const express = require("express");
let { graphqlHTTP } = require("express-graphql");
let { buildSchema } = require("graphql");
const axios = require("axios").default;
const rateLimit = require("axios-rate-limit");
const MongoClient = require("mongodb").MongoClient;
require("dotenv").config();

let db, competition, team, player;
MongoClient.connect(
  `mongodb://${process.env.MONGO_ROOT_USERNAME}:${process.env.MONGO_ROOT_PASSWORD}@valentinrios-mongo:27017/`,
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

let schema = buildSchema(`
  type ImportLeagueResponse{
    message: String
  }
  type PlayerDetails{
    id: Int
    name: String
    firstName: String
    lastName: String
    dateOfBirth: String
    countryOfBirth: String
    nationality: String
    position: String
    shirtNumber: Int
    lastUpdated: String
  }
  type Player{
    id: Int
    league: [String]
    numberOfGoals: Int
    player: PlayerDetails
    team: [Team]
  }
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
    players: [Player]
  }
  type Query {
    team(name: String, getPlayers: Boolean): Team    
    players(leagueCode: String, teamName: String): [Player]
  }
  type Mutation {
    importLeague(leagueCode: String): ImportLeagueResponse
  }
`);

let root = {
  players: async (req) => {
    let playersByLeagueToReturn = [];
    let competitionDB = await competition.find({ code: req.leagueCode });
    competitionDB = await competitionDB.toArray();
    if (competitionDB.length === 0) {
      throw new Error("League not found");
    }
    let playersByLeague = await player.find({
      league: req.leagueCode,
      "team.name": req.teamName,
    });
    await playersByLeague.forEach((player) => {
      playersByLeagueToReturn.push(player);
    });
    return playersByLeagueToReturn;
  },
  team: async (req) => {
    let teamDB = await team.findOne({ name: req.name });
    let playersByTeamToReturn = [];
    let playersByTeam = await player.find({ "team.id": teamDB.id });
    await playersByTeam.forEach((player) => {
      playersByTeamToReturn.push(player);
    });
    teamDB.players = playersByTeamToReturn;
    return teamDB;
  },
  importLeague: (req) => {
    const http = rateLimit(
      axios.create({
        baseURL: `${process.env.FOOTBALL_DATA_API_URL}/competitions/`,
        timeout: 10000,
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY,
        },
      }),
      {
        maxRequests: 10,
        perMilliseconds: 60000,
      }
    );

    let config = {
      method: "get",
      url: `${process.env.FOOTBALL_DATA_API_URL}/competitions/${req.leagueCode}`,
      headers: {
        "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY,
      },
    };

    let competitionAxiosRequest = http.get(`${req.leagueCode}`);
    let teamsAxiosRequest = http.get(`${req.leagueCode}/teams`);
    let playersAxiosRequest = http.get(`${req.leagueCode}/scorers`);

    return Promise.all([
      competitionAxiosRequest,
      teamsAxiosRequest,
      playersAxiosRequest,
    ])
      .then(function (responses) {
        saveCompetitionToDB(responses[0], req.leagueCode);
        saveteamsToDB(responses[1], req.leagueCode);
        savePlayersToDB(responses[2], req.leagueCode);
        return {
          message: "Great! Data imported."
        }
      })
      .catch((error) => {
        return {
          message: "Wait! The Football Data API is not available. Try Later."
        }
      });
  },
};

function saveCompetitionToDB(response) {
  competition.findOneAndUpdate(
    { code: response.data.code },
    { $set: response.data },
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
