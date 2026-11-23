import { days } from '../explore/lessons.js';

const directoryPath = new URL('./rooms/', import.meta.url);
const explorePath = new URL('../explore/', import.meta.url);
const asset = (name) => new URL(name, directoryPath).href;
const exploreAsset = (name) => new URL(name, explorePath).href;
const mounted = new WeakSet();

const colorNames = ['Black', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'White'];
const names = ['Old bedroom', 'Personal care room', 'Game room', 'Business room', 'Studio',
    'Distribution office', 'Collection & marketing', 'Trophy room', 'Future & legacy'];

const course = days.map(({ day, title, color }) => ({
    id: `class-day-${day}`, name: names[day], context: `Day ${day} · ${title}`, color,
    image: asset(`day-${day}.webp`), model: exploreAsset(`models/room-${day}.glb`),
    source: 'Original NFG lesson image and a reference-based 3D cutaway.',
    note: day === 0 ? 'The class begins in the old bedroom on Broadway.' :
        day === 8 ? 'The course has a White Day scene. The elevator-house master has no separately named White Room collection.' : '',
}));

function currentAsset(id, name, context, detail = {}) {
    return {
        id, name, context, image: asset(`${id}.webp`), model: asset(`${id}.glb`),
        source: 'Original geometry from the current elevator-house model, with simplified materials for the web.',
        ...detail,
    };
}

const shower = currentAsset('shower', 'Shower', 'Basement bathroom fixture');
const bathtub = currentAsset('bathtub', 'Bathtub', 'Basement bathroom fixture');
const house = [
    ...course.slice(0, 8).map((room, index) => ({
        ...room, id: `house-${colorNames[index].toLowerCase()}`, name: `${colorNames[index]} Room`,
        context: `Day ${index} · ${names[index]}`, note: '',
        source: 'Named collection in the current house. Preview and 3D cutaway follow the matching lesson reference.',
    })),
    currentAsset('basement-bedroom', 'Basement bedroom', 'Additional house room'),
    currentAsset('basement-bathroom', 'Basement bathroom', 'Additional house room', { related: [shower, bathtub] }),
    currentAsset('basement-storage', 'Basement storage room', 'Additional house room'),
    currentAsset('house-gym', 'Gym', 'Additional house room'),
];
const facilities = [
    currentAsset('swimming-pool', 'Swimming pool', 'House facility'),
    {
        id: 'basketball-court', name: 'Basketball court', context: 'Outdoor grounds', image: asset('basketball-court.webp'),
        model: asset('basketball-court.glb'), source: 'Original court reference from the archived NFG property model and a reference-based 3D court.',
    },
    {
        id: 'laundry', name: 'Laundry area', context: 'Archived room reference', image: asset('laundry.webp'),
        model: asset('laundry.glb'), source: 'Original NFG laundry photos and a reference-based 3D cutaway.',
        note: 'The current master has no separately named laundry collection.',
        alternate: asset('laundry-red.webp'), alternateText: 'View the Red Day laundry study',
    },
    {
        id: 'house-blueprint', name: 'NFG property blueprint', context: 'Day 8 · New Properties', image: asset('house-blueprint.webp'),
        source: 'Original archived NFG planning illustration.', fit: 'portrait', download: true,
    },
];

export const roomDirectory = { course, house, facilities };

const groups = [
    { id: 'course', title: 'Class rooms', records: course },
    { id: 'house', title: 'Elevator-house rooms', records: house },
    { id: 'facilities', title: 'Facilities & plans', records: facilities },
];

function element(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
}

function button(cls, text, run) {
    const control = element('button', cls, text);
    control.type = 'button';
    if (run) control.addEventListener('click', run);
    return control;
}

function image(src, alt = '', eager = false) {
    const node = element('img', 'nfg-room-image');
    node.src = src;
    node.alt = alt;
    node.decoding = 'async';
    if (!eager) node.loading = 'lazy';
    return node;
}

function anchor(text, href, cls = 'nfg-room-link') {
    const link = element('a', cls, text);
    link.href = href;
    return link;
}

export function mountRooms(container) {
    if (!container || mounted.has(container)) return;
    mounted.add(container);
    container.classList.add('nfg-room-directory');
    let selected = 'course';
    let previousFocus;
    let activeViewer;
    let modelLoadTimer;

    const hero = element('div', 'nfg-room-hero');
    const heroPhoto = image(exploreAsset('posters/house.webp'), 'The current white NFG elevator house', true);
    const heroContent = element('div', 'nfg-room-hero-copy');
    heroContent.append(element('h3', '', 'The NFG elevator house'),
        element('p', '', 'The nine class scenes and the twelve named rooms in the house source overlap. Browse either set, or open the facilities and property plan.'),
        anchor('Walk the house', '#tour', 'nfg-room-link nfg-room-primary'));
    hero.append(heroPhoto, heroContent);

    const filters = element('div', 'nfg-room-filters');
    filters.setAttribute('role', 'group');
    filters.setAttribute('aria-label', 'Choose a room collection');
    const groupButtons = groups.map(group => {
        const control = button('nfg-room-filter', `${group.title} (${group.records.length})`, () => {
            selected = group.id;
            render();
        });
        control.dataset.group = group.id;
        return control;
    });
    filters.append(...groupButtons);
    const results = element('div', 'nfg-room-results');
    const notice = element('p', 'nfg-room-note');
    notice.setAttribute('aria-live', 'polite');
    const grid = element('div', 'nfg-room-grid');
    results.append(notice, grid);

    const modal = element('dialog', 'nfg-room-dialog');
    modal.setAttribute('aria-label', 'Room preview');
    const header = element('div', 'nfg-room-dialog-header');
    const title = element('h3');
    const dismiss = button('nfg-room-link', 'Close', () => modal.close());
    header.append(title, dismiss);
    const controls = element('div', 'nfg-room-controls');
    const view = element('div', 'nfg-room-dialog-stage');
    const caption = element('p', 'nfg-room-note');
    const status = element('p', 'nfg-room-model-status');
    status.setAttribute('role', 'status');
    modal.append(header, controls, view, caption, status);
    modal.addEventListener('close', () => {
        clearTimeout(modelLoadTimer);
        activeViewer = undefined;
        view.replaceChildren();
        previousFocus?.focus();
    });
    container.replaceChildren(hero, filters, results, modal);

    function render() {
        const group = groups.find(item => item.id === selected);
        for (const control of groupButtons) control.setAttribute('aria-pressed', String(control.dataset.group === selected));
        const messages = {
            course: 'Days 0–8. The Black Day old bedroom belongs to the Broadway part of the course.',
            house: 'Eight color rooms and four additional rooms are named in the current house source.',
            facilities: 'The swimming pool and court are facilities. The separate laundry layout and blueprint come from the NFG archive.',
        };
        notice.textContent = messages[selected];
        grid.replaceChildren(...group.records.map(card));
    }

    function card(record) {
        const article = element('article', 'nfg-room-card');
        if (record.color) article.style.setProperty('--nfg-room-color', record.color);
        const picture = button('nfg-room-card-picture', undefined, () => open(record, picture));
        picture.setAttribute('aria-label', `View ${record.name}`);
        picture.append(image(record.image));
        const name = element('h3', '', record.name);
        const context = element('p', 'nfg-room-note', record.context);
        const actions = element('div', 'nfg-room-card-actions');
        if (record.model) {
            const rotate = button('nfg-room-link', '360° view', () => open(record, rotate, 'model'));
            rotate.setAttribute('aria-label', `360° view of ${record.name}`);
            actions.append(rotate);
        }
        if (record.download) {
            const download = anchor('Open full blueprint', record.image);
            download.target = '_blank';
            download.rel = 'noopener';
            actions.append(download);
        }
        for (const item of record.related || []) {
            const detail = button('nfg-room-link', item.name, () => open(item, detail, 'model'));
            actions.append(detail);
        }
        article.append(picture, name, context);
        if (actions.childElementCount) article.append(actions);
        return article;
    }

    function open(record, opener, mode = 'photo') {
        previousFocus = opener;
        title.textContent = record.name;
        modal.setAttribute('aria-label', record.name);
        caption.textContent = [record.source, record.note].filter(Boolean).join(' ');
        const photograph = button('nfg-room-link', 'Preview image', () => select('photo'));
        const model = record.model ? button('nfg-room-link', '360° model', () => select('model')) : undefined;
        const alternate = record.alternate ? button('nfg-room-link', record.alternateText, () => select('alternate')) : undefined;
        controls.replaceChildren(...[photograph, model, alternate].filter(Boolean));
        controls.hidden = !model && !alternate;

        function select(which) {
            clearTimeout(modelLoadTimer);
            status.textContent = '';
            activeViewer = undefined;
            for (const [key, control] of [['photo', photograph], ['model', model], ['alternate', alternate]]) {
                control?.setAttribute('aria-pressed', String(which === key));
            }
            view.classList.toggle('nfg-room-stage-model', which === 'model');
            view.classList.toggle('nfg-room-stage-portrait', record.fit === 'portrait');
            if (which !== 'model') {
                view.replaceChildren(image(which === 'alternate' ? record.alternate : record.image, record.name, true));
                return;
            }
            const viewer = element('model-viewer', 'nfg-room-viewer');
            activeViewer = viewer;
            viewer.setAttribute('src', record.model);
            viewer.setAttribute('poster', record.image);
            viewer.setAttribute('alt', `Interactive 3D view of ${record.name}`);
            viewer.setAttribute('camera-controls', '');
            viewer.setAttribute('touch-action', 'pan-y');
            if (record.id.startsWith('class-day-') || record.id.startsWith('house-') && record.id !== 'house-gym') {
                viewer.setAttribute('camera-orbit', '28deg 67deg auto');
            }
            status.textContent = 'Loading 3D model…';
            viewer.addEventListener('load', () => {
                if (activeViewer !== viewer) return;
                clearTimeout(modelLoadTimer);
                status.textContent = 'Drag to rotate. Pinch or scroll to zoom.';
            });
            function showUnavailable() {
                if (activeViewer === viewer) status.textContent = 'The 3D view is unavailable in this browser. The preview image is available above.';
            }
            viewer.addEventListener('error', showUnavailable);
            view.replaceChildren(viewer);
            modelLoadTimer = setTimeout(showUnavailable, 14000);
        }
        if (!modal.open) modal.showModal();
        select(mode);
        dismiss.focus();
    }

    customElements.whenDefined('model-viewer').then(() => {
        customElements.get('model-viewer').dracoDecoderLocation = exploreAsset('vendor/draco/');
    });
    render();
}
