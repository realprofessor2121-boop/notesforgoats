import { landings, boatStops } from './world/manifest.js';

const base = new URL('./world/', import.meta.url);
const routeBase = '#world';
const byId = new Map(landings.map(location => [location.id, location]));
const asset = name => new URL(name, base).href;

function text(tag, value, className) {
    const item = document.createElement(tag);
    if (value) item.textContent = value;
    if (className) item.className = className;
    return item;
}

function button(value, action, className = 'nw-button') {
    const item = text('button', value, className);
    item.type = 'button';
    item.addEventListener('click', action);
    return item;
}

function link(value, href, className = 'nw-button') {
    const item = text('a', value, className);
    item.href = href;
    return item;
}

function picture(path, alt, className) {
    const image = text('img', '', className);
    image.src = asset(path);
    image.alt = alt;
    image.decoding = 'async';
    return image;
}

function renderModel(place) {
    const column = text('div', '', 'nw-model-column');
    const stage = text('div', '', 'nw-model-stage');
    const viewer = document.createElement('model-viewer');
    viewer.alt = place.title + ' interactive 360° view';
    viewer.setAttribute('poster', asset(place.poster));
    viewer.setAttribute('camera-controls', '');
    viewer.setAttribute('touch-action', 'pan-y');
    viewer.setAttribute('camera-target', place.target);
    viewer.setAttribute('camera-orbit', place.orbit);
    viewer.setAttribute('environment-image', 'neutral');
    viewer.setAttribute('shadow-intensity', '0.30');
    viewer.setAttribute('exposure', '1.08');
    if (place.id === 'broadway') {
        viewer.setAttribute('min-camera-orbit', 'auto 10deg 6m');
        viewer.setAttribute('max-camera-orbit', 'auto 90deg 182m');
        const marker = link('Newspaper Stand', '#world/newspaper', 'nw-hotspot');
        marker.slot = 'hotspot-paper';
        marker.dataset.position = '-17m 1m -10m';
        marker.dataset.normal = '0m 1m 0m';
        viewer.append(marker);
    }
    const status = text('p', 'Loading 3D…', 'nw-model-status');
    status.setAttribute('role', 'status');
    const poster = picture(place.poster, place.title, 'nw-model-fallback');
    poster.hidden = true;
    stage.append(poster, viewer, status);
    column.append(stage);

    const tools = text('div', '', 'nw-controls');
    const spin = button('Auto-rotate', () => {
        viewer.autoRotate = !viewer.autoRotate;
        spin.setAttribute('aria-pressed', String(viewer.autoRotate));
    });
    spin.setAttribute('aria-pressed', 'false');
    tools.append(spin, button('Reset view', () => {
        viewer.cameraOrbit = place.orbit;
        viewer.cameraTarget = place.target;
        viewer.fieldOfView = 'auto';
        viewer.jumpCameraToGoal?.();
    }));
    if (place.id === 'broadway') {
        tools.append(button('Street level', () => {
            viewer.cameraTarget = '-9m 0.3m -9m';
            viewer.cameraOrbit = '105deg 82deg 30m';
            viewer.jumpCameraToGoal?.();
        }));
    }
    spin.disabled = true;
    column.append(tools);

    viewer.addEventListener('load', () => {
        status.hidden = true;
        spin.disabled = false;
    });
    function unavailable() {
        poster.hidden = false;
        viewer.hidden = true;
        status.hidden = false;
        status.textContent = '3D could not load. You can still see the original view here.';
        for (const item of tools.children) item.disabled = true;
    }
    viewer.addEventListener('error', unavailable);
    if (!customElements.get('model-viewer')) {
        customElements.whenDefined('model-viewer').then(begin);
        setTimeout(() => { if (viewer.isConnected && !customElements.get('model-viewer')) unavailable(); }, 8000);
    } else {
        // Mount first so a resolved load still belongs to the visible panel.
        queueMicrotask(begin);
    }
    function begin() {
        if (!viewer.isConnected) return;
        customElements.get('model-viewer').dracoDecoderLocation = new URL('../explore/vendor/draco/', import.meta.url).href;
        viewer.src = asset(place.model);
    }
    return column;
}

function renderBoat() {
    const tour = text('div', '', 'nw-boat');
    const figure = text('figure', '', 'nw-boat-figure');
    const art = picture(boatStops[0].image, boatStops[0].alt, 'nw-boat-photo');
    const caption = text('figcaption', '', 'nw-boat-caption');
    const title = text('h3');
    const detail = text('p');
    caption.append(title, detail);
    figure.append(art, caption);
    const navigation = text('div', '', 'nw-boat-stops');
    navigation.setAttribute('role', 'group');
    navigation.setAttribute('aria-label', 'Boat tour stops');
    const stops = boatStops.map((stop, index) => button(stop.title, () => show(index), 'nw-boat-stop'));
    navigation.append(...stops);
    const pager = text('div', '', 'nw-controls');
    let current = 0;
    const previous = button('← Previous stop', () => show(current - 1));
    const next = button('Next stop →', () => show(current + 1));
    pager.append(previous, next);
    tour.append(figure, navigation, pager);
    function show(index) {
        current = index;
        const stop = boatStops[index];
        art.src = asset(stop.image);
        art.alt = stop.alt;
        title.textContent = stop.title;
        detail.textContent = stop.caption;
        for (const [i, control] of stops.entries()) control.setAttribute('aria-pressed', String(i === current));
        previous.disabled = current === 0;
        next.disabled = current === boatStops.length - 1;
    }
    show(0);
    return tour;
}

const width = 8;
const height = 6;
const stand = { x: 1, y: 4, label: 'Newspaper Stand' };
const stops = [
    { x: 6, y: 1, label: 'Corner Shop', letter: 'C' },
    { x: 7, y: 4, label: 'Park Gate', letter: 'P' },
    { x: 3, y: 0, label: 'Apartment Lobby', letter: 'L' },
];
const blocks = new Set([0, 1, 8, 9, 10, 11, 16, 17, 19, 21, 22, 27, 29, 37, 44, 45]);
const controls = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
const point = (x, y) => x + y * width;

function renderPaperGame() {
    const wrap = text('section', '', 'nw-game');
    wrap.append(text('h3', 'Newspaper Delivery'), text('p',
        'Pick up your bundle at the stand. Deliver one paper to each location. Walk with the arrows, WASD, or the direction buttons.'));
    const board = text('div', '', 'nw-game-board');
    board.tabIndex = 0;
    board.setAttribute('role', 'region');
    board.setAttribute('aria-label', 'Broadway delivery map');
    const player = { x: 1, y: 5, papers: 0, pickedUp: false, dropped: new Set() };
    const status = text('p', '', 'nw-game-status');
    status.setAttribute('role', 'status');
    const count = text('p', '', 'nw-game-count');
    const cells = new Map();

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = point(x, y);
            const cell = button('', () => walk(x - player.x, y - player.y), 'nw-game-tile');
            const name = stops.find(door => door.x === x && door.y === y);
            const start = x === stand.x && y === stand.y;
            cell.classList.toggle('nw-lot', blocks.has(index));
            if (name || start) cell.classList.add('nw-game-destination');
            cell.dataset.letter = name?.letter || (start ? 'N' : '');
            cell.dataset.place = name?.label || (start ? stand.label : blocks.has(index) ? 'Building' : 'Street');
            cell.setAttribute('aria-label', cell.dataset.place + ', row ' + (y + 1) + ', column ' + (x + 1));
            cell.title = cell.dataset.place;
            cells.set(index, cell);
            board.append(cell);
        }
    }

    function refresh() {
        for (const [index, cell] of cells) {
            const here = index === point(player.x, player.y);
            const wasDelivered = player.dropped.has(index);
            cell.classList.toggle('nw-game-player', here);
            cell.classList.toggle('nw-game-delivered', wasDelivered);
            cell.textContent = here ? '●' : wasDelivered ? '✓' : cell.dataset.letter;
            cell.disabled = blocks.has(index) || player.dropped.size === stops.length;
        }
        count.textContent = 'Papers ' + player.papers + ' · Delivered ' + player.dropped.size + ' of ' + stops.length;
    }

    function walk(dx, dy) {
        const x = player.x + dx;
        const y = player.y + dy;
        if (player.dropped.size === stops.length || Math.abs(dx) + Math.abs(dy) !== 1 ||
            x < 0 || y < 0 || x >= width || y >= height || blocks.has(point(x, y))) return;
        player.x = x;
        player.y = y;
        if (x === stand.x && y === stand.y && !player.pickedUp) {
            player.pickedUp = true;
            player.papers = stops.length;
            status.textContent = 'Bundle picked up. Deliver to the Corner Shop, Park Gate and Apartment Lobby.';
        }
        const destination = stops.find(stop => stop.x === x && stop.y === y);
        if (destination && !player.dropped.has(point(x, y))) {
            if (!player.papers) status.textContent = 'Pick up a bundle at the Newspaper Stand before delivering.';
            else {
                player.papers -= 1;
                player.dropped.add(point(x, y));
                status.textContent = player.dropped.size === stops.length ? 'Route complete. All three deliveries made.' :
                    'Delivered to ' + destination.label + '.';
            }
        }
        refresh();
    }

    function restart() {
        player.x = 1;
        player.y = 5;
        player.papers = 0;
        player.pickedUp = false;
        player.dropped.clear();
        status.textContent = 'Head to the Newspaper Stand marked N.';
        refresh();
    }
    board.addEventListener('keydown', event => {
        const move = controls[event.key];
        if (!move || event.altKey || event.metaKey || event.ctrlKey) return;
        event.preventDefault();
        walk(...move);
    });
    const pad = text('div', '', 'nw-controls');
    for (const [label, key] of [['Walk up', 'ArrowUp'], ['Walk left', 'ArrowLeft'], ['Walk down', 'ArrowDown'], ['Walk right', 'ArrowRight']]) {
        pad.append(button(label, () => walk(...controls[key])));
    }
    pad.append(button('Restart route', restart));
    const legend = text('ul', '', 'nw-game-key');
    for (const [letter, label] of [['N', stand.label], ...stops.map(stop => [stop.letter, stop.label])]) {
        legend.append(text('li', letter + ' · ' + label));
    }
    wrap.append(board, legend, pad, count, status);
    restart();
    return wrap;
}

function viewFor(place, play) {
    const panel = text('section', '', 'nw-panel');
    const header = text('div', '', 'nw-panel-intro');
    const heading = text('h2', place.title);
    header.append(heading, text('p', place.description));
    panel.append(header);

    if (place.id === 'boat') panel.append(renderBoat());
    else if (place.id === 'newspaper' && play) panel.append(renderPaperGame());
    else panel.append(renderModel(place));

    const actions = text('div', '', 'nw-controls nw-visit-links');
    if (place.id === 'broadway') {
        actions.append(link('Visit the Newspaper Stand', '#world/newspaper', 'nw-button nw-primary'));
    } else if (place.id === 'newspaper') {
        actions.append(play ? link('View the stand in 3D', '#world/newspaper') :
            link('Play Newspaper Delivery', '#world/newspaper/play', 'nw-button nw-primary'));
    }
    if (place.lesson) actions.append(link(place.lessonLabel, place.lesson));
    if (place.original) {
        const external = link(place.originalLabel, place.original, 'nw-button nw-primary');
        external.target = '_blank';
        external.rel = 'noopener noreferrer';
        actions.append(external);
    }
    if (actions.children.length) panel.append(actions);
    if (place.originalArt) {
        const figure = text('figure', '', 'nw-gift-original');
        figure.append(picture(place.originalArt, 'Original black NFG Helping Santa gift design'),
            text('figcaption', 'Original Helping Santa artwork'));
        panel.append(figure);
    }
    if (place.ship) {
        const details = text('details', '', 'nw-launch');
        details.append(text('summary', 'Original Spaces launch and spacecraft'));
        const media = text('div', '', 'nw-launch-media');
        media.append(picture(place.ship, 'Original Spaces spacecraft artwork'));
        const player = document.createElement('video');
        player.controls = true;
        player.preload = 'none';
        player.poster = asset(place.poster);
        player.src = place.trailer;
        player.setAttribute('aria-label', 'Original Spaces launch');
        media.append(player);
        details.append(media);
        panel.append(details);
    }
    panel.append(text('p', place.origin, 'nw-source'));
    return panel;
}

export function mountWorld(container) {
    const shell = text('div', '', 'nw-world');
    const navigation = text('nav', '', 'nw-destinations');
    const main = text('div', '', 'nw-display');
    const controls = new Map();
    navigation.setAttribute('aria-label', 'World locations');
    for (const place of landings) {
        const item = link('', routeBase + '/' + place.id, 'nw-destination');
        item.append(picture(place.poster, ''), text('span', place.title));
        controls.set(place.id, item);
        navigation.append(item);
    }
    shell.append(navigation, main);
    container.replaceChildren(shell);
    let previous = '';
    function showRoute() {
        const [page, route, subview] = location.hash.slice(1).split('/');
        if (page && page !== 'world' && !byId.has(page)) {
            previous = '';
            main.replaceChildren();
            return;
        }
        const selected = byId.get(page === 'world' ? route : page) || landings[0];
        const play = selected.id === 'newspaper' && subview === 'play';
        const key = selected.id + (play ? '/play' : '');
        if (key === previous) return;
        previous = key;
        for (const [id, item] of controls) {
            if (selected.id === id) item.setAttribute('aria-current', 'page');
            else item.removeAttribute('aria-current');
        }
        main.replaceChildren(viewFor(selected, play));
    }
    window.addEventListener('hashchange', showRoute);
    showRoute();
    return () => {
        window.removeEventListener('hashchange', showRoute);
        shell.remove();
    };
}
