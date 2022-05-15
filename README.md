# wasd.tv-bot

[![Npm Version](https://img.shields.io/npm/v/wasd.tv-bot.svg?style=flat)](https://www.npmjs.org/package/wasd.tv-bot)
[![Downloads](https://img.shields.io/npm/dm/wasd.tv-bot.svg?style=flat)](https://www.npmjs.org/package/wasd.tv-bot)

## Install

### Node

```bash
$ npm i wasd.tv-bot
```

```js
const WASD = require('wasd.tv-bot');

WASD.init(`channel_name`, `access_token`); // ACCESS_TOKEN: https://wasd.tv/general-settings/API


WASD.event.on('ready', async (status) => {
    if (label == "APIConnect") {
        await WASD.getChannelInfo();
        await WASD.getChannelInfo();
        await WASD.getChannelSubs();
        await WASD.setChatMode(chatRoleLimitMode, chatDelayLimitMode);
        await WASD.addModerator(userId);
        await WASD.removeModerator(userId);
        await WASD.banUser(userId, keepMessages, minutes);
        await WASD.unbanUser(userId);
        await WASD.getChannelModerators(userId);
        await WASD.getChannelBans(userId)
            .then((result) => {
            // do nothing
        });
    }
});

WASD.event.on('message', (message) => {
    // BadWords Ban
    if (['badword1', 'badword2'].some(bw => message.message.includes(bw))) {
        WASD.banUser(message.user_id, false, 10);
    }
});

WASD.event.on('follow', (event) => {
    // do nothing
});

WASD.event.on('subscribe', (event) => {
    // do nothing
});

WASD.event.on('error', (label, err) => {
    // do nothing
});
```

## Community

- Found a bug: [submit an issue.](https://github.com/idaspin/wasd.tv-bot/issues/new)
- Discussion and help about wasd.tv-bot: [🇷🇺 Discord Server](https://discord.gg/YeqrTtpmaH)