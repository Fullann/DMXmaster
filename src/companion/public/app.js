document.addEventListener('DOMContentLoaded', () => {
    const statusDot = document.getElementById('status');
    const blackoutBtn = document.getElementById('btn-blackout');
    const scenesContainer = document.getElementById('scenes-container');

    // Determine WebSocket URL based on current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    let ws;

    function connect() {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            statusDot.classList.remove('disconnected');
            statusDot.classList.add('connected');
            console.log('Connected to DMX Master');
            fetchScenes();
        };

        ws.onclose = () => {
            statusDot.classList.remove('connected');
            statusDot.classList.add('disconnected');
            console.log('Disconnected from DMX Master. Reconnecting in 3s...');
            setTimeout(connect, 3000);
        };

        ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };
    }

    // Connect initially
    connect();

    // Fetch scenes via REST API
    async function fetchScenes() {
        try {
            const res = await fetch('/api/scenes');
            if (res.ok) {
                const data = await res.json();
                renderScenes(data.scenes);
            }
        } catch (error) {
            console.error('Failed to fetch scenes:', error);
        }
    }

    function renderScenes(scenes) {
        scenesContainer.innerHTML = '';
        
        if (!scenes || scenes.length === 0) {
            scenesContainer.innerHTML = '<p style="color: var(--text-secondary)">No scenes available.</p>';
            return;
        }

        scenes.forEach(scene => {
            const btn = document.createElement('button');
            btn.className = 'scene-btn';
            btn.textContent = scene.name;
            btn.onclick = () => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'triggerScene',
                        payload: scene.id
                    }));
                }
            };
            scenesContainer.appendChild(btn);
        });
    }

    // Controls
    blackoutBtn.addEventListener('click', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'softBlackout'
            }));
        }
    });
});
