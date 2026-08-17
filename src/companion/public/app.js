let ws;
const token = new URLSearchParams(window.location.search).get('token') || localStorage.getItem('dmxToken');
if (token) localStorage.setItem('dmxToken', token);

const statusDot = document.getElementById('status');
const statusText = document.getElementById('status-text');

let isConnected = false;
let groupsData = [];

// Haptic feedback helper
function vibrate(ms = 10) {
    if (navigator.vibrate) {
        navigator.vibrate(ms);
    }
}

// ── WebSocket Connection ──
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}?token=${token}`;
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('Connected to DMX Master');
        statusDot.className = 'status-dot connected';
        statusText.innerText = 'Connected';
        isConnected = true;
        
        fetchScenes();
        fetchVirtualConsole();
        fetchGroups();
    };

    ws.onclose = () => {
        console.log('Disconnected. Retrying in 3s...');
        statusDot.className = 'status-dot disconnected';
        statusText.innerText = 'Disconnected';
        isConnected = false;
        setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
    };
}

// ── Tab Switching ──
window.switchTab = function(tabId) {
    vibrate(10);
    
    // Update nav buttons
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    // Update content sections
    document.querySelectorAll('.tab-content').forEach(section => section.classList.remove('active'));
    document.getElementById(`section-${tabId}`).classList.add('active');
}

// ── Fetching Data ──
async function fetchScenes() {
    try {
        const res = await fetch(`/api/scenes?token=${token}`);
        if (!res.ok) throw new Error('Auth failed');
        const data = await res.json();
        renderScenes(data.scenes);
    } catch (err) {
        console.error(err);
        statusText.innerText = 'Auth Error';
    }
}

async function fetchVirtualConsole() {
    try {
        const res = await fetch(`/api/virtual-console?token=${token}`);
        if (!res.ok) return;
        const data = await res.json();
        renderVirtualConsole(data.pages);
    } catch (err) {
        console.error(err);
    }
}

async function fetchGroups() {
    try {
        const res = await fetch(`/api/groups?token=${token}`);
        if (!res.ok) return;
        const data = await res.json();
        groupsData = data.groups || [];
        renderSubmasters(groupsData);
    } catch (err) {
        console.error(err);
    }
}


// ── Rendering ──

function renderScenes(scenes) {
    const container = document.getElementById('scenes-container');
    container.innerHTML = '';

    scenes.forEach(scene => {
        const btn = document.createElement('div');
        btn.className = 'scene-btn';
        btn.innerText = scene.name;
        
        // Touch events for better mobile feel
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            btn.classList.add('active');
            vibrate(15);
            triggerScene(scene.id);
            // Simulate release after 200ms
            setTimeout(() => btn.classList.remove('active'), 200);
        });
        
        // Mouse fallback
        btn.addEventListener('mousedown', () => {
            btn.classList.add('active');
            triggerScene(scene.id);
            setTimeout(() => btn.classList.remove('active'), 200);
        });

        container.appendChild(btn);
    });
}

function renderVirtualConsole(pages) {
    const nav = document.getElementById('vc-pages-nav');
    const container = document.getElementById('vc-container');
    nav.innerHTML = '';
    
    if (pages.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); grid-column: span 12; text-align:center; margin-top:20px;">No Virtual Console pages found.</div>';
        return;
    }

    pages.forEach((page, index) => {
        const btn = document.createElement('button');
        btn.className = `vc-page-btn ${index === 0 ? 'active' : ''}`;
        btn.innerText = page.name;
        btn.onclick = () => {
            vibrate(10);
            document.querySelectorAll('.vc-page-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderVcWidgets(page.widgets);
        };
        nav.appendChild(btn);
    });

    // Render first page widgets
    renderVcWidgets(pages[0].widgets);
}

function renderVcWidgets(widgets) {
    const container = document.getElementById('vc-container');
    container.innerHTML = '';

    widgets.forEach(w => {
        const el = document.createElement('div');
        el.className = 'vc-widget';
        el.style.gridColumn = `span ${w.width}`;
        el.style.gridRow = `span ${w.height}`;

        if (w.type === 'button') {
            const btn = document.createElement('button');
            btn.className = 'vc-button-widget';
            btn.innerText = w.label || 'Btn';
            
            // Touch interactions
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                vibrate(15);
                if (w.isToggle) btn.classList.toggle('active');
                else {
                    btn.classList.add('active');
                    setTimeout(() => btn.classList.remove('active'), 200);
                }
                
                if (w.targetType === 'scene') triggerScene(w.targetId);
                else if (w.targetType === 'chaser') toggleChaser(w.targetId, btn.classList.contains('active'));
            });

            // Mouse fallback
            btn.addEventListener('mousedown', () => {
                if (w.isToggle) btn.classList.toggle('active');
                else {
                    btn.classList.add('active');
                    setTimeout(() => btn.classList.remove('active'), 200);
                }
                if (w.targetType === 'scene') triggerScene(w.targetId);
                else if (w.targetType === 'chaser') toggleChaser(w.targetId, btn.classList.contains('active'));
            });

            el.appendChild(btn);
        } else if (w.type === 'fader') {
            const wrapper = document.createElement('div');
            wrapper.className = 'vc-fader-wrapper';
            
            const trackContainer = document.createElement('div');
            trackContainer.className = 'vc-fader-track-container';
            
            const bg = document.createElement('div');
            bg.className = 'vc-fader-track-bg';
            
            const fill = document.createElement('div');
            fill.className = 'vc-fader-track-fill';
            fill.style.height = '100%';
            
            const input = document.createElement('input');
            input.type = 'range';
            input.min = '0';
            input.max = '255';
            input.value = '255';
            input.className = 'vc-fader-input-vertical';
            
            input.addEventListener('input', (e) => {
                const val = e.target.value;
                fill.style.height = `${(val / 255) * 100}%`;
                // Currently backend doesn't have an endpoint to receive arbitrary DMX channel set from WebServer,
                // so VC faders on Companion might not work without backend modification.
                // But we can add it later.
            });
            
            trackContainer.appendChild(bg);
            trackContainer.appendChild(fill);
            trackContainer.appendChild(input);
            
            const label = document.createElement('div');
            label.className = 'vc-fader-label';
            label.innerText = w.label || 'Fader';
            
            wrapper.appendChild(trackContainer);
            wrapper.appendChild(label);
            el.appendChild(wrapper);
        }

        container.appendChild(el);
    });
}

function renderSubmasters(groups) {
    const container = document.getElementById('groups-container');
    // Clear everything except the Grand Master which is hardcoded in HTML
    Array.from(container.children).forEach(child => {
        if (!child.classList.contains('gm-strip')) {
            container.removeChild(child);
        }
    });

    groups.forEach(g => {
        const strip = document.createElement('div');
        strip.className = 'fader-strip';
        
        strip.innerHTML = `
            <div class="fader-track">
                <input type="range" class="fader-input" min="0" max="1" step="0.01" value="1">
                <div class="fader-fill" style="height: 100%"></div>
            </div>
            <div class="fader-label">
                <strong>${g.name}</strong>
                <span class="val-text">100%</span>
            </div>
        `;
        
        const input = strip.querySelector('input');
        const fill = strip.querySelector('.fader-fill');
        const valText = strip.querySelector('.val-text');
        
        input.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            fill.style.height = `${val * 100}%`;
            valText.innerText = `${Math.round(val * 100)}%`;
            sendWebSocketMessage('setSubmaster', { groupId: g.id, level: val });
        });
        
        // Insert before Grand Master
        container.insertBefore(strip, container.lastElementChild);
    });

    // Grand Master logic
    const gmInput = document.getElementById('gm-fader');
    const gmFill = document.getElementById('gm-fill');
    const gmVal = document.getElementById('gm-val');
    
    gmInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        gmFill.style.height = `${val * 100}%`;
        gmVal.innerText = `${Math.round(val * 100)}%`;
        sendWebSocketMessage('setGrandMaster', val);
    });
}


// ── Actions ──
function triggerScene(sceneId) {
    sendWebSocketMessage('triggerScene', sceneId);
}

function toggleChaser(chaserId, start) {
    if (start) sendWebSocketMessage('startChaser', chaserId);
    else sendWebSocketMessage('stopChaser', chaserId);
}

function sendWebSocketMessage(type, payload) {
    if (!isConnected) return;
    ws.send(JSON.stringify({ type, payload }));
}

// ── Global Controls ──
const btnBlackout = document.getElementById('btn-blackout');
btnBlackout.addEventListener('click', () => {
    vibrate(30);
    sendWebSocketMessage('softBlackout', null);
});

// Flash Button
const btnFlash = document.getElementById('btn-flash');
let previousGmLevel = 1.0;

function handleFlashStart(e) {
    e.preventDefault();
    vibrate(20);
    btnFlash.classList.add('active');
    
    // Save current GM level
    const gmInput = document.getElementById('gm-fader');
    previousGmLevel = parseFloat(gmInput.value);
    
    // Send flash on
    sendWebSocketMessage('flash', 'on');
}

function handleFlashEnd(e) {
    e.preventDefault();
    btnFlash.classList.remove('active');
    
    // Restore GM level
    sendWebSocketMessage('setGrandMaster', previousGmLevel);
}

btnFlash.addEventListener('touchstart', handleFlashStart);
btnFlash.addEventListener('touchend', handleFlashEnd);
btnFlash.addEventListener('touchcancel', handleFlashEnd);
btnFlash.addEventListener('mousedown', handleFlashStart);
btnFlash.addEventListener('mouseup', handleFlashEnd);
btnFlash.addEventListener('mouseleave', handleFlashEnd);

// ── Init ──
if (!token) {
    statusText.innerText = 'Missing ?token= in URL';
} else {
    connectWebSocket();
}
