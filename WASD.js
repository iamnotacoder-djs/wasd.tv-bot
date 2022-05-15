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

    /**
     * Получение информации о пользователе. Подключение к WebSocket серверу.
     * @date 2022-05-15
     * @param {String} userName Имя пользователя/канала
     * @param {String} access_token Access_Token (Получить можно здесь: https://wasd.tv/general-settings/API)
     * @param {Number} streamId ID стрима (Опционально)
     * @returns {null}
     */
    async init(userName = ``, access_token = ``, streamId) {
        this.userName = userName;
        this.#ACCESS_TOKEN = access_token;
        try {
            this.#JWT_TOKEN = await this.#getJWTToken();

            let userInfo = await this.getUserInfo(this.userName);
            this.channelId = userInfo.channel_id;
            this.userId = userInfo.user_id;

            this.streamId = await this.getStreamId(this.channelId);
        } catch (err) {
            this.event.emit('error', `GettingTokenError`, err);
            console.log(`I'll try to reconnect in 10 seconds.`);
            return setTimeout(() => {
                this.init()
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
    
    /**
     * Получение информации о пользователе
     * @date 2022-05-15
     * @param {String} userName Имя пользователя/канала
     * @returns {Promise} 
     */
    getUserInfo(userName = this.userName) {
        return new Promise((resolve, reject) => {
            var options = {
                method: "GET",
                url: `https://wasd.tv/api/channels/nicknames/${userName}`,
                headers: {
                   'Authorization': `Token ${this.#ACCESS_TOKEN}`
                }
            }
            request(options, (error, response, body) => {
                if (error) return reject();
                let json = JSON.parse(body);
                resolve(json.result);
            });
        });
    }
    
    /**
     * Получить ID последнего стрима на канале пользователя в публичном доступе
     * @date 2022-05-15
     * @param {Number} channelid ID канала
     * @returns {Promise}
     */
    getStreamId(channelid = this.channelId) {
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
        this.getStreamId(this.channelId)
            .then((streamId) => {
                if (streamId != this.streamId) this.init();
            })
        setTimeout(() => {
            this.#pingServer();
        }, 1000 * 25);
    }
    
    /**
     * Получение информации о канале пользователя
     * @date 2022-05-15
     * @param {String} username Имя пользователя/канала
     * @returns {Promise} 
     */
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
    
    /**
     * Получение массива последних 50 платных подписок на канале
     * @date 2022-05-15
     * @returns {Promise}
     */
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
    
    /**
     * Установка режима чата
     * @date 2022-05-15
     * @param {Number} chatRoleLimitMode 0 - чат доступен для всех, 1 - чат для фолловеров, 2 - чат для платных подписчиков
     * @param {Number} chatDelayLimitMode Количество секунд, через которое можно отправлять сообщения
     * @returns {Promise}
     */
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
    
    /**
     * Добавление модератора
     * @date 2022-05-15
     * @param {Number} userId ID пользователя
     * @returns {Promise}
     */
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
    
    /**
     * Удаление модератора
     * @date 2022-05-15
     * @param {Number} userId ID пользователя
     * @returns {Promise}
     */
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
    
    /**
     * Бан пользователя
     * @date 2022-05-15
     * @param {Number} userId ID пользователя
     * @param {Boolean} keepMessages Удаление сообщений
     * @param {Number} minutes Длительность бана в минутах
     * @returns {Promise}
     */
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
    
    /**
     * Разблокировка пользователя
     * @date 2022-05-15
     * @param {Number} userId ID пользователя
     * @returns {Promise}
     */
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
    
    /**
     * Получение списка модераторов канала пользователя
     * @date 2022-05-15
     * @param {Number} userId ID владельца канала
     * @returns {Promise}
     */
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
    
    /**
     * Получение списка банов на канале пользователя
     * @date 2022-05-15
     * @param {Number} userId ID владельца канала
     * @returns {Promise}
     */
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