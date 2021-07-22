import { Config } from "@/models/config";
import { io, Socket } from "socket.io-client";

/**
 * A simple client to manage websocket connections with the backend service.
 * All websocket events sent from the client application should go through this client.
 * It's a primitive wrapper around Socket.IO that prevents establishing real connections
 * and emitting real websocket events during testing.
 */
export class WebsocketClient {
  baseUrl = Config.backend_ws_base_url;
  socket?: Socket;

  connect() {
    if (Config.testing) {
      return;
    }

    this.socket = io(this.baseUrl);

    if (Config.debug) {
      this.socket?.onAny((event, ...args) => {
        console.log("[received ws event]", event, args);
      });
    }
  }

  emit(event: Event, payload?: object) {
    if (Config.testing) {
      return;
    }

    this.socket?.emit(event, payload);
  }

  on(event: Event, listener: any) {
    this.socket?.on(event, listener);
  }
}

export enum Event {
  join = "join",
  joined = "joined",
  left = "left",
  error = "error"
}
