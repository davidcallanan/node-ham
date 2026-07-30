# @davidcal/node-ham: Heavy Atomic Metadata

**Latest version:** v1.0.1

## Overview

This package exposes atomic key-value storage "of last resort", atop a Linux filesystem. It's recommended to only use this for critical durable metadata, before bootstrapping a larger database that can expose a richer and more efficient primitive. Refrain from storing large quantities of data using this package. The implementation adds very basic error-correction, but this is in no way a substitute for proper error correction via the likes of a RAID filesystem.

There are two variants of this package:

- `@davidcal/node-ham`: This package includes the dependencies needed for a typical setup.
- `@davidcal/node-ham-free`: This package allows the developer to pass in dependencies manually, should the typical setup not be to the developer's liking.

## Installation

```bash
npm install @davidcal/node-ham
pnpm install @davidcal/node-ham
yarn add @davidcal/node-ham
```

## Usage

```js
import { createHam } from "@davidcal/node-ham";

const ham = await createHam({}, { path: "./data.ham" });
const key = new TextEncoder().encode("My Key");
const entry = await ham.open(key);

await entry.read(); // undefined
await entry.write(new TextEncoder().encode("My Value"));
new TextDecoder().decode(await entry.read()); // "My Value"
await entry.write(undefined);
await entry.read(); // undefined

// Unlock the entry when done.
await entry.close();
```

## Contributing

See `CONTRIBUTING.md`.
