'use strict';

const io = require('socket.io-client'),
      request = require('request'),
      EventEmitter = require('events');

// https://wasd.tv/faq/dev
class WASD {

    event = new EventEmitter();

    #JWT_TOKEN = ``;
    #ACCESS_TOKEN = ``;
    userName = ``;
    userId = 0;
    channelId = 0;
    streamId = 0;
  
    #socket = ``;

    constructor() {
    }

    async init(userName = ``, access_token = ``, streamId) {
        this.userName = userName;
        this.#ACCESS_TOKEN = access_token;
        try {
            this.#JWT_TOKEN = await this.#getJWTToken();
            this.channelId = await this.#getChannelId(this.userName);
            this.userId = await this.#getUserId(this.userName);
            this.streamId = await this.#getStreamId(this.channelId);
        } catch (err) {
            this.event.emit('error', `GettingTokenError`, err);
            console.log(`I'll try to reconnect in 10 seconds.`);
            return setTimeout(() => {
                this.init();
            }, 1000 * 10);
        }
        this.streamId = streamId ?? this.streamId;

        console.log(`Trying to connect:\n${this.userName} (ID: ${this.channelId}) | StreamID: ${this.streamId}`);
        this.#socket = io('wss://chat.wasd.tv', {
            transports: ["websocket"],
            query: {
                path: '/socket.io',
                EIO: 3
            }
        });
      
        this.#socket.on("connect_error", (err) => {
            this.event.emit('error', `APIConnectError`, err);
            console.log(`I'll try to reconnect in 10 seconds.`);
            setTimeout(() => {
              this.init();
            }, 1000 * 10);
        });
      
        this.#socket.on('connect', () => {
            this.event.emit('ready', `APIConnect`);
            this.#joinChat();
        });
      
        this.#socket.on('message', (message) => {
            this.event.emit('message', message);
        });
      
        this.#socket.on('event', (event) => {
            this.event.emit('follow', event);
        });
      
        this.#socket.on('subscribe', (event) => {
            this.event.emit('subscribe', event);
        });
      
        this.#socket.on('close', () => {
            this.event.emit('error', `APIDisconnect`);
        });
    }

    #getJWTToken() {
        return new Promise((resolve, reject) => {
            var options = {
                method: "GET",
                url: "https://wasd.tv/api/auth/chat-token",
                headers: {
                   'Authorization': `Token ${this.#ACCESS_TOKEN}`
                }
            }
            request(options, (error, response, body) => {
                if (error) return reject();
                let json = JSON.parse(body);
                if (json.result) return resolve(json.result);
                reject(json);
            });
        });
    }
    
    #getChannelId(username = this.userName) {
        return new Promise((resolve, reject) => {
            var options = {
                method: "GET",
                url: `https://wasd.tv/api/channels/nicknames/${username}`,
                headers: {
                   'Authorization': `Token ${this.#ACCESS_TOKEN}`
                }
            }
            request(options, (error, response, body) => {
                if (error) return reject();
                let json = JSON.parse(body);
                if (json.result.channel_id) return resolve(json.result.channel_id);
                reject(json);
            });
        });
    }
    
    #getUserId(username = this.userName) {
        return new Promise((resolve, reject) => {
            var options = {
                method: "GET",
                url: `https://wasd.tv/api/channels/nicknames/${username}`,
                headers: {
                   'Authorization': `Token ${this.#ACCESS_TOKEN}`
                }
            }
            request(options, (error, response, body) => {
                if (error) return reject();
                let json = JSON.parse(body);
                if (json.result.user_id) return resolve(json.result.user_id);
                reject(json);
            });
        });
    }
    
    #getStreamId(channelid = this.channelId) {
        return new Promise((resolve, reject) => {
            var options = {
                method: "GET",
                url: `https://wasd.tv/api/v2/media-containers?limit=1&offset=0&media_container_status=RUNNING,STOPPED&media_container_type=SINGLE&channel_id=${channelid}`,
                headers: {
                   'Authorization': `Token ${this.#ACCESS_TOKEN}`
                }
            }
            request(options, (error, response, body) => {
                if (error) return reject();
                let json = JSON.parse(body);
                if (json.result[0].media_container_streams[0].stream_id) return resolve(json.result[0].media_container_streams[0].stream_id);
                reject(json);
            });
        });
    }
  
    #joinChat() {
        this.#socket.emit('join', {
            streamId: this.streamId,
            channelId: this.channelId,
            jwt: this.#JWT_TOKEN,
            excludeStickers: true
        });
        
        this.#socket.on('joined', (opts) => {
            console.log(`Joined to the chat with the options:`);
            console.log(opts);
            this.event.emit('ready', `chatJoin`, opts);
            this.#pingServer();
        });
    }

    #pingServer() {
        this.#socket.emit('2');
        setTimeout(() => {
            this.#pingServer();
        }, 1000 * 25);
    }
    
    getChannelInfo(userName = this.userName) {
        return new Promise((resolve, reject) => {
            var options = {
                method: "GET",
                url: `https://wasd.tv/api/v2/broadcasts/public?channel_name=${userName}`,
                headers: {
                   'Authorization': `Token ${this.#ACCESS_TOKEN}`
                }
            }
            request(options, (error, response, body) => {
                if (error) return reject(error);
                resolve(JSON.parse(body));
            });
        });
    }
    
    getChannelSubs() {
        return new Promise((resolve, reject) => {
            var options = {
                method: "GET",
                url: `https://wasd.tv/api/chat/streams/${this.streamId}/messages?&type=SUBSCRIBE&limit=50&offset=0`,
                headers: {
                   'Authorization': `Token ${this.#ACCESS_TOKEN}`
                }
            }
            request(options, (error, response, body) => {
                if (error) return reject(error);
                resolve(JSON.parse(body));
            });
        });
    }
    
    setChatMode(chatRoleLimitMode = 0, chatDelayLimitMode = 0) {
        if (![0, 1, 2].includes(chatRoleLimitMode)) chatRoleLimitMode = 0;
        if (![0, 5, 10, 30, 60].includes(chatDelayLimitMode)) chatDelayLimitMode = 0;
        return new Promise((resolve, reject) => {
            var options = {
                method: "POST",
                url: `https://wasd.tv/api/chat/streams/${this.streamId}/settings`,
                headers: {
                   'Authorization': `Token ${this.#ACCESS_TOKEN}`
                },
                formData: {
                    'chatRoleLimitMode': `${chatRoleLimitMode}`,
                    'chatDelayLimitMode': `${chatDelayLimitMode}`
                }
            }
            request(options, (error, response, body) => {
                if (error) return reject(error);
                resolve(JSON.parse(body));
            });
        });
    }
    
    addModerator(userId = 0) {
        return new Promise((resolve, reject) => {
            var options = {
                method: "PUT",
                url: `https://wasd.tv/api/channels/${this.channelId}/moderators`,
                headers: {
                   'Authorization': `Token ${this.#ACCESS_TOKEN}`
                },
                formData: {
                    'user_id': `${userId}`
                }
            }
            request(options, (error, response, body) => {
                if (error) return reject(error);
                resolve();
            });
        });
    }
    
    removeModerator(userId = 0) {
        return new Promise((resolve, reject) => {
            var options = {
                method: "DELETE",
                url: `https://wasd.tv/api/channels/${this.channelId}/moderators/${userId}`,
                headers: {
                   'Authorization': `Token ${this.#ACCESS_TOKEN}`
                }
            }
            request(options, (error, response, body) => {
                if (error) return reject(error);
                resolve();
            });
        });
    }
    
    banUser(userId = 0, keepMessages = true, minutes = 10) {
        return new Promise((resolve, reject) => {
            var options = {
                method: "PUT",
                url: `https://wasd.tv/api/channels/${this.channelId}/banned-users`,
                headers: {
                   'Authorization': `Token ${this.#ACCESS_TOKEN}`
                },
                formData: {
                    'user_id': `${userId}`,
                    'stream_id': `${this.streamId}`,
                    'keep_messages': `${keepMessages}`,
                    'duration': `${minutes}`
                }
            }
            request(options, (error, response, body) => {
                if (error) return reject(error);
                resolve();
            });
        });
    }
    
    unbanUser(userId = 0) {
        return new Promise((resolve, reject) => {
            var options = {
                method: "DELETE",
                url: `https://wasd.tv/api/channels/${this.channelId}/banned-users/${userId}`,
                headers: {
                   'Authorization': `Token ${this.#ACCESS_TOKEN}`
                }
            }
            request(options, (error, response, body) => {
                if (error) return reject(error);
                resolve();
            });
        });
    }
    
    getChannelModerators(userId = this.userId) {
        return new Promise((resolve, reject) => {
            var options = {
                method: "GET",
                url: `https://wasd.tv/api/chat/streamers/${userId}/moderators`,
                headers: {
                   'Authorization': `Token ${this.#ACCESS_TOKEN}`
                }
            }
            request(options, (error, response, body) => {
                if (error) return reject(error);
                resolve(JSON.parse(body));
            });
        });
    }
    
    getChannelBans(userId = this.userId) {
        return new Promise((resolve, reject) => {
            var options = {
                method: "GET",
                url: `https://wasd.tv/api/chat/streamers/${userId}/ban`,
                headers: {
                   'Authorization': `Token ${this.#ACCESS_TOKEN}`
                }
            }
            request(options, (error, response, body) => {
                if (error) return reject(error);
                resolve(JSON.parse(body));
            });
        });
    }
}

module.exports = new WASD();