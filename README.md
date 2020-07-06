# Comlink for Web Extensions

This module allows you to use Comlink for Background <-> Content/Popup scripts.

## Usage

Background-script:

```ts
import { createBackgroundEndpoint, isMessagePort } from "comlink-extension";
import * as Comlink from "comlink";

chrome.runtime.onConnect.addListener((port) => {
  if (isMessagePort(port)) return;

  Comlink.expose(
    {
      test() {
        console.log("called");
      },
    },
    createBackgroundEndpoint(port)
  );
});
```

Content / popup / devtool script:

```ts
import { createEndpoint, forward } from "comlink-extension";
import * as Comlink from "comlink";

const obj = Comlink.wrap(createEndpoint(chrome.runtime.connect()));
obj.test();

// OR, using message channels:
const { port1, port2 } = new MessageChannel();
forward(port1, chrome.runtime.connect());

const obj = Comlink.wrap(port2);
obj.test();
```
