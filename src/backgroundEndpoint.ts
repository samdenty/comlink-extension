import { Runtime, browser } from "webextension-polyfill-ts";
import {
  forward,
  isMessagePort,
  createEndpoint,
  OnPortCallback,
} from "./adapter";

const portCallbacks = new Map<string, OnPortCallback[]>();
const ports = new Map<string, Runtime.Port>();

function serializePort(id: string, onPort: OnPortCallback) {
  if (!portCallbacks.has(id)) {
    portCallbacks.set(id, []);
  }
  const callbacks = portCallbacks.get(id)!;
  callbacks.push(onPort);
}

function deserializePort(id: string) {
  const port = ports.get(id)!;
  const { port1, port2 } = new MessageChannel();
  forward(port2, port, serializePort, deserializePort);
  return port1;
}

browser.runtime.onConnect.addListener((port) => {
  if (!isMessagePort(port)) return;
  ports.set(port.name, port);
  portCallbacks.get(port.name)?.forEach((cb) => cb(port));
});

export function createBackgroundEndpoint(port: Runtime.Port) {
  return createEndpoint(port, serializePort, deserializePort);
}
