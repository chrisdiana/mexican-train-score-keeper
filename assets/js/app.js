function generateUID() {
  var firstPart = (Math.random() * 46656) | 0;
  var secondPart = (Math.random() * 46656) | 0;
  firstPart = ("000" + firstPart.toString(36)).slice(-3);
  secondPart = ("000" + secondPart.toString(36)).slice(-3);
  return firstPart + secondPart;
}

class Game {
  constructor() {
    this.active = false;
    this.players = [];
    this.round = 9;
    this.roundLimit = 9;
    this.startPlayer = '';
    this.currentPlayerIndex = 0;
    this.currentRoundIndex = 0;
    this.scores = [];
    this.summary = {};
    this.wins = {};
    this.uid = generateUID();
    this.date = new Date();

    this.init();
  }

  init() {
    this.currentPlayerIndex = this.players.indexOf(this.startPlayer);
  }

}


var app = new Vue({
  el: '#app',
  vuetify: new Vuetify({
    theme: {
      themes: {
      light: {
      primary: '#f98eb2',
      secondary: '#b0bec5',
      accent: '#8c9eff',
      error: '#b71c1c',
      },
      },
      },
  }),
  data() {
    return {
      tab: 0,
      game: null,
      activeGameIndex: null,
      games: [],
      useLastGamePlayers: false,
      newGameDialog: false,
      editRoundDialog: false,
      editRound: {},
      playerInput: '',
      selectedRoundIndex: 0,
      lastGamePlayers: [
      ],
    };
  },
  methods: {
    addPlayer() {
      this.game.players.push(this.playerInput);
      this.playerInput = '';
    },
    setLastGamePlayers() {
      if(this.useLastGamePlayers) {
        this.game.players = this.lastGamePlayers;
      }
    },
    calculateRoundWinner(scores) {
      return Object.keys(scores).find(player => scores[player] == 0);
    },
    calculateWins() {
      const playerScores = this.game.players.reduce((map, name) => {
        map[name] = 0;
        return map;
      }, {});

      this.game.scores.forEach(round => {
        Object.keys(round.players).forEach(player => {
          if(round.players[player]) {
            if(Number(round.players[player]) === 0) {
              playerScores[player] = playerScores[player] + 1;
            }
          }
        });
      });
      return playerScores;
    },
    calculateWinner(scores) {
      const topScore = Math.min.apply(Math, Object.keys(scores).map(function(player) { return scores[player]; }))
      const winners = Object.keys(scores).filter(player => scores[player] == topScore).join(', ');
      return winners;
    },
    updateSummary() {
      const playerScores = this.game.players.reduce((map, name) => {
        map[name] = 0;
        return map;
      }, {});

      const summary = this.game.scores.reduce((acc, cur, idx, arr) => {
        Object.keys(cur.players).forEach(player => {
          if(cur.players[player]) {
            acc[player] = Number(cur.players[player]) + Number(acc[player]);
          }
        });
        return acc;
      }, playerScores);

      this.game.summary.players = summary;
      this.game.summary.winner = this.calculateWinner(summary);
      this.game.wins.players = this.calculateWins();
    },
    updateRound() {
      this.game.scores[this.selectedRoundIndex].players = this.editRound;
      this.game.scores[this.selectedRoundIndex].winner = this.calculateRoundWinner(this.editRound);
      this.updateSummary();
      this.editRound = {};
      this.editRoundDialog = false;

      this.game.scores.forEach((round, idx) => {
        if(round.winner) {
          this.game.currentRoundIndex = idx;
        }
      });
      this.game.currentPlayerIndex = (this.game.currentRoundIndex + 2) % this.game.players.length;
      this.saveGame();
    },
    openEditRoundDialog(idx) {
      this.selectedRoundIndex = idx;
      this.editRound = Vue.util.extend({}, this.game.scores[idx].players);
      this.editRoundDialog = true;
    },
    createScoreCard() {
      const playerScores = this.game.players.reduce((map, name) => {
        map[name] = null;
        return map;
      }, {});

      for(var i = 0; i <= this.game.roundLimit; i++) {
        this.game.scores.push({
          'round': i,
          'players': playerScores,
          'winner': '',
        });
      }
      this.game.scores.reverse();

      this.game.summary = {
        'players': playerScores,
        'winner': '',
      };

      this.game.wins = {
        'players': playerScores,
        'winner': '',
      };
    },
    openNewGameDialog() {
      this.createNewGame();
      this.setLastGamePlayers();
      this.newGameDialog = true;
    },
    async newGame() {
      this.tab = 1;
			this.newGameDialog = false;
      this.createScoreCard();
      this.game.active = true;
      this.game.currentPlayerIndex = this.game.players.indexOf(this.game.startPlayer);
      await this.saveGame();
      await this.addGameToData();
    },
    createNewGame() {
      this.game = {
        active: false,
        players: [],
        round: 9,
        roundLimit: 9,
        startPlayer: '',
        currentPlayerIndex: 0,
        currentRoundIndex: 0,
        scores: [],
        summary: {},
        wins: {},
        uid: generateUID(),
        date: new Date(),
      };
      //this.games.push(new Game());
    },
    async openGame(uid) {
      let data = await localforage.getItem(`@mts/game/${uid}`);
      this.game = JSON.parse(data);
      this.tab = 1;
    },
    async addGameToData() {
      let data = await localforage.getItem(`@mts/data`);
      data = JSON.parse(data);
      data.games.push({
        uid: this.game.uid,
        date: this.game.date,
      });
      data.lastPlayers = this.game.players;
      localforage.setItem(`@mts/data`, JSON.stringify(data)).then(() => {
        localforage.getItem(`@mts/data`).then(data => {
          if(data) {
            var d = JSON.parse(data);
            this.games = d.games;
            this.lastGamePlayers = d.lastPlayers;
          }
        });
      });
    },
    async saveGame() {
      const game = await localforage.setItem(`@mts/game/${this.game.uid}`, JSON.stringify(this.game));
    },
    async getGamesData() {
    },
  },
  created() {
    localforage.getItem(`@mts/data`).then(data => {
      let d;
      if(!data) {
        d = { games: [], lastPlayers: [] };
        localforage.setItem(`@mts/data`, JSON.stringify(d)).then(() => {});
      } else {
        d = JSON.parse(data);
      }
      this.games = d.games;
      this.lastGamePlayers = d.lastPlayers;
      console.log(this.lastGamePlayers);
    });
  },
});

Vue.filter('formatDate', function(value) {
  if (value) {
    return moment(String(value)).format('MM/DD/YYYY hh:mm')
  }
});
