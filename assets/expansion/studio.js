const assets = 'assets/studio/';
const areas = [
    ['coins', 'NFG Coins'], ['instruments', 'Piano & pads'], ['layout', 'Studio layout'],
    ['mixing', 'Mixing & supplies'], ['exposure', 'Exposure triangle'],
];

const gear = [
    ['studio-recording-desk', 'Desk', 'Set up the controller, interface and controls within reach.'],
    ['studio-audio-interface', 'Audio interface', 'Connect microphones and instruments to the recording computer.'],
    ['studio-midi-keyboard', 'MIDI keyboard', 'Play notes into a software instrument or drum rack.'],
    ['studio-monitor-speaker-1', 'Monitor speaker', 'Listen for balance and placement from your working position.'],
    ['studio-microphone', 'Microphone', 'Capture the performance before adjusting the mix.'],
    ['studio-headphones', 'Headphones', 'Monitor a take while reducing speaker bleed into the microphone.'],
];

const plugins = [
    {
        name: 'Waves PAZ Analyzer', href: 'https://www.waves.com/plugins/paz-analyzer',
        use: 'Check frequency balance, stereo position and levels.', image: `${assets}waves-paz.webp`,
        alt: 'Waves PAZ Analyzer from the NFG archive', reference: true,
    },
    {
        name: 'ValhallaVintageVerb', href: 'https://valhalladsp.com/shop/reverb/valhalla-vintage-verb/',
        use: 'Adjust decay, pre-delay and wet/dry balance to place a sound in a space.', image: `${assets}valhalla-vintageverb.webp`,
        alt: 'ValhallaVintageVerb from the NFG archive', reference: true,
    },
    {
        name: 'Sonarworks SoundID Reference', href: 'https://www.sonarworks.com/soundid-reference',
        use: 'Calibrate the headphones or monitors you listen through while mixing.',
        image: `${assets}soundid-reference.webp`, reference: true,
    },
    {
        name: 'Logic Pro Compressor', href: 'https://support.apple.com/guide/logicpro/welcome/mac',
        use: 'Set the threshold, ratio and timing for controlling changes in level.',
        image: `${assets}logic-compressor.webp`, reference: true,
    },
    {
        name: 'Focusrite FAST Compressor', href: 'https://support.focusrite.com/hc/en-gb/search?query=FAST%20Compressor',
        use: 'Control dynamics with compression. The lesson shows the archived FAST interface.',
        image: `${assets}focusrite-fast-compressor.webp`, reference: true,
    },
    {
        name: 'Waves CLA-2A', href: 'https://www.waves.com/plugins/cla-2a-compressor-limiter',
        use: 'Use optical-style leveling to smooth levels on sources such as vocals and bass.',
        image: `${assets}waves-cla-2a.webp`, reference: true,
    },
    {
        name: 'Logic Pro ChromaVerb', href: 'https://support.apple.com/guide/logicpro/welcome/mac',
        use: 'Shape a room sound with reverb decay, damping and modulation.',
        image: `${assets}logic-chromaverb.webp`, reference: true,
    },
    {
        name: 'FabFilter Pro-Q 3', href: 'https://www.fabfilter.com/products/',
        use: 'Carve or boost frequencies and use dynamic bands where the mix needs them. See the vendor for current versions.',
        image: `${assets}fabfilter-pro-q3.webp`, reference: true,
    },
    {
        name: 'FabFilter Pro-C 2', href: 'https://www.fabfilter.com/products/',
        use: 'Shape peaks and sustain with the compressor’s timing and detection controls. See the vendor for current versions.',
        image: `${assets}fabfilter-pro-c2.webp`, reference: true,
    },
    {
        name: 'Synchro Arts VocAlign Ultra', href: 'https://www.synchroarts.com/vocalign',
        use: 'Align a doubled or background vocal to the timing of a guide take.',
        image: `${assets}vocalign-ultra.webp`, reference: true,
    },
    {
        name: 'Antares Auto-Tune Pro', href: 'https://www.antarestech.com/products/pitch-correction/pro',
        use: 'Correct or stylize vocal pitch within a selected key and scale.',
        image: `${assets}autotune-pro.webp`, reference: true,
    },
    {
        name: 'oeksound soothe2', href: 'https://oeksound.com/plugins/soothe2/',
        use: 'Reduce resonances dynamically when they become prominent.',
        image: `${assets}soothe2.webp`, reference: true,
    },
];

const shops = [
    { name: 'Sweetwater', use: 'Audio interfaces, keyboards and recording gear', href: 'https://www.sweetwater.com/', image: `${assets}sweetwater.svg` },
    { name: 'Guitar Center', use: 'Instruments and studio equipment', href: 'https://www.guitarcenter.com/', image: `${assets}guitar-center.svg` },
    { name: 'B&H Photo', use: 'Cameras, lighting, stands and production supplies', href: 'https://www.bhphotovideo.com/', image: `${assets}bh-photo.svg` },
];

function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function button(label) {
    const element = node('button', 'nfg-studio-button', label);
    element.type = 'button';
    return element;
}

function link(text, href) {
    const element = node('a', 'nfg-studio-link', text);
    element.href = href;
    if (/^https:\/\//.test(href)) {
        element.target = '_blank';
        element.rel = 'noopener noreferrer';
    }
    return element;
}

function image(src, alt) {
    const element = node('img');
    element.src = src;
    element.alt = alt;
    element.loading = 'lazy';
    return element;
}

function heading(title, text) {
    const element = node('div', 'nfg-studio-heading');
    element.append(node('h3', '', title));
    if (text) element.append(node('p', '', text));
    return element;
}

function figure(src, caption) {
    const element = node('figure', 'nfg-studio-figure');
    element.append(image(src, ''), node('figcaption', '', caption));
    return element;
}

function card(title, text) {
    const element = node('article', 'nfg-studio-card');
    element.append(heading(title, text));
    return element;
}

function model({ src, poster, title, orbit = '28deg 70deg auto' }) {
    const element = node('model-viewer', 'nfg-studio-model');
    element.setAttribute('src', src);
    element.setAttribute('poster', poster);
    element.setAttribute('alt', `Interactive 360° model of ${title}`);
    element.setAttribute('camera-controls', '');
    element.setAttribute('camera-orbit', orbit);
    element.setAttribute('touch-action', 'pan-y');
    element.setAttribute('shadow-intensity', '.75');
    element.setAttribute('interaction-prompt', 'none');
    const controls = node('div', 'nfg-studio-model-controls');
    const spin = button('Auto-rotate');
    spin.setAttribute('aria-pressed', 'false');
    spin.addEventListener('click', () => {
        const enabled = spin.getAttribute('aria-pressed') !== 'true';
        element.toggleAttribute('auto-rotate', enabled);
        spin.setAttribute('aria-pressed', String(enabled));
    });
    const reset = button('Reset view');
    reset.addEventListener('click', () => {
        element.removeAttribute('auto-rotate');
        spin.setAttribute('aria-pressed', 'false');
        element.setAttribute('camera-orbit', orbit);
        element.setAttribute('field-of-view', 'auto');
        element.jumpCameraToGoal?.();
        element.resetTurntableRotation?.();
    });
    controls.append(spin, reset);
    const viewer = node('div');
    const tip = node('p', 'nfg-studio-small', 'Drag to rotate. Pinch or scroll to zoom.');
    element.addEventListener('error', () => {
        element.replaceWith(image(poster, title));
        controls.hidden = true;
        tip.textContent = 'The 3D preview could not open.';
    });
    viewer.append(element, controls, tip);
    return viewer;
}

function coinsPanel(container) {
    const coins = card('NFG GOAT Coins', 'Explore the original NFG main coin and the Register, Create, Distribute and Collect designs.');
    const references = node('div', 'nfg-studio-coin-art');
    references.append(figure(`${assets}nfg-main-coin.png`, 'Original NFG main coin design'));
    const strip = image(`${assets}nfg-goat-coins.gif`, 'Five original NFG coins labeled Register, Create, Distribute, Collect and Main');
    strip.className = 'nfg-studio-coins';
    references.append(strip);
    coins.append(references, link('Open NFG Money Talk Coins ↗', 'https://money-talk-coins.mrdeyomusic.chatgpt.site/'));
    container.append(coins);
}

const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const noteName = note => `${names[note % 12]}${Math.floor(note / 12) - 1}`;
const frequency = note => 440 * 2 ** ((note - 69) / 12);
let intervalContext;
let intervalVoices = [];

function intervalTrainer() {
    const trainer = card('Half steps & whole steps', 'Adjacent piano keys are one semitone apart. A whole step spans two semitones.');
    const note = node('select');
    for (let midi = 60; midi <= 83; midi++) {
        const option = node('option', '', noteName(midi));
        option.value = String(midi);
        note.append(option);
    }
    note.value = '60';
    const label = node('label', 'nfg-studio-field');
    label.append(node('span', '', 'Starting note'), note);
    const actions = node('div', 'nfg-studio-model-controls');
    const output = node('p', 'nfg-studio-interval-output', 'C4 → C♯4 · 1 semitone');
    output.setAttribute('aria-live', 'polite');
    async function listen(steps) {
        const start = Number(note.value);
        const end = start + steps;
        output.textContent = `${noteName(start)} → ${noteName(end)} · ${steps} ${steps === 1 ? 'semitone' : 'semitones'}`;
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) {
            output.append(' · This browser does not support playback.');
            return;
        }
        try {
            const context = intervalContext ||= new Audio();
            await context.resume();
            for (const oscillator of intervalVoices) oscillator.stop();
            intervalVoices = [];
            const startAt = context.currentTime + .02;
            [start, end].forEach((midi, index) => {
                const oscillator = context.createOscillator();
                const envelope = context.createGain();
                const time = startAt + index * .48;
                oscillator.type = 'triangle';
                oscillator.frequency.value = frequency(midi);
                envelope.gain.setValueAtTime(.001, time);
                envelope.gain.exponentialRampToValueAtTime(.15, time + .016);
                envelope.gain.exponentialRampToValueAtTime(.001, time + .57);
                oscillator.connect(envelope);
                envelope.connect(context.destination);
                oscillator.start(time);
                oscillator.stop(time + .59);
                oscillator.addEventListener('ended', () => {
                    oscillator.disconnect();
                    envelope.disconnect();
                    intervalVoices = intervalVoices.filter(voice => voice !== oscillator);
                });
                intervalVoices.push(oscillator);
            });
        } catch {
            output.append(' · Audio is unavailable.');
        }
    }

    const half = button('Play half step');
    half.addEventListener('click', () => listen(1));
    const whole = button('Play whole step');
    whole.addEventListener('click', () => listen(2));
    actions.append(half, whole);
    trainer.append(label, actions, output, node('p', 'nfg-studio-small', 'E to F and B to C are half steps with no black key in between.'));
    return trainer;
}

function instrumentsPanel(container) {
    const top = node('div', 'nfg-studio-grid');
    const keyboard = card('Assembled NFG piano', 'Rotate the original 49-key Blender model to inspect the keys, pads and controls.');
    keyboard.append(model({
        src: 'assets/expansion/studio/piano-native.glb', poster: 'assets/expansion/studio/piano-native.webp',
        title: 'Assembled NFG piano', orbit: '28deg 62deg auto',
    }), link('Explore the NFG studio MIDI controller ↗', '#explore/model/studio-midi-keyboard'));
    top.append(keyboard, intervalTrainer());
    const lab = card('Playable piano & drum pads', 'Enable sound in the original NFG Sound Lab, then play the colored pads or the 88-key piano.');
    const frame = node('iframe', 'nfg-studio-frame');
    frame.src = `${assets}instruments.html`;
    frame.title = 'Original interactive Notes For Goats Instruments and Mixing Sound Lab';
    frame.loading = 'lazy';
    const fullscreen = link('Open the Sound Lab in its own tab ↗', `${assets}instruments.html`);
    fullscreen.target = '_blank';
    fullscreen.rel = 'noopener noreferrer';
    lab.append(fullscreen, frame);
    container.append(top, lab);
    const scales = card('NFG scale diagrams');
    const scaleArt = node('div', 'nfg-studio-grid nfg-studio-visual-pair');
    scaleArt.append(figure(`${assets}piano-c-major.webp`, 'C major'), figure(`${assets}piano-c-minor.webp`, 'C minor'));
    scales.append(scaleArt);
    container.append(scales);
}

function layoutPanel(container) {
    const top = node('div', 'nfg-studio-grid');
    const layout = card('NFG studio layout', 'See the original Green Day production-room lesson art and the NFG studio model.');
    const art = image(`${assets}studio-green-layout.webp`, 'Original green NFG model of the production room with desks and equipment');
    art.className = 'nfg-studio-layout-image';
    layout.append(art, link('Explore the studio room in 360° ↗', '#explore/model/room-4'), link('Open the production lesson photos ↗', '#explore/photos/4-1'));
    const inventory = card('Recording equipment', 'Open the existing 3D studio assets as you plan each part of the room.');
    const list = node('ul', 'nfg-studio-gear');
    for (const [id, title, use] of gear) {
        const row = node('li');
        row.append(link(title, `#explore/model/${id}`), node('p', '', use));
        list.append(row);
    }
    inventory.append(list);
    top.append(layout, inventory);
    container.append(top);
    const references = card('Room plans from the NFG archive');
    const pictures = node('div', 'nfg-studio-grid nfg-studio-layout-refs');
    pictures.append(figure(`${assets}studio-control-room.webp`, 'Room control and listening position'),
        figure(`${assets}studio-plan-top.webp`, 'Top view with furniture placement'),
        figure(`${assets}studio-plan-colored.webp`, 'Original colored studio floor plan'),
        figure(`${assets}studio-acoustic-plan.webp`, 'Acoustic treatment plan'));
    references.append(pictures);
    container.append(references);
}

function linkCard(item) {
    const itemCard = node('li', 'nfg-studio-resource');
    if (item.image) {
        const art = image(item.image, item.alt || (item.reference ? `${item.name} interface from the NFG archive` : `${item.name} logo`));
        art.className = item.reference ? 'nfg-studio-plugin-image' : 'nfg-studio-vendor-logo';
        itemCard.append(art);
    }
    const body = node('div');
    body.append(link(`${item.name} ↗`, item.href), node('p', '', item.use));
    itemCard.append(body);
    return itemCard;
}

function mixingPanel(container) {
    const top = node('div', 'nfg-studio-grid');
    const tools = card('Mixing plugins', 'Follow the official product links for current versions and purchase information.');
    const toolList = node('ul', 'nfg-studio-resources');
    toolList.append(...plugins.map(linkCard));
    tools.append(toolList, link('Practice on the NFG Sound Lab ↗', '#studio/instruments'));
    const purchasing = card('Studio equipment & supplies', 'Open manufacturer and retailer pages, and compare the inputs, dimensions and compatibility.');
    const storeList = node('ul', 'nfg-studio-resources');
    storeList.append(...shops.map(linkCard));
    purchasing.append(storeList);
    top.append(tools, purchasing);
    container.append(top);
}

const exposureOptions = [
    { label: 'Aperture', values: ['f/1.4', 'f/2', 'f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/11', 'f/16'], ref: 5, effect: -1, help: 'A lower f-number admits more light and makes the depth of field shallower.' },
    { label: 'Shutter speed', values: ['1/1000 s', '1/500 s', '1/250 s', '1/125 s', '1/60 s', '1/30 s', '1/15 s', '1/8 s'], ref: 3, effect: 1, help: 'A longer exposure admits more light and can increase motion blur.' },
    { label: 'ISO', values: ['100', '200', '400', '800', '1600', '3200', '6400'], ref: 0, effect: 1, help: 'A higher ISO brightens the result and can make noise more visible.' },
];

function exposurePanel(container) {
    const lesson = card('The exposure triangle', 'Swipe a control or use the arrow keys. Compare how aperture, shutter speed and ISO change the meter.');
    const body = node('div', 'nfg-studio-grid');
    const stage = node('div', 'nfg-exposure-stage');
    const frame = node('div', 'nfg-exposure-frame');
    const photo = image('lightscamera.webp', 'Notes from the NFG Lights, Camera lesson');
    const readout = node('span', 'nfg-exposure-frame-label', 'NFG exposure preview');
    frame.append(photo, readout);
    const scale = node('div', 'nfg-exposure-scale');
    for (const label of ['−3', '−2', '−1', '0', '+1', '+2', '+3']) scale.append(node('span', '', label));
    const meter = node('div', 'nfg-exposure-meter');
    const indicator = node('span');
    meter.append(indicator);
    meter.setAttribute('aria-hidden', 'true');
    const reading = node('p', 'nfg-exposure-reading');
    reading.setAttribute('role', 'status');
    stage.append(frame, meter, scale, reading);
    const controls = node('div', 'nfg-exposure-controls');
    const sliders = exposureOptions.map(option => {
        const row = node('label', 'nfg-studio-slider');
        const names = node('span', 'nfg-studio-slider-label');
        const output = node('output');
        names.append(node('span', '', option.label), output);
        const input = node('input');
        input.type = 'range';
        input.min = '0';
        input.max = String(option.values.length - 1);
        input.step = '1';
        input.value = String(option.ref);
        input.addEventListener('input', update);
        row.append(names, input, node('span', 'nfg-studio-small', option.help));
        controls.append(row);
        return { option, output, input };
    });

    function update() {
        let stops = 0;
        for (const { option, input, output } of sliders) {
            const value = option.values[Number(input.value)];
            output.value = value;
            input.setAttribute('aria-valuetext', value);
            stops += (Number(input.value) - option.ref) * option.effect;
        }
        const position = 50 + Math.max(-3, Math.min(3, stops)) * 100 / 6;
        indicator.style.left = `${position}%`;
        photo.style.filter = `brightness(${2 ** (Math.max(-4, Math.min(4, stops)) * .40)})`;
        const exposure = stops === 0 ? 'At reference exposure' : stops > 0 ? 'Brighter than reference' : 'Darker than reference';
        reading.textContent = `${stops > 0 ? '+' : stops < 0 ? '−' : ''}${Math.abs(stops)} EV · ${exposure}`;
    }

    const reset = button('Reset to reference');
    reset.addEventListener('click', () => {
        for (const { option, input } of sliders) input.value = String(option.ref);
        update();
    });
    controls.append(reset, node('p', 'nfg-studio-small', 'The reference uses f/8, 1/125 s and ISO 100. Doubling exposure adds one stop.'));
    body.append(stage, controls);
    lesson.append(body);
    container.append(lesson);
    const archive = card('NFG exposure triangle diagram');
    archive.append(figure(`${assets}exposure-triangle.webp`, 'Original Notes For Goats exposure triangle from the course archive'));
    container.append(archive);
    update();
}

export function mountStudio(container) {
    const views = { coins: coinsPanel, instruments: instrumentsPanel, layout: layoutPanel, mixing: mixingPanel, exposure: exposurePanel };
    const root = node('div', 'nfg-studio');
    const tabs = node('div', 'nfg-studio-tabs');
    tabs.setAttribute('aria-label', 'Studio sections');
    const panel = node('div', 'nfg-studio-panel');
    const buttons = new Map();
    let active;
    for (const [id, title] of areas) {
        const tab = button(title);
        tab.addEventListener('click', () => { location.hash = `studio/${id}`; });
        buttons.set(id, tab);
        tabs.append(tab);
    }
    function change() {
        const [page, section] = location.hash.slice(1).split('/');
        if (page !== 'studio') {
            active = undefined;
            panel.replaceChildren();
            return;
        }
        const key = Object.hasOwn(views, section) ? section : 'instruments';
        if (key === active) return;
        active = key;
        for (const [id, tab] of buttons) tab.setAttribute('aria-pressed', String(id === key));
        panel.replaceChildren();
        views[key](panel);
    }
    root.append(tabs, panel);
    container.replaceChildren(root);
    window.addEventListener('hashchange', change);
    change();
    return { destroy() { window.removeEventListener('hashchange', change); root.remove(); } };
}
