document.addEventListener('DOMContentLoaded', () => {
    const statusDot = document.getElementById('status');
    const blackoutBtn = document.getElementById('btn-blackout');
    const scenesContainer = document.getElementById('scenes-container');
    
    // Tabs
    const tabScenesBtn = document.getElementById('tab-scenes');
    const tabVcBtn = document.getElementById('tab-vc');
    const sectionScenes = document.getElementById('section-scenes');
    const sectionVc = document.getElementById('section-vc');
    const vcPagesNav = document.getElementById('vc-pages-nav');
    const vcContainer = document.getElementById('vc-container');

    // Virtual Console Data
    let vcData = [];
    let activeVcPageId = null;

    // Determine WebSocket URL based on current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    let ws;

    // Tab Navigation
    tabScenesBtn.addEventListener('click', () => {
        tabScenesBtn.classList.add('active');
        tabVcBtn.classList.remove('active');
        sectionScenes.classList.add('active');
        sectionVc.classList.remove('active');
    });

    tabVcBtn.addEventListener('click', () => {
        tabVcBtn.classList.add('active');
        tabScenesBtn.classList.remove('active');
        sectionVc.classList.add('active');
        sectionScenes.classList.remove('active');
    });

    function connect() {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            statusDot.classList.remove('disconnected');
            statusDot.classList.add('connected');
            console.log('Connected to DMX Master');
            fetchScenes();
            fetchVirtualConsole();
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

    // Fetch Virtual Console via REST API
    async function fetchVirtualConsole() {
        try {
            const res = await fetch('/api/virtual-console');
            if (res.ok) {
                const data = await res.json();
                vcData = data.pages;
                if (vcData && vcData.length > 0 && !activeVcPageId) {
                    activeVcPageId = vcData[0].id;
                }
                renderVirtualConsole();
            }
        } catch (error) {
            console.error('Failed to fetch Virtual Console:', error);
        }
    }

    function renderVirtualConsole() {
        vcPagesNav.innerHTML = '';
        vcContainer.innerHTML = '';

        if (!vcData || vcData.length === 0) {
            vcContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 1rem;">No Virtual Console pages configured.</p>';
            return;
        }

        // Render Page Nav
        vcData.forEach(page => {
            const btn = document.createElement('button');
            btn.className = `vc-page-btn ${page.id === activeVcPageId ? 'active' : ''}`;
            btn.textContent = page.name;
            btn.onclick = () => {
                activeVcPageId = page.id;
                renderVirtualConsole();
            };
            vcPagesNav.appendChild(btn);
        });

        // Render Widgets for active page
        const activePage = vcData.find(p => p.id === activeVcPageId);
        if (activePage && activePage.widgets) {
            activePage.widgets.forEach(widget => {
                const el = document.createElement('div');
                el.className = 'vc-widget';
                el.textContent = widget.label;
                
                // Opacity to match desktop aesthetic
                // In a full implementation, we might parse hex and apply opacity
                el.style.backgroundColor = widget.color || '#333333';
                
                // CSS Grid uses 1-based indexing for columns/rows
                el.style.gridColumn = `${widget.x + 1} / span ${widget.width}`;
                el.style.gridRow = `${widget.y + 1} / span ${widget.height}`;

                el.onclick = () => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        if (widget.targetType === 'scene' && widget.targetId) {
                            ws.send(JSON.stringify({ type: 'triggerScene', payload: widget.targetId }));
                        } else if (widget.targetType === 'chaser' && widget.targetId) {
                            ws.send(JSON.stringify({ type: 'startChaser', payload: widget.targetId }));
                        }
                    }
                };

                vcContainer.appendChild(el);
            });
        }
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
