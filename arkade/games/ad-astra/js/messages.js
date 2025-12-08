// Ad Astra - Message Board System
// messages.js - Port-based bulletin board for player communication

import { Utils } from './utils.js';

export class MessageBoard {
    constructor() {
        this.MESSAGE_TYPES = {
            GENERAL: { name: 'General', icon: '💬', color: '#4488ff' },
            TRADE: { name: 'Trade', icon: '💰', color: '#44ff44' },
            INTEL: { name: 'Intel', icon: '🔍', color: '#ffaa44' },
            HELP: { name: 'Help', icon: '❓', color: '#ff44ff' },
            BOUNTY: { name: 'Bounty', icon: '💀', color: '#ff4444' },
            CORPORATE: { name: 'Corporate', icon: '🏢', color: '#44ffff' },
            WARNING: { name: 'Warning', icon: '⚠️', color: '#ffff44' }
        };

        this.MAX_MESSAGES_PER_PORT = 100;
        this.MESSAGE_EXPIRY_DAYS = 7;
        this.MAX_MESSAGE_LENGTH = 500;
        this.MAX_SUBJECT_LENGTH = 80;
    }

    // Get all messages for a specific location (port/planet)
    getMessages(locationId, filters = {}) {
        const storageKey = `messages_${locationId}`;
        let messages = Utils.storage.get(storageKey) || [];

        // Remove expired messages
        const now = Date.now();
        const expiryTime = this.MESSAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        messages = messages.filter(msg => (now - msg.timestamp) < expiryTime);

        // Apply filters
        if (filters.type) {
            messages = messages.filter(msg => msg.type === filters.type);
        }
        if (filters.author) {
            messages = messages.filter(msg =>
                msg.author.toLowerCase().includes(filters.author.toLowerCase())
            );
        }
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            messages = messages.filter(msg =>
                msg.subject.toLowerCase().includes(term) ||
                msg.body.toLowerCase().includes(term)
            );
        }

        // Sort by timestamp (newest first)
        messages.sort((a, b) => b.timestamp - a.timestamp);

        // Save cleaned messages back
        Utils.storage.set(storageKey, messages);

        return messages;
    }

    // Post a new message
    postMessage(locationId, author, type, subject, body, tags = []) {
        // Validation
        if (!locationId || !author || !type || !subject || !body) {
            return { success: false, error: 'Missing required fields' };
        }

        if (!this.MESSAGE_TYPES[type]) {
            return { success: false, error: 'Invalid message type' };
        }

        if (subject.length > this.MAX_SUBJECT_LENGTH) {
            return { success: false, error: `Subject too long (max ${this.MAX_SUBJECT_LENGTH} chars)` };
        }

        if (body.length > this.MAX_MESSAGE_LENGTH) {
            return { success: false, error: `Message too long (max ${this.MAX_MESSAGE_LENGTH} chars)` };
        }

        const storageKey = `messages_${locationId}`;
        const messages = Utils.storage.get(storageKey) || [];

        // Check message limit
        if (messages.length >= this.MAX_MESSAGES_PER_PORT) {
            // Remove oldest message
            messages.sort((a, b) => a.timestamp - b.timestamp);
            messages.shift();
        }

        // Create new message
        const message = {
            id: Utils.generateId(),
            locationId: locationId,
            author: author,
            type: type,
            subject: subject.trim(),
            body: body.trim(),
            timestamp: Date.now(),
            replies: [],
            tags: tags,
            edited: false,
            editTimestamp: null
        };

        messages.push(message);
        Utils.storage.set(storageKey, messages);

        return { success: true, message: message };
    }

    // Reply to a message
    replyToMessage(locationId, messageId, author, body) {
        if (!body || body.length > this.MAX_MESSAGE_LENGTH) {
            return { success: false, error: 'Invalid reply body' };
        }

        const storageKey = `messages_${locationId}`;
        const messages = Utils.storage.get(storageKey) || [];
        const message = messages.find(m => m.id === messageId);

        if (!message) {
            return { success: false, error: 'Message not found' };
        }

        const reply = {
            id: Utils.generateId(),
            author: author,
            body: body.trim(),
            timestamp: Date.now()
        };

        message.replies.push(reply);
        Utils.storage.set(storageKey, messages);

        return { success: true, reply: reply };
    }

    // Delete a message (only by author or admin)
    deleteMessage(locationId, messageId, requestingUser, isAdmin = false) {
        const storageKey = `messages_${locationId}`;
        const messages = Utils.storage.get(storageKey) || [];
        const messageIndex = messages.findIndex(m => m.id === messageId);

        if (messageIndex === -1) {
            return { success: false, error: 'Message not found' };
        }

        const message = messages[messageIndex];

        // Check permissions
        if (!isAdmin && message.author !== requestingUser) {
            return { success: false, error: 'You can only delete your own messages' };
        }

        messages.splice(messageIndex, 1);
        Utils.storage.set(storageKey, messages);

        return { success: true };
    }

    // Edit a message (only by author within 1 hour)
    editMessage(locationId, messageId, author, newBody) {
        const storageKey = `messages_${locationId}`;
        const messages = Utils.storage.get(storageKey) || [];
        const message = messages.find(m => m.id === messageId);

        if (!message) {
            return { success: false, error: 'Message not found' };
        }

        if (message.author !== author) {
            return { success: false, error: 'You can only edit your own messages' };
        }

        // Check if message is older than 1 hour
        const hourInMs = 60 * 60 * 1000;
        if (Date.now() - message.timestamp > hourInMs) {
            return { success: false, error: 'Messages can only be edited within 1 hour of posting' };
        }

        if (newBody.length > this.MAX_MESSAGE_LENGTH) {
            return { success: false, error: `Message too long (max ${this.MAX_MESSAGE_LENGTH} chars)` };
        }

        message.body = newBody.trim();
        message.edited = true;
        message.editTimestamp = Date.now();

        Utils.storage.set(storageKey, messages);

        return { success: true, message: message };
    }

    // Get message statistics for a location
    getStats(locationId) {
        const messages = this.getMessages(locationId);
        const stats = {
            total: messages.length,
            byType: {},
            recentActivity: 0,
            topAuthors: {}
        };

        // Count messages by type
        for (const type in this.MESSAGE_TYPES) {
            stats.byType[type] = messages.filter(m => m.type === type).length;
        }

        // Count recent activity (last 24 hours)
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        stats.recentActivity = messages.filter(m => m.timestamp > dayAgo).length;

        // Count messages by author
        messages.forEach(msg => {
            stats.topAuthors[msg.author] = (stats.topAuthors[msg.author] || 0) + 1;
        });

        return stats;
    }

    // Clear all messages from a location (admin only)
    clearMessages(locationId) {
        const storageKey = `messages_${locationId}`;
        Utils.storage.set(storageKey, []);
        return { success: true };
    }

    // Get unread message count (based on last visit timestamp)
    getUnreadCount(locationId, lastVisit = 0) {
        const messages = this.getMessages(locationId);
        return messages.filter(m => m.timestamp > lastVisit).length;
    }

    // Format message for display
    formatMessage(message) {
        const type = this.MESSAGE_TYPES[message.type];
        const date = new Date(message.timestamp);
        const dateStr = date.toLocaleString();

        let formatted = `${type.icon} [${type.name}] ${message.subject}\n`;
        formatted += `By: ${message.author} | ${dateStr}`;

        if (message.edited) {
            formatted += ' (edited)';
        }

        formatted += `\n\n${message.body}`;

        if (message.replies.length > 0) {
            formatted += `\n\n--- ${message.replies.length} ${message.replies.length === 1 ? 'Reply' : 'Replies'} ---`;
            message.replies.forEach(reply => {
                const replyDate = new Date(reply.timestamp).toLocaleString();
                formatted += `\n\n↳ ${reply.author} (${replyDate}):\n  ${reply.body}`;
            });
        }

        return formatted;
    }
}

export default MessageBoard;
