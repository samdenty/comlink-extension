import browser, { Runtime } from "webextension-polyfill";
import { forward, isMessagePort, createEndpoint } from "./adapter";

const portCallbacks = new Map<string, ((port: Runtime.Port) => void)[]>();
const ports = new Map<string, Runtime.Port>();

async function serializePort(id: string) {
  if (!portCallbacks.has(id)) {
    portCallbacks.set(id, []);
  }
  const callbacks = portCallbacks.get(id)!;
  return new Promise<Runtime.Port>((resolve) => {
    callbacks.push((port) => resolve(port));
  });
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
