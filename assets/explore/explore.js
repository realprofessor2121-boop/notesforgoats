import { days } from './lessons.js';
import { models } from './models.js';
import { extraPhotos } from './photos.js';
import { billSummary, mountBillEditor } from './bills.js';
import { notesPoseOverrides } from './notes-poses.js';
import { chapterExtras } from '../expansion/lesson-extras.js';

const byId = (id) => document.getElementById(id);
const results = byId('x-results');
const filters = byId('x-filters');
const selectDay = byId('x-day');
const dialog = byId('x-media-dialog');
const viewer = byId('x-viewer');
const photo = byId('x-full-photo');
const status = byId('x-media-status');
const spin = byId('x-spin');
const animation = byId('x-animation');
const billDisplay = byId('x-model-bill-status');
const billEditor = byId('x-bill-editor');
const previous = byId('x-previous');
const next = byId('x-next');
const modelViewerReady = customElements.whenDefined('model-viewer').then(() => {
    customElements.get('model-viewer').dracoDecoderLocation = new URL('assets/explore/vendor/draco/', document.baseURI).href;
});

const categories = [
    ['all', 'All models'], ['house', 'House & rooms'], ['bills', 'Household bills'],
    ['cars', 'Broadway cars'], ['anatomy', 'Anatomy'], ['food', 'Food & drinks'],
    ['logos', 'Company logos'], ['property', 'Property'], ['studio', 'Studio equipment'], ['business', 'Yellow Room'], ['projects', 'NFG projects'],
    ['fitness', 'Workout'], ['instruments', 'Instruments'], ['blockchain', 'Blockchain'], ['awards', 'Trophies'],
];
const allLessons = days.flatMap(day => day.lessons.map(lesson => ({ ...lesson, day: day.day })));
const lessonsById = new Map(allLessons.map(lesson => [lesson.id, lesson]));
const modelsById = new Map(models.map(model => [model.id, model]));
const photosByLesson = new Map(allLessons.map(lesson => {
    const items = [
        { title: lesson.title, image: lesson.image, alt: lesson.alt, label: 'Lesson cover' },
        ...(extraPhotos[lesson.id] || []),
    ].map(item => {
        const pose = notesPoseOverrides[item.image];
        return { ...item, ...pose, lesson: lesson.id };
    });
    const distinct = new Map();
    for (const item of items) {
        if (!distinct.has(item.image)) distinct.set(item.image, item);
    }
    return [lesson.id, [...distinct.values()]];
}));
const controls = [spin, animation, byId('x-reset'), ...dialog.querySelectorAll('[data-x-orbit], [data-x-zoom]')];

let category = 'all';
let mode = '3d';
let galleryDay = 'all';
let viewedItems = [];
let viewedIndex = 0;
let opener;
let loadingTimer;
let requestNumber = 0;

function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
}

function button(className, content) {
    const node = element('button', className, content);
    node.type = 'button';
    return node;
}

function context(lessonID) {
    const lesson = lessonsById.get(lessonID);
    return lesson ? `Day ${lesson.day} · ${lesson.title}` : 'Notes For Goats';
}

function countLabel(count, noun) {
    return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function createTile(item, index, items, isModel) {
    const tile = button('x-tile');
    if (isModel) tile.dataset.contain = '';
    const art = element('span', 'x-tile-art');
    const image = element('img');
    image.src = isModel ? item.poster : item.image;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    if (isModel) image.addEventListener('error', () => { image.hidden = true; });
    art.append(image);
    if (isModel) art.append(element('span', 'x-tile-mark', '↻ 360°'));
    const caption = element('span', 'x-tile-caption');
    caption.append(element('span', 'x-tile-title', item.title));
    if (isModel) caption.append(element('small', '', context(item.lesson)));
    else if (item.label) caption.append(element('small', '', item.label));
    if (item.category === 'bills') caption.append(billSummary(item.id));
    tile.append(art, caption);
    tile.addEventListener('click', () => openItems(items, index, tile));
    return tile;
}

function renderModels() {
    const items = models.filter(item => category === 'all' || item.category === category);
    byId('x-count').textContent = countLabel(items.length, 'model');
    const grid = element('div', 'x-grid');
    for (const [i, item] of items.entries()) grid.append(createTile(item, i, items, true));
    results.replaceChildren(grid);
}

function renderPhotos(focusLesson) {
    const shownDays = days.filter(day => galleryDay === 'all' || String(day.day) === galleryDay);
    let total = 0;
    const daySections = shownDays.map((day, index) => {
        const section = element('details', 'x-photo-day');
        section.open = index === 0 || galleryDay !== 'all';
        section.style.setProperty('--x-day-color', day.color);
        const summary = element('summary');
        const dayCount = day.lessons.reduce((sum, lesson) => sum + photosByLesson.get(lesson.id).length, 0);
        total += dayCount;
        summary.append(element('strong', '', `Day ${day.day}`), document.createTextNode(day.title),
            element('small', '', countLabel(dayCount, 'photo')));
        const list = element('div', 'x-day-lessons');
        for (const lesson of day.lessons) {
            const items = photosByLesson.get(lesson.id);
            const details = element('details', 'x-photo-lesson');
            details.id = 'x-lesson-' + lesson.id;
            details.open = lesson.id === focusLesson;
            const lessonSummary = element('summary', '', lesson.title);
            lessonSummary.append(element('small', '', countLabel(items.length, 'photo')));
            const grid = element('div', 'x-grid');
            details.append(lessonSummary, grid);
            const fillGrid = () => {
                if (!details.open || grid.childElementCount) return;
                for (const [i, item] of items.entries()) grid.append(createTile(item, i, items, false));
            };
            fillGrid();
            details.addEventListener('toggle', fillGrid);
            list.append(details);
        }
        section.append(summary, list);
        return section;
    });
    byId('x-count').textContent = countLabel(total, 'photo');
    results.replaceChildren(...daySections);
}

function setMode(nextMode, { jump = false, updateLocation = false, focusLesson } = {}) {
    mode = nextMode;
    filters.hidden = mode !== '3d';
    selectDay.parentElement.hidden = mode !== 'photos';
    for (const control of document.querySelectorAll('[data-x-mode]')) {
        control.setAttribute('aria-pressed', String(control.dataset.xMode === mode));
    }
    if (mode === '3d') renderModels();
    else renderPhotos(focusLesson);
    if (updateLocation) history.replaceState(null, '', mode === '3d' ? '#explore' : '#explore/photos');
    if (jump) {
        const motion = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
        const target = focusLesson ? byId('x-lesson-' + focusLesson) : byId('x-collection');
        requestAnimationFrame(() => target?.scrollIntoView({ behavior: motion, block: 'start' }));
    }
}

function selectCategory(id) {
    if (!categories.some(([value]) => value === id)) return;
    category = id;
    for (const chip of filters.children) chip.setAttribute('aria-pressed', String(chip.dataset.category === id));
}

for (const [id, label] of categories) {
    if (id !== 'all' && !models.some(model => model.category === id)) continue;
    const chip = button('', label);
    chip.dataset.category = id;
    chip.setAttribute('aria-pressed', String(id === category));
    chip.addEventListener('click', () => {
        selectCategory(id);
        renderModels();
    });
    filters.append(chip);
}

const allDaysOption = element('option', '', 'All days');
allDaysOption.value = 'all';
selectDay.append(allDaysOption);
for (const day of days) {
    const option = element('option', '', `Day ${day.day} · ${day.title}`);
    option.value = String(day.day);
    selectDay.append(option);
}
selectDay.addEventListener('change', () => {
    galleryDay = selectDay.value;
    renderPhotos();
});

function showExploreRoute() {
    const [page, view, id] = location.hash.slice(1).split('/');
    if (page.startsWith('day-') && lessonsById.has(view)) {
        const card = byId('nfg-lesson-card-' + view);
        if (card) requestAnimationFrame(() => {
            card.focus({ preventScroll: true });
            card.scrollIntoView({ block: 'start' });
        });
        return;
    }
    if (page !== 'explore') return;
    const lesson = lessonsById.get(id);
    if (view === 'photos') {
        galleryDay = lesson ? String(lesson.day) : 'all';
        selectDay.value = galleryDay;
        setMode('photos', { jump: true, focusLesson: lesson?.id });
    } else {
        if (view === 'collection') selectCategory(id);
        setMode('3d', { jump: view === 'collection' });
        if (view === 'model' && modelsById.has(id)) {
            const index = models.findIndex(model => model.id === id);
            openItems(models, index, document.querySelector('[data-x-open="house"]'));
        }
    }
}
window.addEventListener('hashchange', showExploreRoute);

for (const control of document.querySelectorAll('[data-x-mode], [data-x-jump]')) {
    control.addEventListener('click', () => {
        setMode(control.dataset.xMode || control.dataset.xJump, {
            jump: Boolean(control.dataset.xJump), updateLocation: true,
        });
    });
}

for (const entry of document.querySelectorAll('[data-x-open]')) {
    entry.addEventListener('click', () => {
        const model = modelsById.get(entry.dataset.xOpen);
        if (!model) return;
        const related = models.filter(item => item.category === model.category);
        openItems(related, related.indexOf(model), entry);
    });
}

for (const day of days) {
    const lessonCards = byId(`page-day-${day.day}`).querySelectorAll('.chapter-card');
    lessonCards.forEach((card, index) => {
        const lesson = day.lessons[index];
        card.id = 'nfg-lesson-card-' + lesson.id;
        card.tabIndex = -1;
        const items = photosByLesson.get(lesson.id);
        const cover = card.querySelector('.chapter-image-container img');
        if (cover && notesPoseOverrides[lesson.image]) {
            cover.src = items[0].image;
            cover.alt = items[0].alt;
        }
        const related = models.filter(model => model.lesson === lesson.id || model.additionalLessons?.includes(lesson.id));
        const actions = element('div', 'x-lesson-actions');
        const photos = button('', countLabel(items.length, 'photo'));
        photos.setAttribute('aria-label', `View ${countLabel(items.length, 'photo')} for ${lesson.title}`);
        photos.addEventListener('click', () => openItems(items, 0, photos));
        actions.append(photos);
        if (related.length) {
            const modelButton = button('', `↻ ${countLabel(related.length, '3D model')}`);
            modelButton.setAttribute('aria-label', `View ${countLabel(related.length, '3D model')} for ${lesson.title}`);
            modelButton.addEventListener('click', () => openItems(related, 0, modelButton));
            actions.append(modelButton);
        }
        if (lesson.id === '3-4' || lesson.id === '5-6') {
            const downloadCalendar = element('a', 'x-calendar-lesson-link', 'Blender calendar ↓');
            downloadCalendar.href = 'assets/explore/downloads/nfg-distribution-calendar.blend';
            downloadCalendar.download = '';
            downloadCalendar.setAttribute('aria-label', 'Download the NFG Royalty Distribution Calendar for Blender');
            actions.append(downloadCalendar);
        }
        if (lesson.id === '3-4') {
            const royalties = element('a', 'x-calendar-lesson-link', 'Explore the royalty walls ↗');
            royalties.href = '#mechanical';
            actions.append(royalties);
        }
        if (lesson.id === '1-7') {
            const duo = element('a', 'x-calendar-lesson-link', 'NFG iPhone Duo ↗');
            duo.href = '#duo';
            actions.append(duo);
        }
        if (lesson.id === '2-6') {
            const playMaze = element('a', 'x-calendar-lesson-link', 'Play the Notes arcade ↗');
            playMaze.href = '#arcade';
            actions.append(playMaze);
        }
        for (const [text, href] of chapterExtras[lesson.id] || []) {
            const extra = element('a', 'x-calendar-lesson-link', text + ' ↗');
            extra.href = href;
            actions.append(extra);
        }
        card.append(actions);
    });
}

function announce(message) {
    status.textContent = message;
    status.hidden = !message;
}

function setControls(enabled) {
    for (const control of controls) control.disabled = !enabled;
}

function setSpinning(enabled) {
    viewer.toggleAttribute('auto-rotate', enabled);
    spin.setAttribute('aria-pressed', String(enabled));
}

function setCamera(item) {
    viewer.setAttribute('camera-orbit', item.orbit || '25deg 72deg auto');
    viewer.setAttribute('field-of-view', item.fov || '30deg');
    viewer.jumpCameraToGoal?.();
}

function showItem() {
    const item = viewedItems[viewedIndex];
    if (!item) return;
    const hasModel = Boolean(item.src);
    const token = ++requestNumber;
    clearTimeout(loadingTimer);
    setSpinning(false);
    viewer.hidden = !hasModel;
    viewer.closest('.x-viewport').toggleAttribute('data-logo', item.category === 'logos' || Boolean(item.lightBackground));
    viewer.pause?.();
    viewer.removeAttribute('animation-name');
    animation.hidden = !item.clip;
    animation.textContent = 'Play animation';
    animation.setAttribute('aria-pressed', 'false');
    if (item.clip) viewer.setAttribute('animation-name', item.clip);
    viewer.removeAttribute('src');
    viewer.removeAttribute('poster');
    photo.hidden = hasModel;
    photo.removeAttribute('src');
    byId('x-viewer-controls').hidden = !hasModel;
    const isBill = item.category === 'bills';
    billDisplay.hidden = !isBill;
    billEditor.hidden = !isBill;
    billDisplay.replaceChildren();
    billEditor.replaceChildren();
    if (isBill) {
        billDisplay.append(billSummary(item.id));
        mountBillEditor(billEditor, item.id);
    }
    setControls(false);
    byId('x-media-context').textContent = context(item.lesson);
    byId('x-media-title').textContent = item.title;
    byId('x-media-kind').textContent = hasModel ? (item.label || 'NFG original · 3D model') : (item.label || 'Lesson photo');
    const description = byId('x-media-description');
    description.textContent = item.description || '';
    description.hidden = !description.textContent;
    const lessonLink = byId('x-lesson-link');
    lessonLink.hidden = !item.lesson;
    if (item.lesson) lessonLink.href = '#day-' + lessonsById.get(item.lesson).day;
    const signup = byId('x-signup-link');
    signup.hidden = item.category !== 'logos';
    if (!signup.hidden) signup.href = '#signup/' + item.id.replace(/^logo-/, '');
    byId('x-pagination').hidden = viewedItems.length < 2;
    byId('x-item-position').textContent = `${viewedIndex + 1} of ${viewedItems.length}`;
    previous.disabled = viewedIndex === 0;
    next.disabled = viewedIndex >= viewedItems.length - 1;
    if (hasModel) {
        announce('Loading 3D model…');
        viewer.alt = `Interactive 3D model of ${item.title}`;
        setCamera(item);
        if (item.poster) viewer.setAttribute('poster', item.poster);
        modelViewerReady.then(() => {
            if (token === requestNumber && dialog.open) viewer.setAttribute('src', item.src);
        });
        loadingTimer = setTimeout(() => {
            if (token === requestNumber) showModelFallback('The 3D preview is taking longer to load.');
        }, 30000);
    } else {
        announce('');
        photo.alt = item.alt || item.title;
        photo.src = item.image;
    }
}

function openItems(items, index, trigger) {
    opener = trigger;
    viewedItems = items;
    viewedIndex = index;
    if (!dialog.open) dialog.showModal();
    showItem();
}

function move(direction) {
    const index = viewedIndex + direction;
    if (index < 0 || index >= viewedItems.length) return;
    viewedIndex = index;
    showItem();
}

function showModelFallback(message) {
    const item = viewedItems[viewedIndex];
    if (!dialog.open || !item?.src) return;
    announce(message);
    if (item.poster) {
        photo.alt = `Preview of ${item.title}`;
        photo.src = item.poster;
        photo.hidden = false;
    }
    viewer.hidden = true;
}

function changeOrbit(degrees, zoom) {
    if (!viewer.getCameraOrbit) return;
    setSpinning(false);
    const orbit = viewer.getCameraOrbit();
    const angle = orbit.theta * 180 / Math.PI + degrees;
    const elevation = orbit.phi * 180 / Math.PI;
    viewer.setAttribute('camera-orbit', `${angle}deg ${elevation}deg ${orbit.radius * zoom}m`);
    viewer.jumpCameraToGoal?.();
}

viewer.addEventListener('load', () => {
    if (!dialog.open || !viewedItems[viewedIndex]?.src) return;
    clearTimeout(loadingTimer);
    viewer.hidden = false;
    photo.hidden = true;
    announce('');
    setControls(true);
});
viewer.addEventListener('error', () => {
    clearTimeout(loadingTimer);
    showModelFallback('This browser could not open the 3D model.');
});
photo.addEventListener('error', () => { if (!photo.hidden) announce('This photo could not be loaded.'); });
byId('x-close').addEventListener('click', () => dialog.close());
byId('x-lesson-link').addEventListener('click', () => dialog.close());
byId('x-signup-link').addEventListener('click', () => dialog.close());
previous.addEventListener('click', () => move(-1));
next.addEventListener('click', () => move(1));
spin.addEventListener('click', () => setSpinning(spin.getAttribute('aria-pressed') !== 'true'));
animation.addEventListener('click', () => {
    const playing = animation.getAttribute('aria-pressed') === 'true';
    if (playing) viewer.pause?.();
    else viewer.play?.();
    animation.setAttribute('aria-pressed', String(!playing));
    animation.textContent = playing ? 'Play animation' : 'Pause animation';
});
byId('x-reset').addEventListener('click', () => {
    setSpinning(false);
    setCamera(viewedItems[viewedIndex]);
    viewer.resetTurntableRotation?.();
});
for (const control of dialog.querySelectorAll('[data-x-orbit], [data-x-zoom]')) {
    control.addEventListener('click', () => {
        const direction = Number(control.dataset.xOrbit || control.dataset.xZoom);
        if (control.dataset.xOrbit) changeOrbit(direction * 20, 1);
        else changeOrbit(0, direction > 0 ? .8 : 1.25);
    });
}
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => {
    ++requestNumber;
    clearTimeout(loadingTimer);
    setSpinning(false);
    viewer.pause?.();
    viewer.removeAttribute('src');
    viewedItems = [];
    if (opener?.offsetParent) opener.focus();
});
dialog.addEventListener('keydown', event => {
    if (viewedItems[viewedIndex]?.src || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
});

window.addEventListener('nfg-bill-change', event => {
    const billId = event.detail.billId;
    for (const summary of document.querySelectorAll('[data-bill-id]')) {
        if (summary.dataset.billId === billId) summary.replaceWith(billSummary(billId));
    }
});

setMode('3d');
showExploreRoute();
