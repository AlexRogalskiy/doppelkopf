export const affinityEvents = {
  announcement: "announcement",
  queen_of_clubs: "queen_of_clubs",
  played_card: "played_card"
};

export class Affinities {
  constructor(me, players = []) {
    this.me = me;
    this.setPlayers(players);
  }

  setPlayers(players) {
    this.affinityTable = players
      .filter(player => player.id !== this.me.id)
      .map(player => ({ player, affinity: 0 }));
  }

  declaresParty(player) {
    if (this._isMyPartyMember(player)) {
      this.affinityTable.forEach(x => {
        this.setPlayerAffinityByParty(x.player);
      });
    } else {
      this.setPlayerAffinityByParty(player);
    }
  }

  for(player) {
    return !this._isMe(player)
      ? this.affinityTable.find(x => x.player.id === player.id).affinity
      : 0;
  }

  setPlayerAffinityToValue(player, value) {
    if (!this._isMe(player)) {
      let index = this.affinityTable.findIndex(x => x.player.id === player.id);
      this.affinityTable[index].affinity = value;
    }
  }

  setPlayerAffinityByParty(player) {
    if (!this._isMe(player)) {
      let index = this.affinityTable.findIndex(x => x.player.id === player.id);
      this.affinityTable[index].affinity = this._isMyPartyMember(player)
        ? 1
        : -1;
    }
  }

  reset() {
    this.affinityTable.forEach(x => (x.value = 0));
  }

  /* ToDo replace with # in future version for a private function
   * this function would actually solve the affinity problem,
   * hence it shouldn't be able to be called outside the class.
   */
  _isMyPartyMember(player) {
    return (
      this.me.isRe() === player.isRe() ||
      this.me.isKontra() === player.isKontra()
    );
  }

  _isMe(player) {
    return this.me.id === player.id;
  }
}
