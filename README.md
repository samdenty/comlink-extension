# Comlink for Web Extensions

This module allows you to use [Comlink](https://github.com/GoogleChromeLabs/comlink) for `Background <-> Content/Popup` communication, in Chrome/Firefox/Safari extensions.

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

// Wrap a chrome.runtime.Port
const obj = Comlink.wrap(createEndpoint(chrome.runtime.connect()));
obj.test();

// Or, wrap an existing Message Channel:
const { port1, port2 } = new MessageChannel();
forward(port1, chrome.runtime.connect());

const obj = Comlink.wrap(port2);
obj.test();
```
