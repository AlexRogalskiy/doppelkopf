import { Trick } from "@/models/trick";
import { RingQueue } from "@/models/ringQueue";
import { NewScore as Score } from "@/models/newScore";
import { options } from "@/models/options";
import { Notifier } from "@/models/notifier";
import { extras } from "@/models/extras";
import { re, kontra, findParties } from "@/models/party";
import { find } from "lodash-es";

const notifier = new Notifier();

export class Round {
  constructor(players = [], scorecard = {}, openingPlayer) {
    this.players = players;
    this.parties = findParties(players);
    this.scorecard = scorecard;
    this.score = null;
    this.finished = false;
    this.currentTrick = this.nextTrick();

    this.playerOrder = new RingQueue(this.players);
    if (openingPlayer) {
      this.playerOrder.prioritize(openingPlayer);
    }
  }

  nextTrick() {
    return new Trick(this.players.length);
  }

  nextPlayer() {
    this.playerOrder.next();
  }

  waitingForPlayer() {
    return this.playerOrder.current();
  }

  nextMove() {
    if (this.waitingForPlayer().isHuman) {
      return;
    }

    if (this.currentTrick.isFinished() || this.isFinished()) {
      return;
    }

    this.waitingForPlayer().autoplay();
  }

  noMoreCardsLeft() {
    const sumCardsFn = (acc, player) => acc + player.hand.cards.length;
    const sumOfCardsLeft = this.players.reduce(sumCardsFn, 0);
    return sumOfCardsLeft === 0;
  }

  isFinished() {
    return this.finished;
  }

  async finishTrick() {
    await this.evaluateLatestTrick();

    this.currentTrick = this.nextTrick();

    if (options.autoplay === true) {
      this.nextMove();
    }
  }

  async evaluateLatestTrick() {
    const playerId = this.currentTrick.winner().id;
    const winner = find(this.players, { id: playerId });
    winner.win(this.currentTrick);
    this.playerOrder.prioritize(winner);
    await this.showExtras();
  }

  async showExtras() {
    for (let extra of this.currentTrick.extras()) {
      switch (extra) {
        case extras.doppelkopf:
          // todo i18n
          await notifier.flash("Doppelkopf");
          break;
      }
    }
  }

  async finishRound() {
    if (!this.noMoreCardsLeft()) {
      throw new Error(`Can't finish a round before all cards have been played`);
    }

    await this.evaluateLatestTrick();

    this.currentTrick = this.nextTrick();

    // todo: hack - remove and calculate parties once in the constructor
    // this is only needed because some tests mess with the parties after the round being set up
    this.parties = findParties(this.players);
    this.score = new Score(this.parties[re], this.parties[kontra]);
    this.scorecard.addScore(this.score.winner(), this.score.totalPoints());
    this.finished = true;
  }
}
