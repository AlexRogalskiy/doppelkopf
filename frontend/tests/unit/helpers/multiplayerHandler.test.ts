import { MultiplayerHandler } from "@/helpers/multiplayerHandler";
import { Config } from "@/models/config";
import { before } from "lodash";

import fetchMock from "fetch-mock-jest";

beforeEach(() => {
  fetchMock.reset();
  // disable testing mode so we're hitting fetchMock requests
  Config.testing = false;
});

afterAll(() => {
  Config.testing = true;
});

describe("Multiplayer Handler", () => {
  const multiplayer = new MultiplayerHandler();

  describe("register", () => {
    beforeEach(() => {
      fetchMock.reset();
    });

    test("should register new game", async () => {
      fetchMock.post("http://localhost:5000/api/game", stubbedCreateResponse);

      const response = await multiplayer.register();

      expect(response.game.id).toEqual("2");
      expect(response.game.players).toEqual([]);
    });

    test("should throw exception on connection error", async () => {
      fetchMock.post("http://localhost:5000/api/game", { throws: "failed" });

      async function failingRequest() {
        await multiplayer.register();
      }

      await expect(failingRequest()).rejects.toThrowError(
        "Failed to create multiplayer game: failed"
      );
    });

    test("should throw exception on non-ok response", async () => {
      fetchMock.post("http://localhost:5000/api/game", 503);

      async function failingRequest() {
        await multiplayer.register();
      }

      await expect(failingRequest()).rejects.toThrowError(
        "HTTP request failed with status 503"
      );
    });
  });

  describe("fetch room", () => {
    test.todo("should fetch room info");
    test.todo("should return waiting room");
    test.todo("should handle unknown room id");
    test.todo("should throw exception on connection error");
    test.todo("should throw exception on non-ok response");
  });
});

const stubbedCreateResponse = {
  game: {
    id: "2",
    players: []
  }
}
