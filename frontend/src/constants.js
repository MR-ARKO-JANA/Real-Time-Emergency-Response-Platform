// NearHelp App — Constants
// Central place for shared constant values

export const APP_VERSION = '2.0.0';
export const APP_ID = 'com.w3bix.nearhelp';

/** LocalStorage key for offline SOS queue */
export const OFFLINE_QUEUE_KEY = 'offlineSosQueue';

/** Crisis type IDs */
export const CRISIS_TYPES = {
    MEDICAL: 'medical',
    FIRE: 'fire',
    FLOOD: 'flood',
    SECURITY: 'security',
    NATURAL_DISASTER: 'natural_disaster',
    MECHANIC: 'mechanic',
    OTHER: 'other',
};

/** Socket events */
export const SOCKET_EVENTS = {
    TRIGGER_SOS: 'trigger_sos',
    NEW_SOS: 'new_sos',
    SOS_CONFIRMED: 'sos_confirmed',
    SOS_FAILED: 'sos_failed',
    SOS_RESOLVED: 'sos_resolved',
    ACCEPT_SOS: 'accept_sos',
    RESPONDER_MOVED: 'responder_moved',
    ACTIVE_INCIDENTS: 'active_incidents',
    SEND_CHAT: 'send_chat_message',
    RECEIVE_CHAT: 'receive_chat_message',
};
