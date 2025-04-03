// Help Modal Functionality
document.addEventListener('DOMContentLoaded', function() {
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeHelpBtn = document.getElementById('closeHelpBtn');

    helpBtn.addEventListener('click', function() {
        helpModal.classList.remove('hidden');
    });

    closeHelpBtn.addEventListener('click', function() {
        helpModal.classList.add('hidden');
    });

    // Close modal when clicking outside
    helpModal.addEventListener('click', function(e) {
        if (e.target === helpModal) {
            helpModal.classList.add('hidden');
        }
    });

    // Close modal on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !helpModal.classList.contains('hidden')) {
            helpModal.classList.add('hidden');
        }
    });
});

// Alpine.js Chat Application
function chatApp() {
    return {
        userInput: '',
        messages: [],
        conversations: [],
        isLoading: false,
        currentConversationId: null,
        typingAnimationClass: 'sneaker-typing-animation',
        sessionTimeout: null,
        sessionTimeoutDuration: 30 * 60 * 1000, // 30 minutes

        init() {
            // Auto-scroll to bottom when messages change
            this.$watch('messages', () => {
                this.scrollToBottom();
            });
            
            // Set up session timeout
            this.resetSessionTimeout();
            
            // Add welcome animation class
            setTimeout(() => {
                const welcomeMessage = document.querySelector('#chatContainer > div:first-child');
                if (welcomeMessage) {
                    welcomeMessage.classList.add('message-bounce');
                }
            }, 100);
        },

        scrollToBottom() {
            setTimeout(() => {
                const container = document.getElementById('chatContainer');
                container.scrollTop = container.scrollHeight;
            }, 100);
        },
        
        resetSessionTimeout() {
            // Clear existing timeout
            if (this.sessionTimeout) {
                clearTimeout(this.sessionTimeout);
            }
            
            // Set new timeout
            this.sessionTimeout = setTimeout(() => {
                this.handleSessionTimeout();
            }, this.sessionTimeoutDuration);
        },
        
        handleSessionTimeout() {
            this.messages.push({
                role: 'assistant',
                content: 'Your session has timed out due to inactivity. Would you like to continue where you left off?'
            });
            
            // Track session timeout event
            this.trackEvent('session_timeout', {
                conversation_id: this.currentConversationId,
                message_count: this.messages.length
            });
        },

        async sendMessage() {
            if (!this.userInput.trim() || this.isLoading) return;
            
            const userMessage = this.userInput.trim();
            this.messages.push({
                role: 'user',
                content: userMessage
            });
            
            // Add animation class to the new message
            setTimeout(() => {
                const messages = document.querySelectorAll('#chatContainer > div');
                const lastMessage = messages[messages.length - 1];
                if (lastMessage) {
                    lastMessage.classList.add('message-bounce');
                }
            }, 10);
            
            this.userInput = '';
            this.isLoading = true;
            
            // Reset session timeout on user activity
            this.resetSessionTimeout();
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: userMessage,
                        conversation_id: this.currentConversationId
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Network response error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    this.handleError(data.error);
                    return;
                }
                
                // Add AI response with animation
                this.messages.push({
                    role: 'assistant',
                    content: data.response
                });
                
                // Add animation class to the new message
                setTimeout(() => {
                    const messages = document.querySelectorAll('#chatContainer > div');
                    const lastMessage = messages[messages.length - 1];
                    if (lastMessage) {
                        lastMessage.classList.add('message-bounce');
                    }
                }, 10);
                
                // Update conversation ID if needed
                if (data.conversation_id && !this.currentConversationId) {
                    this.currentConversationId = data.conversation_id;
                    this.updateConversationsList();
                }
                
                // Track successful message exchange
                this.trackEvent('message_exchange', {
                    conversation_id: this.currentConversationId,
                    message_count: this.messages.length
                });
                
                // Check for fit recommendations in the response
                this.trackFitRecommendations(data.response);
                
            } catch (error) {
                console.error('Error:', error);
                this.handleError('Sorry, there was an error processing your request. Please try again.');
                
                // Track error event
                this.trackEvent('api_error', {
                    error_message: error.message,
                    conversation_id: this.currentConversationId
                });
            } finally {
                this.isLoading = false;
                this.scrollToBottom();
            }
        },
        
        handleError(errorMessage) {
            this.messages.push({
                role: 'assistant',
                content: errorMessage
            });
            
            // Add a retry button for API errors
            if (errorMessage.includes('error processing your request')) {
                setTimeout(() => {
                    const messages = document.querySelectorAll('#chatContainer > div');
                    const lastMessage = messages[messages.length - 1];
                    if (lastMessage) {
                        const retryButton = document.createElement('button');
                        retryButton.textContent = 'Retry';
                        retryButton.className = 'mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm';
                        retryButton.setAttribute('aria-label', 'Retry last message');
                        
                        retryButton.addEventListener('click', () => {
                            // Get the last user message
                            const lastUserMessage = this.messages.filter(m => m.role === 'user').pop();
                            if (lastUserMessage) {
                                this.quickAction(lastUserMessage.content);
                            }
                        });
                        
                        const messageContent = lastMessage.querySelector('p').parentNode;
                        messageContent.appendChild(retryButton);
                    }
                }, 100);
            }
        },
        
        updateConversationsList() {
            // Get first user message as title, or use default
            let title = 'New Conversation';
            const firstUserMsg = this.messages.find(m => m.role === 'user');
            if (firstUserMsg) {
                title = firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
            }
            
            this.conversations.unshift({
                id: this.currentConversationId,
                title: title,
                timestamp: new Date().toISOString()
            });
            
            // Limit the number of conversations shown
            if (this.conversations.length > 10) {
                this.conversations = this.conversations.slice(0, 10);
            }
        },
        
        async resetChat() {
            try {
                const response = await fetch('/api/reset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to reset conversation');
                }
                
                const data = await response.json();
                this.messages = [];
                this.currentConversationId = data.conversation_id;
                
                // Track reset event
                this.trackEvent('conversation_reset', {
                    new_conversation_id: data.conversation_id
                });
                
            } catch (error) {
                console.error('Error resetting chat:', error);
                
                // Show error notification
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg';
                notification.textContent = 'Failed to reset conversation. Please try again.';
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 5000);
            }
        },
        
        quickAction(message) {
            this.userInput = message;
            this.sendMessage();
            
            // Track quick action usage
            this.trackEvent('quick_action_used', {
                action_text: message,
                conversation_id: this.currentConversationId
            });
        },
        
        trackEvent(eventName, eventData = {}) {
            // Basic analytics tracking
            if (window.gtag) {
                window.gtag('event', eventName, eventData);
            }
            
            // You can also implement custom analytics here
            console.log('Analytics Event:', eventName, eventData);
        },
        
        trackFitRecommendations(response) {
            // Check if the response contains size recommendations
            const sizeRegex = /size (\d+\.?\d*)/i;
            const brandRegex = /(Nike|Adidas|New Balance|Puma|Reebok|Converse|Vans|Under Armour|Asics)/i;
            
            const sizeMatch = response.match(sizeRegex);
            const brandMatch = response.match(brandRegex);
            
            if (sizeMatch || brandMatch) {
                const analyticsData = {
                    conversation_id: this.currentConversationId
                };
                
                if (sizeMatch) {
                    analyticsData.recommended_size = sizeMatch[1];
                }
                
                if (brandMatch) {
                    analyticsData.brand = brandMatch[1];
                }
                
                this.trackEvent('fit_recommendation', analyticsData);
            }
        }
    };
}

// Error handling and recovery
window.addEventListener('error', function(e) {
    console.error('Global error caught:', e.error);
    
    // Create error notification
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg max-w-md text-center';
    notification.textContent = 'Something went wrong. Please refresh the page if the issue persists.';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
});

// Accessibility enhancements
document.addEventListener('DOMContentLoaded', function() {
    // Add appropriate ARIA attributes
    const chatInput = document.querySelector('input[type="text"]');
    if (chatInput) {
        chatInput.setAttribute('aria-label', 'Type your message');
    }
    
    // Ensure all interactive elements are keyboard accessible
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(button => {
        if (!button.getAttribute('aria-label') && !button.textContent.trim()) {
            button.setAttribute('aria-label', 'Button');
        }
    });
    
    // Add skip to content link for screen readers
    const skipLink = document.createElement('a');
    skipLink.href = '#chatContainer';
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2';
    skipLink.textContent = 'Skip to chat content';
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Ensure proper focus management for the chat interface
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
        chatContainer.setAttribute('tabindex', '-1');
        chatContainer.setAttribute('aria-live', 'polite');
        chatContainer.setAttribute('aria-atomic', 'false');
    }
});

// Performance optimizations
// Debounce function to limit expensive operations
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Apply debouncing to window resize events
window.addEventListener('resize', debounce(function() {
    // Adjust UI elements if needed on resize
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}, 100));