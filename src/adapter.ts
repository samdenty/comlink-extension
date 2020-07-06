import { browser, Runtime } from "webextension-polyfill-ts";
import * as Comlink from "comlink";

const PORT_ID = "@@@PORT_ID";

export type PortResolver = (id: string) => ResolvablePort;
export type PortDeserializer = (id: string) => MessagePort;

export type ResolvablePort = Promise<Runtime.Port> | Runtime.Port | string;

function _resolvePort(id: string) {
  return id;
}

function _deserializePort(id: string) {
  const { port1, port2 } = new MessageChannel();
  forward(port1, id, _resolvePort, _deserializePort);
  return port2;
}

function deserialize(
  data: any,
  ports: any[],
  deserializePort: PortDeserializer
): any {
  if (Array.isArray(data)) {
    data.forEach((value, i) => {
      data[i] = deserialize(value, ports, deserializePort);
    });
  } else if (data && typeof data === "object") {
    const id = data[PORT_ID];
    if (id) {
      const port = deserializePort(id);
      ports.push(port);
      return port;
    }

    for (const key in data) {
      data[key] = deserialize(data[key], ports, deserializePort);
    }
  }
  return data;
}

export function createEndpoint(
  port: Runtime.Port,
  resolvePort: PortResolver = _resolvePort,
  deserializePort: PortDeserializer = _deserializePort
): Comlink.Endpoint {
  const listeners = new WeakMap();
  return {
    postMessage: (message, transfer: MessagePort[]) => {
      for (const port of transfer) {
        const id = PORT_ID + `${+new Date()}${Math.random()}`;
        // @ts-ignore
        fromPort[PORT_ID] = id;
        forward(port, resolvePort(id), resolvePort, deserializePort);
      }
      port.postMessage(message);
    },
    addEventListener: (_, handler) => {
      const listener = (data: any) => {
        const ports: MessagePort[] = [];
        const event = new MessageEvent("message", {
          data: deserialize(data, ports, deserializePort),
          ports,
        });

        if ("handleEvent" in handler) {
          handler.handleEvent(event);
        } else {
          handler(event);
        }
      };
      port.onMessage.addListener(listener);
      listeners.set(handler, listener);
    },
    removeEventListener: (_, handler) => {
      const listener = listeners.get(handler);
      if (!listener) {
        return;
      }
      port.onMessage.removeListener(listener);
      listeners.delete(handler);
    },
  };
}

export async function forward(
  messagePort: MessagePort,
  extensionPort: ResolvablePort,
  resolvePort: PortResolver = _resolvePort,
  deserializePort: PortDeserializer = _deserializePort
) {
  if (typeof extensionPort === "string") {
    extensionPort = browser.runtime.connect(undefined, { name: extensionPort });
  }

  const port = Promise.resolve(extensionPort).then((port) =>
    createEndpoint(port, resolvePort, deserializePort)
  );

  messagePort.onmessage = async ({ data, ports }) => {
    (await port).postMessage(data, ports as any);
  };

  (await port).addEventListener("message", ({ data, ports }: any) => {
    messagePort.postMessage(data, ports as any);
  });
}

export function isMessagePort(port: { name: string }) {
  return port.name.startsWith(PORT_ID);
}
