// Ad Astra - Message Board UI Handlers
// messageboard-handlers.js - Handle message board UI interactions

import { Utils } from './utils.js';

export class MessageBoardHandlers {
    constructor(game) {
        this.game = game;
    }

    showMessageBoard() {
        if (!this.game.currentLocation || !this.game.currentLocation.messageBoard) {
            this.game.ui.showError('No message board available at this location');
            return;
        }

        this.game.ui.showView('messageboard');

        // Set title based on location
        const title = this.game.currentLocation.name + ' - Message Board';
        document.getElementById('messageboard-title').textContent = title;

        // Load messages
        this.loadMessages();
    }

    loadMessages() {
        if (!this.game.currentLocation) return;

        const locationId = `${this.game.currentLocation.type}_${this.game.currentLocation.name}`;

        // Get filters
        const typeFilter = document.getElementById('mb-filter-type').value;
        const searchTerm = document.getElementById('mb-search').value;

        const filters = {};
        if (typeFilter) filters.type = typeFilter;
        if (searchTerm) filters.searchTerm = searchTerm;

        // Get messages
        const messages = this.game.messageBoard.getMessages(locationId, filters);

        // Get stats
        const stats = this.game.messageBoard.getStats(locationId);

        // Render stats
        this.renderMessageStats(stats);

        // Render messages
        this.renderMessageList(messages);
    }

    renderMessageStats(stats) {
        const statsDiv = document.getElementById('messageboard-stats');
        let html = '<div class="stat-item">';
        html += '<span class="stat-label">Total Messages:</span>';
        html += `<span class="stat-value">${stats.total}</span>`;
        html += '</div>';

        html += '<div class="stat-item">';
        html += '<span class="stat-label">Last 24h:</span>';
        html += `<span class="stat-value">${stats.recentActivity}</span>`;
        html += '</div>';

        // Show type breakdown
        for (const [type, count] of Object.entries(stats.byType)) {
            if (count > 0) {
                const typeInfo = this.game.messageBoard.MESSAGE_TYPES[type];
                html += '<div class="stat-item">';
                html += `<span>${typeInfo.icon} ${typeInfo.name}:</span>`;
                html += `<span class="stat-value">${count}</span>`;
                html += '</div>';
            }
        }

        statsDiv.innerHTML = html;
    }

    renderMessageList(messages) {
        const listDiv = document.getElementById('messageboard-list');

        if (messages.length === 0) {
            listDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <div class="empty-state-text">No messages found</div>
                    <div class="empty-state-subtext">Be the first to post!</div>
                </div>
            `;
            return;
        }

        let html = '';
        messages.forEach(msg => {
            const typeInfo = this.game.messageBoard.MESSAGE_TYPES[msg.type];
            const date = new Date(msg.timestamp);
            const timeAgo = this.getTimeAgo(msg.timestamp);

            html += `<div class="message-item" onclick="window.game.messageBoardHandlers.viewMessage('${msg.id}')">`;
            html += `<div class="message-header">`;
            html += `<span class="message-type ${msg.type}">${typeInfo.icon} ${typeInfo.name}</span>`;
            if (msg.replies.length > 0) {
                html += `<span class="message-reply-count">💬 ${msg.replies.length}</span>`;
            }
            html += `</div>`;
            html += `<div class="message-subject">${Utils.escapeHtml(msg.subject)}</div>`;
            html += `<div class="message-meta">`;
            html += `<span class="message-author">By: ${Utils.escapeHtml(msg.author)}</span>`;
            html += `<span class="message-time">${timeAgo}</span>`;
            html += `</div>`;
            html += `<div class="message-preview">${Utils.escapeHtml(msg.body.substring(0, 100))}${msg.body.length > 100 ? '...' : ''}</div>`;
            html += `</div>`;
        });

        listDiv.innerHTML = html;
    }

    viewMessage(messageId) {
        if (!this.game.currentLocation) return;

        const locationId = `${this.game.currentLocation.type}_${this.game.currentLocation.name}`;
        const messages = this.game.messageBoard.getMessages(locationId);
        const message = messages.find(m => m.id === messageId);

        if (!message) {
            this.game.ui.showError('Message not found');
            return;
        }

        // Hide list, show detail
        document.getElementById('messageboard-list').style.display = 'none';
        document.getElementById('messageboard-controls').style.display = 'none';
        document.getElementById('messageboard-stats').style.display = 'none';

        const detailDiv = document.getElementById('messageboard-detail');
        detailDiv.style.display = 'block';

        // Render message
        const typeInfo = this.game.messageBoard.MESSAGE_TYPES[message.type];
        const date = new Date(message.timestamp);

        let html = `<div class="message-full">`;
        html += `<span class="message-type ${message.type}">${typeInfo.icon} ${typeInfo.name}</span>`;
        html += `<div class="message-subject">${Utils.escapeHtml(message.subject)}</div>`;
        html += `<div class="message-meta">`;
        html += `<span class="message-author">By: ${Utils.escapeHtml(message.author)}</span>`;
        html += `<span class="message-time">${date.toLocaleString()}</span>`;
        if (message.edited) {
            html += `<span style="color: #888;"> (edited)</span>`;
        }
        html += `</div>`;
        html += `<div class="message-body">${Utils.escapeHtml(message.body)}</div>`;

        // Actions
        html += `<div class="message-actions">`;
        html += `<button class="btn-primary" onclick="window.game.messageBoardHandlers.showReplyForm('${message.id}')">Reply</button>`;
        html += `<button class="btn-secondary" onclick="window.game.messageBoardHandlers.backToMessageList()">Back to List</button>`;
        if (message.author === this.game.gameState.currentUser) {
            html += `<button class="btn-secondary" onclick="window.game.messageBoardHandlers.deleteMessage('${message.id}')">Delete</button>`;
        }
        html += `</div>`;
        html += `</div>`;

        // Render replies
        if (message.replies.length > 0) {
            html += `<div class="message-replies">`;
            html += `<h4>${message.replies.length} ${message.replies.length === 1 ? 'Reply' : 'Replies'}</h4>`;
            message.replies.forEach(reply => {
                const replyDate = new Date(reply.timestamp);
                html += `<div class="reply-item">`;
                html += `<div class="reply-header">`;
                html += `<span class="message-author">${Utils.escapeHtml(reply.author)}</span>`;
                html += `<span class="message-time">${replyDate.toLocaleString()}</span>`;
                html += `</div>`;
                html += `<div class="reply-body">${Utils.escapeHtml(reply.body)}</div>`;
                html += `</div>`;
            });
            html += `</div>`;
        }

        detailDiv.innerHTML = html;
        this.game.currentMessageId = messageId;
    }

    backToMessageList() {
        document.getElementById('messageboard-list').style.display = 'block';
        document.getElementById('messageboard-controls').style.display = 'flex';
        document.getElementById('messageboard-stats').style.display = 'flex';
        document.getElementById('messageboard-detail').style.display = 'none';
        document.getElementById('messageboard-reply-form').style.display = 'none';
        this.game.currentMessageId = null;
        this.loadMessages();
    }

    filterMessages() {
        this.loadMessages();
    }

    showPostForm() {
        document.getElementById('messageboard-list').style.display = 'none';
        document.getElementById('messageboard-post-form').style.display = 'block';

        // Clear form
        document.getElementById('mb-post-type').value = 'GENERAL';
        document.getElementById('mb-post-subject').value = '';
        document.getElementById('mb-post-body').value = '';
        document.getElementById('mb-subject-count').textContent = '0';
        document.getElementById('mb-body-count').textContent = '0';
    }

    hidePostForm() {
        document.getElementById('messageboard-list').style.display = 'block';
        document.getElementById('messageboard-post-form').style.display = 'none';
    }

    submitPost() {
        const type = document.getElementById('mb-post-type').value;
        const subject = document.getElementById('mb-post-subject').value.trim();
        const body = document.getElementById('mb-post-body').value.trim();

        if (!subject || !body) {
            this.game.ui.showError('Please fill in both subject and message body');
            return;
        }

        const locationId = `${this.game.currentLocation.type}_${this.game.currentLocation.name}`;
        const author = this.game.gameState.gameData.pilotName || this.game.gameState.currentUser || 'Anonymous';

        const result = this.game.messageBoard.postMessage(locationId, author, type, subject, body);

        if (result.success) {
            this.game.ui.addMessage('Message posted successfully!', 'success');
            this.hidePostForm();
            this.loadMessages();
        } else {
            this.game.ui.showError(result.error);
        }
    }

    showReplyForm(messageId) {
        document.getElementById('messageboard-detail').style.display = 'none';
        document.getElementById('messageboard-reply-form').style.display = 'block';

        // Clear form
        document.getElementById('mb-reply-body').value = '';
        document.getElementById('mb-reply-count').textContent = '0';

        this.game.currentReplyMessageId = messageId;
    }

    hideReplyForm() {
        document.getElementById('messageboard-detail').style.display = 'block';
        document.getElementById('messageboard-reply-form').style.display = 'none';
    }

    submitReply() {
        const body = document.getElementById('mb-reply-body').value.trim();

        if (!body) {
            this.game.ui.showError('Please enter a reply message');
            return;
        }

        const locationId = `${this.game.currentLocation.type}_${this.game.currentLocation.name}`;
        const author = this.game.gameState.gameData.pilotName || this.game.gameState.currentUser || 'Anonymous';

        const result = this.game.messageBoard.replyToMessage(locationId, this.game.currentReplyMessageId, author, body);

        if (result.success) {
            this.game.ui.addMessage('Reply posted successfully!', 'success');
            this.hideReplyForm();
            this.viewMessage(this.game.currentReplyMessageId);
        } else {
            this.game.ui.showError(result.error);
        }
    }

    deleteMessage(messageId) {
        if (!confirm('Are you sure you want to delete this message?')) {
            return;
        }

        const locationId = `${this.game.currentLocation.type}_${this.game.currentLocation.name}`;
        const result = this.game.messageBoard.deleteMessage(locationId, messageId, this.game.gameState.currentUser);

        if (result.success) {
            this.game.ui.addMessage('Message deleted', 'info');
            this.backToMessageList();
        } else {
            this.game.ui.showError(result.error);
        }
    }

    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

        return new Date(timestamp).toLocaleDateString();
    }
}

export default MessageBoardHandlers;