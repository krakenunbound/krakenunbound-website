// Kraken Unbound - Bubble Effect Animation

(function() {
    const container = document.getElementById('bubblesContainer');
    if (!container) return;

    const bubbleCount = 20;

    function createBubble() {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';

        // Random size between 4px and 24px
        const size = Math.random() * 20 + 4;
        bubble.style.width = size + 'px';
        bubble.style.height = size + 'px';

        // Random horizontal position
        bubble.style.left = Math.random() * 100 + '%';

        // Random animation duration between 10 and 25 seconds
        const duration = Math.random() * 15 + 10;
        bubble.style.animationDuration = duration + 's';

        // Random delay so they don't all start at once
        const delay = Math.random() * 8;
        bubble.style.animationDelay = delay + 's';

        // Slight horizontal drift variation
        const drift = (Math.random() - 0.5) * 60;
        bubble.style.setProperty('--drift', drift + 'px');

        container.appendChild(bubble);

        // Remove and recreate after animation completes
        setTimeout(() => {
            bubble.remove();
            createBubble();
        }, (duration + delay) * 1000);
    }

    // Create initial bubbles with staggered start
    for (let i = 0; i < bubbleCount; i++) {
        setTimeout(() => createBubble(), i * 300);
    }
})();
