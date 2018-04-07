## Description
Built on top of [democracy.js](https://github.com/goldfire/democracy.js), judiciary.js creates a fully distributed auto-healing system to DigitalOcean setups. Simply define groups by tags and provide configs for creation of those servers. Using UDP unicast, health checks will determine when a server in the group has gone down and it will be destroyed and replaced using the given config. No need for single points of failure or additional servers to manage as judiciary.js runs on each server in the pool as a standalone Node.js service.

## Installation
* Install with [npm](https://www.npmjs.com/package/judiciary): `npm install judiciary`
* Install with [Yarn](https://yarnpkg.com/en/package/judiciary): `yarn add judiciary`

## Examples
TODO

## API
### Constructor
```javascript
new Judiciary({
  key: 'API KEY', // Your DigitalOcean API key.
  tag: 'judiciary', // All servers with this tag will be auto-discovered and managed by the matching groups.
  timeout: 60000, // How long a peer must go without sending a `hello` to be considered down.
  interval: 10000, // The interval (ms) at which `hello` heartbeats are sent to the other peers.
  port: 12345, // The port that democracy.js will listen on for health checks (this is over UDP).
});
```

### Methods
#### init()
Sets up the "judiciary branch" by discovering all of the DigitalOcean servers with the matching tag. Everything else must happen inside of the returned promise.

TODO

## License
Copyright (c) 2018 James Simpson and GoldFire Studios, Inc.

Released under the MIT License.
