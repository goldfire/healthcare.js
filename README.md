## Description
Built on top of [democracy.js](https://github.com/goldfire/democracy.js), healthcare.js creates a fully distributed auto-healing system to DigitalOcean setups. Simply define groups by tags and provide configs for creation of those servers. Using UDP unicast, health checks will determine when a server in the group has gone down and it will be destroyed and replaced using the given config. No need for single points of failure or additional servers to manage as healthcare.js runs on each server in the pool as a standalone Node.js service.

## Installation
* Install with [npm](https://www.npmjs.com/package/healthcare): `npm install healthcare`
* Install with [Yarn](https://yarnpkg.com/en/package/healthcare): `yarn add healthcare`

## Examples
The simplest use-case is to write a node service that defines groups of servers using healthcare. In this example, the group of test servers will be maintained at a size of 2. If one of the servers goes down or becomes unresponsive, it will be destroyed and a new one created in its place with the provided config. Simply run this service on each server (it would be a good idea to use use_data to set it up with each new server).

```javascript
const Healthcare = require('healthcare');

// Setup the healthcare.
const healthcare = new Healthcare({
  key: '...',
  tag: 'healthcare',
  interval: 5000,
  timeout: 30000,
});

// Initialize the healthcare system and setup the groups.
healthcare.init().then(() => {
  // Setup the test server group.
  healthcare.group({
    tags: ['ENV:Test', 'TYPE:Test'],
    size: 2,
    config: {
      name: 'TEST',
      region: 'nyc3',
      size: 's-1vcpu-1gb',
      image: 'ubuntu-16-04-x64',
      ssh_keys: ['...'],
      backups: false,
      ipv6: false,
      private_networking: true,
      user_data: '',
      monitoring: true,
      tags: ['ENV:Test', 'TYPE:Test', 'healthcare'],
    },
  });
});
```

## API
### Constructor
```javascript
new Healthcare({
  key: 'API KEY', // Your DigitalOcean API key.
  tag: 'healthcare', // All servers with this tag will be auto-discovered and managed by the matching groups.
  timeout: 60000, // How long a peer must go without sending a `hello` to be considered down.
  interval: 10000, // The interval (ms) at which `hello` heartbeats are sent to the other peers.
  port: 12345, // The port that democracy.js will listen on for health checks (this is over UDP).
});
```

### Methods
#### init()
Sets up the "healthcare system" by discovering all of the DigitalOcean servers with the matching tag. Everything else must happen inside of the returned promise.
#### group({tags = [], size = 1, config = {}})
Initialize a new group of servers. Prvide a list of tags to identify the group with, a size for the number of servers and a config to build the new servers with.

Server config uses the following format:

```javascript
{
  name: 'NAME', // This is a base name and is appended with a unique ID.
  region: 'nyc3', // The slug identifier for the region to build the server.
  size: 's-1vcpu-1gb', The slug identifier for the Droplet size.
  image: 'ubuntu-16-04-x64', The image ID of a private image or slug identifier of a public.
  ssh_keys: [], An array of SSH key IDs or fingerprints.
  backups: false, // Whether or not to enable backups.
  ipv6: false, // Whether or not to enable ipv6 networking.
  private_networking: true, // Whether or not to enable private networking.
  user_data: '', // Bash script string to run on server creation.
  monitoring: true, // Whether or not to enable monitoring on server.
  volumes: [], An array of the string identifier for each block storage volume to attach.
  tags: ['healthcare'], // Tags to add to the server.
}
```

## License
Copyright (c) 2018 James Simpson and GoldFire Studios, Inc.

Released under the MIT License.
