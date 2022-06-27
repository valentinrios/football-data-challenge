# Football Data Challenge

## Installation

Configure the .env file with your information:
```
NODE_PORT=8080
NODE_HOST=0.0.0.0

FOOTBALL_DATA_API_KEY=your api key
FOOTBALL_DATA_API_URL=https://api.football-data.org/v2

MONGO_ROOT_USERNAME=set your mongo root username
MONGO_ROOT_PASSWORD=set your mongo root password
MONGO_DATABASE=set your mongo database name
```
This API requires Docker to run.

Install Docker and run the docker compose:

```
docker-compose up -d
```
This will create the project containers and pull in the necessary dependencies.



## Queries and Mutations

This API use GraphQL, use the GraphiQL UI to send the requests:
```
http://localhost:8081/graphql
```


#### Mutation: importLeague

Request:
```
mutation yourMutationRequestName {
  importLeague(leagueCode: "EC"){
    message
  }  
}
```

Response:
```
{
  "data": {
    "importLeague": {
      "message": "Great! Data imported."
    }
  }
}
```

#### Query: players

Request:
```
query yourPlayersQueryRequestName{
  players(leagueCode: "EC", teamName: "Czech Republic"){
    id
      league
      player{
        id
        name
        firstName
        lastName
        dateOfBirth
        countryOfBirth
        nationality
        position
        shirtNumber
        lastUpdated
      }
  }
}

```

Response:
```
{
  "data": {
    "players": [
      {
        "id": 1826,
        "league": [
          "EC"
        ],
        "player": {
          "id": 1826,
          "name": "Patrik Schick",
          "firstName": "Patrik",
          "lastName": null,
          "dateOfBirth": "1996-01-24",
          "countryOfBirth": "Czech Republic",
          "nationality": "Czech Republic",
          "position": "Offence",
          "shirtNumber": null,
          "lastUpdated": "2021-09-01T08:12:11Z"
        }
      }
    ]
  }
}
```

#### Query: team

Request:
```
query yourTeamQueryRequestName{
  team(name: "Czech Republic"){
    id
    address
    area {
      id
      name
    }
    clubColors
    crestUrl
    email
    founded
    lastUpdated
    league
    name
    phone
    shortName
    tla
    venue
    website
    players{
      id
      league
      player{
        id
        name
        firstName
        lastName
        dateOfBirth
        countryOfBirth
        nationality
        position
        shirtNumber
        lastUpdated
      }
    }
  }
}
```

Response:
```
{
  "data": {
    "team": {
      "id": 798,
      "address": "Diskařská 2431/4 Praha 16017",
      "area": {
        "id": 2062,
        "name": "Czech Republic"
      },
      "clubColors": "Red / White / Blue",
      "crestUrl": "https://crests.football-data.org/798.svg",
      "email": "facr@fotbal.cz",
      "founded": 1901,
      "lastUpdated": "2021-05-26T10:28:33Z",
      "league": [
        "EC"
      ],
      "name": "Czech Republic",
      "phone": "+420 (23) 3029111",
      "shortName": "Czech Republic",
      "tla": "CZE",
      "venue": "Sinobo Stadium",
      "website": "http://www.fotbal.cz",
      "players": [
        {
          "id": 1826,
          "league": [
            "EC"
          ],
          "player": {
            "id": 1826,
            "name": "Patrik Schick",
            "firstName": "Patrik",
            "lastName": null,
            "dateOfBirth": "1996-01-24",
            "countryOfBirth": "Czech Republic",
            "nationality": "Czech Republic",
            "position": "Offence",
            "shirtNumber": null,
            "lastUpdated": "2021-09-01T08:12:11Z"
          }
        }
      ]
    }
  }
}
```


## The Database

This API use MongoDB as database, you can see it in the mongo-express UI in the url:
```
http://localhost:8082/db/valentinrios-db/
```