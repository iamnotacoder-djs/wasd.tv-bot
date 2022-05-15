const WASD = require('./WASD.js'); // require('wasd.tv-bot')

// ACCESS_TOKEN: https://wasd.tv/general-settings/API
WASD.init(`idoaspin`, `access_token`);

WASD.event.on('ready', async (status) => {
    let status_example = {
        actions: [
          'WRITE_TO_CHAT',
          'WRITE_TO_FOLLOWERS_CHAT',
          'WRITE_TO_SUBSCRIPTION_CHAT',
          'VIEW_BANNED_USERS',
          'ASSIGN_MODERATOR',
          'BAN_USER',
          'DELETE_MESSAGE',
          'WRITE_NO_DELAY'
        ],
        user_channel_role: 'CHANNEL_OWNER',
        other_roles: [],
        user_sticker_packs: [],
        chat_settings: { goodbyeBetaGifts: '0' }
    };
});

WASD.event.on('message', (message) => {
    let message_example = {
        id: '216dc720-c908-40dd-86af-979c6a744c29',
        user_id: 1178907,
        message: 'test',
        user_login: 'idoaspin',
        user_avatar: {
          large: 'https://st.wasd.tv/upload/avatars/a1451e2d-4f2a-46d0-bf34-d1928491875d/original.jpeg',
          small: 'https://st.wasd.tv/upload/avatars/a1451e2d-4f2a-46d0-bf34-d1928491875d/original.jpeg',
          medium: 'https://st.wasd.tv/upload/avatars/a1451e2d-4f2a-46d0-bf34-d1928491875d/original.jpeg'
        },
        hash: 'cl339cin1000t399v12f48cy5',
        is_follower: false,
        other_roles: [],
        user_channel_role: 'CHANNEL_OWNER',
        channel_id: 1087064,
        stream_id: 983499,
        date_time: '2022-05-12T17:01:22.954Z',
        streamer_id: 1178907
    };
    
    if (['badword1', 'badword2'].some(bw => message.message.includes(bw))) {
        WASD.banUser(message.user_id, false, 10);
    }
});

WASD.event.on('follow', (event) => {
    let event_example = {
        event_type: 'NEW_FOLLOWER',
        id: '06d2b383-440d-4d15-8dd0-198c697ad364',
        payload: {
          user_id: 333442,
          channel_id: 1087064,
          user_login: 'idaspin_channel'
        },
        message: 'подписался на канал!'
    };
});

WASD.event.on('subscribe', (event) => {
    let event_example = {
        "channel_id": 1087064,
        "other_roles": [],
        "product_name": "subscription_v2",
        "product_code": "subscription_v2",
        "user_id": 333442,
        "user_login": "idoaspin",
        "validity_months": 1
    };
});

WASD.event.on('error', (label, err) => {
});