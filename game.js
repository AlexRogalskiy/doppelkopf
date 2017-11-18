import Player from './player';
import Deck from './deck';
import Trick from './trick';
import { take } from 'lodash';

export default class Game {
    constructor() {
        this.players = [
            new Player('Player 1', this),
            new Player('Player 2', this),
            new Player('Player 3', this),
            new Player('Player 4', this),
        ];
        this.deck = new Deck();
        this.currentTrick = new Trick();
        this.deal();
    }

    deal() {
        this.players[0].hand = this.deck.cards.slice(0, 10);
        this.players[1].hand = this.deck.cards.slice(10, 20);
        this.players[2].hand = this.deck.cards.slice(20, 30);
        this.players[3].hand = this.deck.cards.slice(30, 40);
    }
}
