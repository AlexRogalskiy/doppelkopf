import { WebsocketClient, Event } from "@/helpers/websocketClient";
import { WaitingRoom } from "@/models/waitingRoom";
import { PlayerBuilder } from "../../builders/playerBuilder";
import { mocked } from "ts-jest/utils";
import { Player } from "@/models/player";
import * as storage from "@/helpers/storage";

jest.mock("@/helpers/websocketClient");
let websocketMock = mocked(WebsocketClient);

let waitingRoom: WaitingRoom;

let player1 = new PlayerBuilder("player 1").withId("1").build();
let player2 = new PlayerBuilder("player 2").withId("2").build();
let player3 = new PlayerBuilder("player 3").withId("3").build();
let player4 = new PlayerBuilder("player 4").withId("4").build();

beforeEach(() => {
  websocketMock.mockReset();
  waitingRoom = new WaitingRoom(42);
  storage.dropPlayer();
});

test("should generate game URL", () => {
  expect(waitingRoom.gameUrl).toEqual("http://localhost:8080/#/wait/42");
});

test("should send join event", () => {
  waitingRoom.join(player1);

  expect(websocketMock.mock.instances[0].emit).toHaveBeenCalledWith(
    Event.join,
    expect.anything()
  );
});

test("should report ready state", () => {
  expect(waitingRoom.isReady).toBe(false);

  waitingRoom.handleJoined([player1]);
  waitingRoom.handleJoined([player1, player2]);
  waitingRoom.handleJoined([player1, player2, player3]);
  waitingRoom.handleJoined([player1, player2, player3, player4]);

  expect(waitingRoom.isReady).toBe(true);
});

test("should start in loading state and without error", () => {
  expect(waitingRoom.isLoading).toBe(true);
  expect(waitingRoom.error).toBeUndefined();
});

test("should start without players", () => {
  expect(waitingRoom.players).toEqual([]);
  expect(waitingRoom.owner).toBeUndefined();
});

test("should only add unknown players on joined", () => {
  waitingRoom.handleJoined([player1]);
  waitingRoom.handleJoined([player1, player2]);
  expect(waitingRoom.players).toEqual([player1, player2]);
});

test("should declare first joining player as owner", () => {
  waitingRoom.handleJoined([player1, player2, player3]);
  expect(waitingRoom.owner).toEqual(player1);
});

test("should no longer be loading after joining", () => {
  waitingRoom.handleJoined([player1, player2, player3]);
  expect(waitingRoom.isLoading).toBe(false);
});

test("should set own player as 'me' if it matches stored player", () => {
  storage.savePlayer(player3);

  waitingRoom.handleJoined([player1, player3]);

  expect(waitingRoom.me).toEqual(player3);
});

test("should handle error", () => {
  waitingRoom.handleError("some-error");
  expect(waitingRoom.isLoading).toBe(false);
  expect(waitingRoom.error).toEqual("some-error");
});

test("should handle player leaving", () => {
  waitingRoom.handleJoined([player1, player2]);
  waitingRoom.handleLeft([player1]);
  expect(waitingRoom.players).toEqual([player1]);
});

test("should handle owner leaving", () => {
  waitingRoom.handleJoined([player1, player2]);
  expect(waitingRoom.owner).toEqual(player1);

  waitingRoom.handleLeft([player2]);

  expect(waitingRoom.players).toEqual([player2]);
  expect(waitingRoom.owner).toEqual(player2);
});

test("should handle unknown player in 'left' handler", () => {
  waitingRoom.handleJoined([player1, player2]);
  const unknownPlayer = new Player("unknown");

  waitingRoom.handleLeft([player1, unknownPlayer]);

  expect(waitingRoom.players).toEqual([player1]);
});
