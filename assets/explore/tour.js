import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/loaders/GLTFLoader.js';
import { DRACOLoader } from './vendor/three/loaders/DRACOLoader.js';
import { MeshoptDecoder } from './vendor/three/libs/meshopt_decoder.module.js';
import { days } from './lessons.js';
import { models } from './models.js';

const assets = new URL('./', import.meta.url);
const originalCharacterSite = 'https://realprofessor2121-boop.github.io/notes-for-goats.com/characters/';
const actors = [
    { id: 'notes', name: 'Notes', color: '#e5ba55' },
    { id: 'notas', name: 'Notas', color: '#cf96ac' },
    { id: 'mentor', name: 'Mentor', color: '#91b8a4' },
    { id: 'ai', name: 'AI', color: '#84bfd7' },
];
const roomModels = new Map(models.map(model => [model.id, model]));
const lowerArcade = { title: 'Downstairs Arcade' };
const stops = [roomModels.get('house'), ...days.map(day => roomModels.get('room-' + day.day)), lowerArcade];
const colors = ['#dcb25c', ...days.map(day => day.color), '#d76f72'];
const kitchen = 2;
const gameRoom = 3;
const yellowRoom = 4;
const mechanical = { kind: 'mechanical', label: 'Estimate mechanical royalties', href: '#mechanical' };
const otherRoyalties = { kind: 'mechanical', label: 'Who pays what and why', href: '#mechanical/other' };
const water = { kind: 'model', label: 'Inspect GOAT Water', href: '#explore/model/goat-water' };
const basement = stops.length - 1;
const games = new Map([
    [gameRoom, { label: 'Play the Notes maze game', href: '#arcade' }],
    [basement, { label: 'Play NFG Fight', href: '#fight' }],
]);
const keys = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
};
const indoor = { left: -5.35, right: 5.35, far: -3.85, near: 3.9 };
const outdoor = { left: -5.95, right: 5.95, far: -2.9, near: 4.4 };
const doorReach = 1.45;
const speed = 4.1;
const floorObstacles = [
    [[-1.65, 3.0, -3.38, 2.28]],                       // Bed
    [[-5.09, 4.7, -4.15, -2.5]],                        // Kitchen counter and refrigerator
    [[-4.73, -1.91, -3.19, -1.67], [1.28, 4.7, 1.04, 2.48]], // Desk and sofa
    [[-3.35, 0.03, -3.83, -2.18], [1.48, 4.15, -2.86, -1.39], [-5.35, -3.84, -1.08, 1.15]],
    [[-3.05, 3.05, -3.41, -1.08]],                     // Studio workstation
    [[-2.6, 1.3, -3.18, -1.62]],                       // Distribution desk
    [[0.51, 4.77, 1.85, 3.04], [-4.3, -2.7, -1.02, -0.36]],
    [[-5.02, -1.25, -3.92, -2.79]],                     // Trophy display
    [[-3.38, -1.03, -3.78, -1.92]],
];

function node(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text) item.textContent = text;
    return item;
}

function button(className, text) {
    const item = node('button', className, text);
    item.type = 'button';
    return item;
}

function selectedActor() {
    const match = location.hash.match(/^#tour(?:\/([a-z]+))?$/);
    return actors.find(actor => actor.id === match?.[1]) || actors[0];
}

function nameOf(stop) {
    return stop === 0 ? 'Front Walk' : stops[stop].title;
}

function previousStop(stop) {
    return stop === basement ? gameRoom : stop - 1;
}

function nextStop(stop) {
    return stop === basement ? gameRoom : (stop + 1) % basement;
}

function dayUrl(day) {
    return '#day-' + day;
}

function lessonUrl(day, lesson) {
    return dayUrl(day) + '/' + lesson.id;
}

function fitModel(model, scaleBy, z) {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = scaleBy(size);
    model.scale.multiplyScalar(scale);
    model.position.set(-center.x * scale, -box.min.y * scale, z - center.z * scale);
    return { size: size.multiplyScalar(scale), scale };
}

function freeModel(root) {
    if (!root) return;
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    root.removeFromParent();
    root.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
            for (const material of [].concat(object.material)) materials.add(material);
        }
    });
    for (const material of materials) {
        for (const texture of Object.values(material)) if (texture?.isTexture) textures.add(texture);
        material.dispose();
    }
    for (const texture of textures) {
        const close = texture.source?.data?.close;
        if (typeof close === 'function') close.call(texture.source.data);
        texture.dispose();
    }
    for (const geometry of geometries) geometry.dispose();
}

function makeBox(width, height, depth, color, position, properties = {}) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...properties });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    return mesh;
}

function makePortal(action, color) {
    const portal = new THREE.Group();
    const glow = { emissive: color, emissiveIntensity: 0.23, metalness: 0.22 };
    if (action.kind === 'cabinet') {
        const cabinetColor = action.href === '#fight' ? '#5a2830' : '#39324e';
        portal.add(
            makeBox(1.05, 0.91, 0.75, '#221d25', [0, 0.46, 0]),
            makeBox(1.07, 0.1, 0.85, color, [0, 0.93, 0.05], glow),
            makeBox(1.05, 0.84, 0.66, cabinetColor, [0, 1.35, -0.035]),
            makeBox(0.92, 0.52, 0.055, '#201824', [0, 1.36, 0.32]),
            makeBox(0.91, 0.14, 0.09, color, [0, 1.72, 0.33], glow),
            makeBox(0.76, 0.065, 0.03, color, [0, 1.41, 0.355], glow),
            makeBox(0.19, 0.075, 0.15, '#f1d693', [0.25, 0.98, 0.19]),
            makeBox(0.1, 0.14, 0.10, '#d89969', [-0.22, 1.06, 0.16])
        );
        const symbol = new THREE.Mesh(new THREE.OctahedronGeometry(0.26),
            new THREE.MeshStandardMaterial({ color, ...glow }));
        portal.add(symbol);
        action.indicator = symbol;
        action.indicatorHeight = 2.19;
    } else if (action.kind === 'mechanical') {
        portal.add(
            makeBox(0.76, 0.13, 0.64, '#303134', [0, 0.08, 0]),
            makeBox(0.19, 0.84, 0.23, '#353c40', [0, 0.52, 0]),
            makeBox(0.78, 0.52, 0.16, '#282c30', [0, 1.12, 0]),
            makeBox(0.66, 0.40, 0.035, '#c99548', [0, 1.12, 0.085], glow),
            makeBox(0.49, 0.036, 0.027, '#fff1bf', [0, 1.17, 0.115]),
            makeBox(0.31, 0.025, 0.027, '#f8d781', [0.045, 1.08, 0.115])
        );
        const indicator = new THREE.Mesh(new THREE.OctahedronGeometry(0.19),
            new THREE.MeshStandardMaterial({ color, ...glow }));
        portal.add(indicator);
        action.indicator = indicator;
        action.indicatorHeight = 1.70;
    } else if (action.kind === 'lesson' || action.kind === 'model') {
        const base = makeBox(0.91, 0.14, 0.78, '#222126', [0, 0.08, 0]);
        const pin = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.37),
            new THREE.MeshStandardMaterial({ color, ...glow })
        );
        pin.position.y = 0.93;
        portal.add(base, pin);
        action.indicator = pin;
    } else {
        portal.add(
            makeBox(0.115, 2.44, 0.17, color, [-0.66, 1.22, 0], glow),
            makeBox(0.115, 2.44, 0.17, color, [0.66, 1.22, 0], glow),
            makeBox(1.42, 0.115, 0.17, color, [0, 2.4, 0], glow),
            makeBox(1.42, 0.035, 0.49, color, [0, 0.022, 0], glow)
        );
        const entrance = new THREE.Mesh(
            new THREE.PlaneGeometry(1.25, 2.25),
            new THREE.MeshBasicMaterial({
                transparent: true, opacity: 0.10, color, side: THREE.DoubleSide, depthWrite: false,
            })
        );
        entrance.position.y = 1.2;
        portal.add(entrance);
    }
    portal.position.set(action.x, 0, action.z);
    portal.traverse(object => { if (object.isMesh) object.userData.tourAction = action; });
    return portal;
}

function makeBasement() {
    const room = new THREE.Group();
    room.add(
        makeBox(11.6, 0.24, 9.68, '#262739', [0, -0.13, 0]),
        makeBox(11.56, 2.95, 0.30, '#383149', [0, 1.44, -4.76]),
        makeBox(0.25, 2.56, 6.5, '#3c3448', [-5.66, 1.22, -1.47]),
        makeBox(0.25, 0.55, 9.45, '#403747', [5.66, 0.23, 0]),
        makeBox(11.44, 0.085, 0.12, '#c66572', [0, 0.15, -4.56],
            { emissive: '#b94959', emissiveIntensity: 0.43 }),
        makeBox(4.85, 0.025, 3.65, '#53445d', [0, 0.005, -2.72]),
        makeBox(4.50, 0.021, 3.30, '#392d46', [0, 0.020, -2.72])
    );
    for (const x of [-4.36, 4.36]) {
        room.add(
            makeBox(0.67, 0.016, 6.17, '#4a3d57', [x, -0.002, -0.2]),
            makeBox(0.12, 2.0, 0.21, '#a3578e', [x, 1.3, -4.58],
                { emissive: '#80416f', emissiveIntensity: 0.5 })
        );
    }
    return room;
}

function makeSign(text, width, height, position, ink = '#fff1bf', background = '#282723') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = Math.max(64, Math.round(1024 * height / width));
    const paint = canvas.getContext?.('2d');
    if (!paint) return makeBox(width, height, 0.03, background, position);
    paint.fillStyle = background;
    paint.fillRect(0, 0, canvas.width, canvas.height);
    const line = Math.max(3, Math.round(canvas.height * 0.043));
    paint.lineWidth = line;
    paint.strokeStyle = '#b9934d';
    paint.strokeRect(line, line, canvas.width - 2 * line, canvas.height - 2 * line);
    paint.fillStyle = ink;
    paint.font = 'bold ' + Math.floor(canvas.height * 0.54) + 'px Arial, sans-serif';
    paint.textAlign = 'center';
    paint.textBaseline = 'middle';
    paint.fillText(text, canvas.width / 2, canvas.height / 2 + 1, canvas.width * 0.94);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ map: texture }));
    sign.position.set(...position);
    return sign;
}

function makeMechanicalFixtures() {
    const wall = new THREE.Group();
    wall.add(
        makeBox(10.72, 3.18, 0.20, '#53432a', [0, 1.61, -4.51]),
        makeBox(10.50, 0.075, 0.22, '#b68a45', [0, 0.13, -4.41]),
        makeSign('MECHANICAL ROYALTIES', 10.20, 0.54, [0, 2.89, -4.37]),
        makeBox(0.06, 2.51, 0.07, '#8d6f3c', [-1.78, 1.30, -4.39]),
        makeBox(0.06, 2.51, 0.07, '#8d6f3c', [1.78, 1.30, -4.39])
    );
    const stations = [
        { id: 'logo-mlc', label: 'THE MLC', x: -3.57 },
        { id: 'logo-hfa', label: 'HFA', x: 0 },
        { id: 'logo-music-reports', label: 'MUSIC REPORTS', x: 3.57 },
    ].map(item => {
        const card = makeBox(3.09, 0.88, 0.085, '#eee7d6', [item.x, 2.03, -4.36]);
        const placeholder = makeSign(item.label, 2.75, 0.61, [item.x, 2.03, -4.30]);
        wall.add(card, placeholder);
        return { ...item, placeholder, y: 1.69, z: -4.28, width: 2.80, height: 0.66, depth: 0.29 };
    });

    const fileCabinet = new THREE.Group();
    fileCabinet.add(makeBox(1.09, 1.31, 0.57, '#485055', [0, 0.655, 0]));
    for (const y of [0.18, 0.49, 0.80, 1.11]) {
        fileCabinet.add(
            makeBox(0.98, 0.264, 0.035, '#626b70', [0, y, 0.297]),
            makeBox(0.22, 0.044, 0.066, '#c0c6c3', [0, y + 0.031, 0.327])
        );
    }
    const printer = new THREE.Group();
    printer.add(
        makeBox(1.23, 0.44, 0.64, '#302e30', [0, 0.22, 0]),
        makeBox(1.10, 0.10, 0.57, '#666566', [0, 0.46, -0.01]),
        makeBox(0.76, 0.08, 0.04, '#1f1e20', [0, 0.27, 0.337]),
        makeBox(0.56, 0.018, 0.24, '#f0ebdf', [0, 0.235, 0.43]),
        makeBox(0.14, 0.027, 0.11, '#95ad8b', [0.43, 0.521, 0.18])
    );
    const safe = new THREE.Group();
    safe.add(
        makeBox(1.0, 1.15, 0.67, '#363e42', [0, 0.575, 0]),
        makeBox(0.83, 0.94, 0.078, '#535e61', [0, 0.575, 0.351]),
        makeBox(0.13, 0.37, 0.065, '#8f9592', [0.27, 0.62, 0.408])
    );
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.055, 22),
        new THREE.MeshStandardMaterial({ color: '#c2bbbb', metalness: 0.56, roughness: 0.35 }));
    dial.rotation.x = Math.PI / 2;
    dial.position.set(-0.13, 0.64, 0.42);
    safe.add(dial);
    wall.add(
        makeBox(1.68, 0.11, 0.81, '#7e6539', [0.38, 0.72, -3.97]),
        makeBox(1.55, 0.75, 0.67, '#6e562f', [0.38, 0.35, -3.99]),
        makeSign('FILE CABINETS', 1.56, 0.24, [-3.85, 1.47, -3.81]),
        makeSign('PRINTER', 1.21, 0.24, [0.38, 1.47, -3.79]),
        makeSign('SAFE', 1.09, 0.24, [4.17, 1.47, -3.80])
    );
    const equipment = [
        { id: 'business-file-cabinet', placeholder: fileCabinet, x: -3.85, y: 0.02, z: -3.89,
            width: 1.16, height: 1.33, depth: 0.67 },
        { id: 'business-printer', placeholder: printer, x: 0.38, y: 0.78, z: -4.00,
            width: 1.36, height: 0.56, depth: 0.72 },
        { id: 'business-safe', placeholder: safe, x: 4.17, y: 0.02, z: -3.89,
            width: 1.12, height: 1.28, depth: 0.77 },
    ];
    for (const prop of equipment) {
        prop.placeholder.position.set(prop.x, prop.y, prop.z);
        wall.add(prop.placeholder);
    }
    return { wall, placements: [...stations, ...equipment] };
}

function makeOtherRoyaltiesWall() {
    const wall = new THREE.Group();
    wall.position.set(-4.82, 0, 0.02);
    wall.rotation.y = 0.86;
    wall.add(
        makeBox(3.12, 3.12, 0.16, '#29353f', [0, 1.57, 0]),
        makeBox(3.07, 0.075, 0.18, '#6587a2', [0, 0.12, 0.02]),
        makeSign('OTHER ROYALTIES', 2.88, 0.35, [0, 2.85, 0.091], '#e5f2fc', '#263944'),
        makeSign('WHO PAYS WHAT AND WHY', 2.88, 0.24, [0, 2.49, 0.091], '#f0ddb1', '#323a41')
    );
    const rows = [
        ['PERFORMANCE', 'PROs · public performances'],
        ['DIGITAL RECORDING', 'SoundExchange · eligible noninteractive plays'],
        ['DISTRIBUTION', 'Distributors · recording streams and sales'],
        ['SYNC', 'Licensees · music used with video'],
    ];
    for (const [index, [title, detail]] of rows.entries()) {
        const y = 2.15 - index * 0.49;
        wall.add(
            makeSign(title, 2.79, 0.20, [0, y, 0.09], '#deedfa', '#304651'),
            makeSign(detail, 2.79, 0.18, [0, y - 0.20, 0.09], '#f3ecd8', '#282b30')
        );
    }
    return wall;
}

function createWorld(host, callbacks) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#141719');
    scene.fog = new THREE.Fog('#141719', 15, 36);
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 75);
    const sky = new THREE.HemisphereLight('#fff3db', '#6e7389', 2.0);
    const key = new THREE.DirectionalLight('#ffe3b0', 2.15);
    const fill = new THREE.DirectionalLight('#afcaff', 0.86);
    key.position.set(-3, 8, 6);
    fill.position.set(2, 3.5, -5.5);
    scene.add(sky, key, fill);
    const platform = makeBox(26, 0.35, 24, '#151920', [0, -0.205, -3]);
    const path = makeBox(3.0, 0.045, 9.5, '#7e7771', [0, -0.025, 0.7]);
    scene.add(platform, path);
    const walkShadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.44, 28),
        new THREE.MeshBasicMaterial({ color: '#111118', transparent: true, opacity: 0.30, depthWrite: false })
    );
    walkShadow.rotation.x = -Math.PI / 2;
    walkShadow.position.y = 0.035;
    scene.add(walkShadow);
    const player = new THREE.Group();
    const visual = new THREE.Group();
    player.add(visual);
    scene.add(player);

    const draco = new DRACOLoader().setDecoderPath(new URL('vendor/draco/', assets).href);
    draco.setWorkerLimit(1);
    const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
    const raycaster = new THREE.Raycaster();
    const textureLoader = new THREE.TextureLoader();
    const destinations = new THREE.Group();
    scene.add(destinations);

    let room;
    let avatar;
    let roomRequest = 0;
    let avatarRequest = 0;
    let current = 0;
    let actor = actors[0];
    let frame = 0;
    let stopped = false;
    let inView = false;
    let lastFrame = 0;
    let stepPhase = 0;
    let facing = 0;
    let statusAction;
    let pressed = [];
    let portalActions = [];
    const position = new THREE.Vector3(0, 0, 3.1);
    const cameraGoal = new THREE.Vector3();
    const lookGoal = new THREE.Vector3();

    function keepOnFloor(x, z) {
        if (!current) return true;
        return !(floorObstacles[current - 1] ?? [[-0.6, 0.6, -3.41, -2.67]]).some(([left, right, far, near]) =>
            x > left - 0.19 && x < right + 0.19 && z > far - 0.19 && z < near + 0.19
        );
    }

    function updateStatus() {
        const nearest = portalActions
            .map(action => [action, Math.hypot(position.x - action.x, position.z - action.z)])
            .filter(([, distance]) => distance < doorReach)
            .sort((a, b) => a[1] - b[1])[0]?.[0];
        if (nearest !== statusAction) {
            statusAction = nearest;
            callbacks.nearby(nearest);
        }
    }

    function render(now) {
        frame = 0;
        if (stopped || !inView || document.hidden) return;
        const dt = lastFrame ? Math.min(0.035, (now - lastFrame) / 1000) : 0.016;
        lastFrame = now;
        const moving = pressed.length > 0;
        const dx = Number(pressed.includes('right')) - Number(pressed.includes('left'));
        const dz = Number(pressed.includes('down')) - Number(pressed.includes('up'));
        if (dx || dz) {
            const bounds = current ? indoor : outdoor;
            const factor = speed * dt / Math.hypot(dx, dz);
            const nextX = THREE.MathUtils.clamp(position.x + dx * factor, bounds.left, bounds.right);
            const nextZ = THREE.MathUtils.clamp(position.z + dz * factor, bounds.far, bounds.near);
            if (keepOnFloor(nextX, position.z)) position.x = nextX;
            if (keepOnFloor(position.x, nextZ)) position.z = nextZ;
            facing = Math.atan2(dx, dz);
            stepPhase += dt * 12;
        }
        player.position.copy(position);
        walkShadow.position.x = position.x;
        walkShadow.position.z = position.z;
        const floating = actor.id === 'ai';
        const rise = floating ? 0.44 + Math.sin(now / 340) * 0.10 : (moving ? Math.abs(Math.sin(stepPhase)) * 0.078 : 0);
        visual.position.y = THREE.MathUtils.lerp(visual.position.y, rise, Math.min(1, dt * 17));
        const angle = Math.atan2(Math.sin(facing - visual.rotation.y), Math.cos(facing - visual.rotation.y));
        visual.rotation.y += angle * Math.min(1, dt * 14);
        visual.rotation.z = moving && !floating ? Math.sin(stepPhase) * 0.029 : 0;
        cameraGoal.set(position.x * 0.57, current ? 6.8 : 5.1, position.z + (current ? 8.5 : 9.15));
        camera.position.lerp(cameraGoal, Math.min(1, dt * 7));
        lookGoal.set(position.x * 0.43, current ? 0.82 : 1.35, current ? -0.8 : -3.1);
        camera.lookAt(lookGoal);
        for (const action of portalActions) {
            if (!action.indicator) continue;
            action.indicator.rotation.y = now / 1200;
            action.indicator.position.y = (action.indicatorHeight ?? 0.95) + Math.sin(now / 480) * 0.10;
        }
        updateStatus();
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
    }

    function start() {
        if (!frame && !stopped && inView && !document.hidden) {
            lastFrame = 0;
            frame = requestAnimationFrame(render);
        }
    }

    const resize = new ResizeObserver(() => {
        const { width, height } = host.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        start();
    });
    resize.observe(host);
    const intersection = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else pressed = [];
    });
    intersection.observe(host);

    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    document.addEventListener('visibilitychange', start, options);
    renderer.domElement.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        inView = false;
        pressed = [];
        callbacks.unavailable('The 3D display was interrupted. Room navigation and lessons are still available.');
    }, options);
    host.addEventListener('pointerdown', event => {
        if (event.target !== renderer.domElement && event.target !== host) return;
        host.focus({ preventScroll: true });
        const rect = renderer.domElement.getBoundingClientRect();
        const pixel = new THREE.Vector2(
            (event.clientX - rect.left) / rect.width * 2 - 1,
            -(event.clientY - rect.top) / rect.height * 2 + 1
        );
        raycaster.setFromCamera(pixel, camera);
        const hit = raycaster.intersectObject(destinations, true)[0];
        if (hit) callbacks.activate(hit.object.userData.tourAction);
    }, options);

    function placePortals(index) {
        for (const child of [...destinations.children]) freeModel(child);
        if (!index) {
            portalActions = [{ kind: 'room', stop: 1, x: 0, z: -2.4, label: 'Enter house tour' }];
        } else {
            const previous = { kind: 'room', stop: previousStop(index), x: -4.27, z: 3.45,
                label: nameOf(previousStop(index)) };
            portalActions = [previous];
            if (index !== basement) {
                portalActions.push(
                    { kind: 'room', stop: nextStop(index), x: 4.27, z: 3.45, label: nameOf(nextStop(index)) },
                    { kind: 'lesson', x: index === 1 ? -3.51 : 0, z: index === 1 ? -1.25 : 0.4,
                        day: index - 1, label: 'Open Day ' + (index - 1) + ' lessons' }
                );
            }
            if (games.has(index)) {
                portalActions.push({ ...games.get(index), kind: 'cabinet', x: index === gameRoom ? 2.63 : 0,
                    z: index === gameRoom ? -2.98 : -3.12 });
            }
            if (index === gameRoom) {
                portalActions.push({ kind: 'room', stop: basement, x: -4.0, z: 1.01, label: 'Go downstairs' });
            }
            if (index === kitchen) portalActions.push({ ...water, x: -2.33, z: -1.3 });
            if (index === yellowRoom) {
                portalActions.push(
                    { ...mechanical, x: 3.97, z: -0.18 },
                    { ...otherRoyalties, x: -3.62, z: 1.18 }
                );
            }
        }
        const color = colors[index];
        for (const action of portalActions) {
            const tint = action.kind === 'model' || action.href === otherRoyalties.href ? '#7dc8e4' : color;
            destinations.add(makePortal(action, tint));
        }
        statusAction = undefined;
        callbacks.nearby();
    }

    async function placeKitchenWater(request) {
        const action = portalActions.find(item => item.kind === 'model');
        if (!action) return;
        try {
            const gltf = await loader.loadAsync(new URL('models/goat-water.glb', assets).href);
            if (stopped || request !== roomRequest) return freeModel(gltf.scene);
            fitModel(gltf.scene, dims => 0.63 / dims.y, -3.6);
            gltf.scene.position.x += action.x;
            gltf.scene.position.y += 1.82;
            gltf.scene.traverse(object => {
                if (object.isMesh) object.userData.tourAction = action;
            });
            destinations.add(gltf.scene);
        } catch {
            // The marked kitchen station is still available when the inline model cannot load.
        }
    }

    function placeMechanicalWall(parent, request) {
        const { wall, placements } = makeMechanicalFixtures();
        parent.add(wall, makeOtherRoyaltiesWall());
        for (const prop of placements) {
            loader.loadAsync(new URL('models/' + prop.id + '.glb', assets).href).then(gltf => {
                if (stopped || request !== roomRequest) return freeModel(gltf.scene);
                fitModel(gltf.scene, dims => Math.min(prop.width / dims.x, prop.height / dims.y,
                    prop.depth / dims.z), prop.z);
                gltf.scene.position.x += prop.x;
                gltf.scene.position.y += prop.y;
                wall.add(gltf.scene);
                freeModel(prop.placeholder);
            }).catch(() => {
                // Keep the modeled fixture when an individual 3D source is unavailable.
            });
        }
    }

    async function showRoom(index, entry) {
        current = index;
        path.visible = index === 0;
        freeModel(room);
        room = null;
        position.set(entry === 'back' ? 3.28 : entry === 'forward' ? -3.28 : 0, 0, 3.04);
        facing = 0;
        camera.position.set(0, index ? 6.8 : 5.1, 11.6);
        placePortals(index);
        const request = ++roomRequest;
        const model = stops[index];
        if (index === basement) {
            room = makeBasement();
            scene.add(room);
            callbacks.roomStatus('');
            return;
        }
        callbacks.roomStatus('Loading ' + nameOf(index) + '…');
        try {
            const gltf = await loader.loadAsync(new URL(model.src.split('/').at(-1), new URL('models/', assets)).href);
            if (stopped || request !== roomRequest) return freeModel(gltf.scene);
            room = new THREE.Group();
            room.add(gltf.scene);
            if (!index) {
                gltf.scene.rotation.y = THREE.MathUtils.degToRad(-147);
                // Use a wrapper so centering uses the rotated building's footprint.
                const front = new THREE.Group();
                front.add(gltf.scene);
                room.add(front);
                const { size } = fitModel(front, dims => 14.8 / Math.max(dims.x, dims.z), 0);
                front.position.z -= size.z / 2 + 3.58;
                front.position.y -= 0.06;
            } else {
                const result = fitModel(gltf.scene, dims => 11.6 / dims.x, 0);
                gltf.scene.position.y -= result.scale * 0.28;
            }
            scene.add(room);
            callbacks.roomStatus('');
            if (index === kitchen) placeKitchenWater(request);
            if (index === yellowRoom) placeMechanicalWall(room, request);
        } catch {
            if (!stopped && request === roomRequest) {
                callbacks.roomStatus('The room model could not load. Doors and lessons are available.');
            }
        }
    }

    async function showActor(nextActor) {
        actor = nextActor;
        const request = ++avatarRequest;
        callbacks.actorStatus('Loading ' + actor.name + '…');
        freeModel(avatar);
        avatar = null;
        let gltf;
        try {
            gltf = await loader.loadAsync(new URL('avatars/' + actor.id + '.glb', assets).href);
        } catch {
            if (stopped || request !== avatarRequest) return;
            try {
                gltf = await loader.loadAsync(originalCharacterSite + nextActor.id + '.glb');
            } catch {
                if (stopped || request !== avatarRequest) return;
            }
        }
        if (stopped || request !== avatarRequest) return freeModel(gltf?.scene);
        if (gltf) {
            avatar = new THREE.Group();
            avatar.add(gltf.scene);
            fitModel(gltf.scene, dims => {
                return nextActor.id === 'ai' ? 1.52 / Math.max(dims.x, dims.y, dims.z) : 1.73 / dims.y;
            }, 0);
            callbacks.actorStatus('');
        } else {
            callbacks.actorStatus(nextActor.name + ' could not load in 3D. You can still move and open lessons.');
            try {
                const portrait = await textureLoader.loadAsync(
                    new URL('../../characters/' + nextActor.id + '.png', assets).href
                );
                if (stopped || request !== avatarRequest) {
                    portrait.dispose();
                    return;
                }
                portrait.colorSpace = THREE.SRGBColorSpace;
                const actorSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: portrait, depthWrite: false }));
                actorSprite.position.y = 0.85;
                actorSprite.scale.set(1.73 * portrait.image.width / portrait.image.height, 1.73, 1);
                avatar = actorSprite;
            } catch {
                return;
            }
        }
        visual.add(avatar);
    }

    function setDirections(directions) {
        pressed = directions;
    }

    function destroy() {
        stopped = true;
        listeners.abort();
        resize.disconnect();
        intersection.disconnect();
        cancelAnimationFrame(frame);
        freeModel(scene);
        renderer.dispose();
        renderer.domElement.remove();
        draco.dispose();
    }

    return { showRoom, showActor, setDirections, destroy };
}

export function mountTour(container) {
    const root = node('div', 'nfg-tour');
    const main = node('div', 'nt-main');
    const bar = node('div', 'nt-bar');
    const actorPrompt = node('span', 'nt-label', 'Walk as');
    const selector = node('div', 'nt-actors');
    selector.setAttribute('role', 'group');
    selector.setAttribute('aria-label', 'Choose a character');
    const actorButtons = new Map(actors.map(actor => {
        const control = button('nt-actor', actor.name);
        control.style.setProperty('--nt-actor', actor.color);
        selector.append(control);
        return [actor.id, control];
    }));
    bar.append(actorPrompt, selector);
    const stage = node('div', 'nt-stage');
    stage.tabIndex = 0;
    stage.setAttribute('role', 'region');
    stage.setAttribute('aria-label', 'Interactive tour');
    const fallback = node('img', 'nt-fallback');
    fallback.alt = '';
    fallback.hidden = true;
    const stageDetails = node('div', 'nt-stage-details');
    const roomTitle = node('h2', 'nt-room');
    const instructions = node('p', 'nt-instructions', 'WASD or arrows to walk · E to use a nearby door or lesson');
    stageDetails.append(roomTitle, instructions);
    const status = node('p', 'nt-status');
    status.setAttribute('role', 'status');
    status.hidden = true;
    const touch = node('div', 'nt-touch');
    touch.setAttribute('aria-label', 'Walk using the direction buttons');
    for (const [direction, glyph] of [['up', '▲'], ['left', '◀'], ['down', '▼'], ['right', '▶']]) {
        const control = button('nt-direction nt-' + direction, glyph);
        control.dataset.ntDirection = direction;
        control.setAttribute('aria-label', 'Walk ' + direction);
        touch.append(control);
    }
    const interaction = button('nt-use', 'Interact');
    interaction.disabled = true;
    stage.append(fallback, stageDetails, status, touch, interaction);
    const localNav = node('div', 'nt-local');
    const previous = button('nt-route');
    const next = button('nt-route nt-next');
    const lessonAction = node('a', 'nt-lesson-action');
    const gameAction = node('a', 'nt-game-action');
    const waterAction = node('a', 'nt-game-action', 'GOAT Water 360°');
    waterAction.href = water.href;
    const foodAction = node('a', 'nt-route', 'Fruit Collection');
    foodAction.href = '#explore/collection/food';
    const downstairsLink = button('nt-route', 'Go downstairs');
    const mechanicalAction = node('a', 'nt-game-action', mechanical.label);
    mechanicalAction.href = mechanical.href;
    const otherRoyaltiesAction = node('a', 'nt-route', otherRoyalties.label);
    otherRoyaltiesAction.href = otherRoyalties.href;
    localNav.append(previous, lessonAction, gameAction, downstairsLink, waterAction, foodAction,
        mechanicalAction, otherRoyaltiesAction, next);
    main.append(bar, stage, localNav);
    const side = node('aside', 'nt-sidebar');
    const mapTitle = node('h3', '', 'House route');
    const rooms = node('ol', 'nt-stops');
    const roomButtons = stops.map((_, index) => {
        const entry = node('li');
        const control = button('nt-stop');
        control.style.setProperty('--nt-room-color', colors[index]);
        control.append(node('span', 'nt-stop-marker'), node('span', '', nameOf(index)));
        entry.append(control);
        rooms.append(entry);
        return control;
    });
    const lessonHeading = node('h3', 'nt-lesson-heading');
    const lessons = node('ul', 'nt-lessons');
    side.append(mapTitle, rooms, lessonHeading, lessons);
    root.append(main, side);
    container.replaceChildren(root);

    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    const directions = new Set();
    let stop = 0;
    let actor = selectedActor();
    let near;
    let world;
    let roomStatus = '';
    let actorStatus = '';
    let fallbackStatus = '';
    let unavailable = false;

    function renderStatus() {
        status.textContent = [fallbackStatus, roomStatus, actorStatus].filter(Boolean).join(' ');
        status.hidden = !status.textContent;
    }

    function nearby(action) {
        near = action;
        interaction.disabled = !action;
        interaction.textContent = action?.label ?? 'Interact';
    }

    function activate(action) {
        if (!action) return;
        if (action.kind === 'lesson') {
            location.hash = dayUrl(action.day);
        } else if (action.href) {
            location.hash = action.href;
        } else {
            travel(action.stop, action.stop < stop ? 'back' : 'forward');
        }
    }

    function undoDirections() {
        directions.clear();
        world?.setDirections([]);
    }

    try {
        world = createWorld(stage, {
            nearby,
            activate,
            roomStatus(message) { roomStatus = message; renderStatus(); },
            actorStatus(message) { actorStatus = message; renderStatus(); },
            unavailable(message) {
                unavailable = true;
                fallbackStatus = message;
                fallback.hidden = !stops[stop].poster;
                touch.hidden = true;
                instructions.hidden = true;
                interaction.hidden = true;
                renderStatus();
            },
        });
    } catch {
        unavailable = true;
        fallbackStatus = 'This browser couldn’t start 3D. You can browse rooms and open lessons below.';
        fallback.hidden = !stops[stop].poster;
        touch.hidden = true;
        instructions.hidden = true;
        interaction.hidden = true;
        renderStatus();
    }

    function travel(index, entry) {
        stop = index;
        undoDirections();
        const model = stops[index];
        const title = nameOf(index);
        root.style.setProperty('--nt-accent', colors[index]);
        roomTitle.textContent = title;
        fallback.alt = title;
        if (model.poster) fallback.src = model.poster;
        else fallback.removeAttribute('src');
        fallback.hidden = !unavailable || !model.poster;
        if (!unavailable) world?.showRoom(index, entry);

        for (const [number, room] of roomButtons.entries()) {
            if (index === number) room.setAttribute('aria-current', 'location');
            else room.removeAttribute('aria-current');
        }
        previous.disabled = !index;
        previous.textContent = index ? '← ' + nameOf(previousStop(index)) : 'Outside';
        next.hidden = index === basement;
        next.textContent = index ? nameOf(nextStop(index)) + ' →' : 'Enter the tour →';
        const game = games.get(index);
        gameAction.hidden = !game;
        if (game) {
            gameAction.href = game.href;
            gameAction.textContent = game.label;
        }
        downstairsLink.hidden = index !== gameRoom;
        waterAction.hidden = index !== kitchen;
        foodAction.hidden = index !== kitchen;
        mechanicalAction.hidden = index !== yellowRoom;
        otherRoyaltiesAction.hidden = index !== yellowRoom;
        const day = index ? days[index - 1] : null;
        lessonAction.hidden = !day;
        lessonHeading.hidden = !day;
        lessons.hidden = !day;
        lessons.replaceChildren();
        if (!day) return;
        lessonAction.href = dayUrl(day.day);
        lessonAction.textContent = 'Do Day ' + day.day + ' lessons';
        lessonHeading.textContent = 'Day ' + day.day + ' · ' + day.title;
        for (const lesson of day.lessons) {
            const row = node('li');
            const link = node('a', '', lesson.title);
            link.href = lessonUrl(day.day, lesson);
            row.append(link);
            lessons.append(row);
        }
    }

    function choose(nextActor, updateHash = false) {
        actor = nextActor;
        for (const [id, control] of actorButtons) {
            control.setAttribute('aria-pressed', String(id === actor.id));
        }
        if (!unavailable) world?.showActor(actor);
        if (updateHash && location.hash.startsWith('#tour')) {
            history.replaceState(null, '', '#tour/' + actor.id);
        }
    }

    function setDirection(direction, down) {
        if (down) directions.add(direction);
        else directions.delete(direction);
        world?.setDirections([...directions]);
    }

    for (const picked of actors) {
        actorButtons.get(picked.id).addEventListener('click', () => choose(picked, true), options);
    }
    for (const [index, room] of roomButtons.entries()) {
        room.addEventListener('click', () => travel(index), options);
    }
    previous.addEventListener('click', () => { if (stop) travel(previousStop(stop), 'back'); }, options);
    next.addEventListener('click', () => travel(nextStop(stop), 'forward'), options);
    downstairsLink.addEventListener('click', () => travel(basement, 'forward'), options);
    interaction.addEventListener('click', () => activate(near), options);

    stage.addEventListener('keydown', event => {
        if (event.target !== stage || event.altKey || event.ctrlKey || event.metaKey || unavailable) return;
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        if (keys[key]) {
            event.preventDefault();
            setDirection(keys[key], true);
        } else if (key === 'e' && !event.repeat) {
            event.preventDefault();
            activate(near);
        }
    }, options);
    window.addEventListener('keyup', event => {
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        if (keys[key]) setDirection(keys[key], false);
    }, options);
    stage.addEventListener('blur', undoDirections, options);
    window.addEventListener('blur', undoDirections, options);
    window.addEventListener('hashchange', () => {
        undoDirections();
        const picked = selectedActor();
        if (location.hash.startsWith('#tour') && actor.id !== picked.id) choose(picked);
    }, options);
    for (const control of touch.children) {
        const direction = control.dataset.ntDirection;
        control.addEventListener('pointerdown', event => {
            event.preventDefault();
            control.setPointerCapture(event.pointerId);
            setDirection(direction, true);
        }, options);
        for (const eventType of ['pointerup', 'pointercancel', 'lostpointercapture']) {
            control.addEventListener(eventType, () => setDirection(direction, false), options);
        }
        control.addEventListener('keydown', event => {
            if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                setDirection(direction, true);
            }
        }, options);
        control.addEventListener('keyup', () => setDirection(direction, false), options);
        control.addEventListener('blur', () => setDirection(direction, false), options);
    }

    choose(actor);
    travel(0);
    return () => {
        listeners.abort();
        world?.destroy();
        root.remove();
    };
}
