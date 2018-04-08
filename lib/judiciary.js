/**
 * checks-and-balances.js
 * Copyright (c) 2018, GoldFire Studios, Inc.
 * http://goldfirestudios.com
 */

const {EventEmitter} = require('events');
const Democracy = require('democracy');
const DigitalOcean = require('do-wrapper');
const shortid = require('shortid');
const axios = require('axios');

/**
 * Setup the base Judiciary class that handles all of the methods.
 */
class Judiciary extends EventEmitter {
  /**
   * Setup the new judiciary branch.
   * @param  {String} options.key      DigitalOcean API key.
   * @param  {String} options.tag      Tag that all servers managed by judiciary.js must have.
   * @param  {Number} options.timeout  How many ms to wait before declaring server as down.
   * @param  {Number} options.interval How frequently to run health checks.
   * @param  {Number} options.port     Port for democracy.js to listen on over UDP.
   */
  constructor({key, tag, timeout = 60000, interval = 10000, port = 12345}) {
    super();

    // Setup the options.
    this.tag = tag;
    this.timeout = timeout;
    this.interval = interval;
    this.port = port;
    this.servers = [];
    this.groups = [];
    this.democracy = {};

    // Setup the DigitalOcean connection.
    this.digitalocean = new DigitalOcean(key, 100);
  }

  /**
   * Initialize the judiciary branch by getting all of the matching servers and setting up
   * the democracy.js system and listeners.
   */
  init() {
    // Get the droplets.
    const getDroplets = () => {
      return this.digitalocean.dropletsGetAll({
        tag_name: this.tag,
        includeAll: true,
      }).then((res) => {
        // Populate the server registry.
        res.body.forEach(this.addServer);
      });
    };

    // Get the server ID.
    const getServerId = () => axios.get('http://169.254.169.254/metadata/v1/id');

    // Setup the democracy connection/listeners.
    const setupDemocracy = (metadata) => {
      // Setup the democracy connections.
      this.democracy = new Democracy({
        id: `${metadata.data}`,
        source: `0.0.0.0:${this.port}`,
        peers: this.servers.map(p => `${(p.privateIp || p.publicIp)}:${this.port}`),
        interval: this.interval,
        timeout: this.timeout,
      });

      // Setup event listeners on the democracy peers.
      this.democracy.on('added', (data) => {
        this.digitalocean.dropletsGetById(data.id).then(this.addServer);
      });
      this.democracy.on('removed', (data) => {
        console.log('REMOVED', this.democracy.isLeader(), data);
        if (!this.democracy.isLeader()) {
          return;
        }

        // Get the data for this server.
        const server = this.getServer(data.id);

        // Destroy the server.
        this.destroy(server.id);

        // Remove the server from the list.
        const index = this.servers.findIndex(s => s.id === data.id);
        if (index >= 0) {
          this.servers.splice(index, 1);
        }

        // Re-balance the group.
        this.groups
          .filter(g => g.tags.filter(tag => server.tags.includes(tag)).length)
          .forEach(this.balance);
      });
      this.democracy.on('elected', (data) => {
        console.log('ELECTED', data);
      });
    };

    return getDroplets()
      .then(getServerId)
      .then(setupDemocracy);
  }

  /**
   * Utility to get the server data from an ID.
   * @param  {String} id Server ID.
   * @return {Object}    Server data.
   */
  getServer(id) {
    return this.servers.find(s => s.id === id);
  }


  addServer(server) {
    const privateNet = server.networks.v4.find(n => n.type === 'private');
    const publicNet = server.networks.v4.find(n => n.type === 'public');
    const privateIp = privateNet ? privateNet.ip_address : null;
    const publicIp = publicNet ? publicNet.ip_address : null;

    this.servers.push({
      id: server.id,
      name: server.name,
      region: server.region.slug,
      tags: server.tags,
      privateIp,
      publicIp,
    });
  }

  /**
   * Configure a group of servers and its behavior.
   * @param  {Array}  options.tags   Tags to match for this group.
   * @param  {Number} options.size   How many servers to maintain in the group.
   * @param  {Object} options.config Config to build a new server with.
   */
  group({tags = [], size = 1, config}) {
    this.groups.push({tags, size, config});
  }

  /**
   * Checks the size of the group against the servers we are aware of and
   * removes/adds servers to get to the right size.
   * @param  {Object} group Reference to the group to balance.
   */
  balance(group) {
    // Count the number of servers in the group.
    const servers = this.servers.filter(s => s.tags.filter(tag => group.tags.includes(tag)).length);
    const diff = group.size - servers.length;
    console.log('BALANCE', {group, diff});

    // Add/remove servers to match the size.
    if (diff > 0) {
      for (let i = 0; i < diff; i += 1) {
        this.create(group.config);
      }
    } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff); i += 1) {
        this.destroy(servers[i].id);
      }
    }
  }

  /**
   * Destroy a server instance.
   * @param  {String} id Server ID.
   * @return {Promise}
   */
  destroy(id) {
    console.log('DESTROY', id);
    return this.digitalocean.dropletsDelete(id);
  }

  /**
   * Create a new server instance.
   * @param  {Object} config Config to build the server from.
   * @return {Promise}
   */
  create(config) {
    console.log('CREATE', config);
    return this.digitalocean.dropletsCreate({
      name: `${config.name}-${shortid.generate()}`,
      region: config.region,
      size: config.size,
      image: config.image,
      ssh_keys: config.ssh_keys,
      backups: config.backups,
      ipv6: config.ipv6,
      private_networking: config.private_networking,
      user_data: config.user_data,
      monitoring: config.monitoring,
      volumes: config.volumes,
      tags: config.tags,
    });
  }
}

module.exports = Judiciary;
