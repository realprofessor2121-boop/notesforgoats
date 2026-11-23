const views = [['food', 'Food & mood'], ['planting', 'Planting & growing'], ['wallet', 'NFG Wallet prep']];
const colorGroups = [
    { id: 'red', name: 'Red', color: '#ff747b', foods: 'Strawberries, red apple, red bell pepper, watermelon' },
    { id: 'orange', name: 'Orange', color: '#ffae65', foods: 'Orange, sweet potato, papaya, pumpkin' },
    { id: 'yellow', name: 'Yellow', color: '#f6d55f', foods: 'Banana, lemon, pineapple, mango' },
    { id: 'green', name: 'Green', color: '#86d58b', foods: 'Green apple, avocado, kiwi, spinach' },
    { id: 'blue-purple', name: 'Blue/Purple', color: '#b5a3ff', foods: 'Blueberries, figs, plums, eggplant' },
];
const moods = ['Very low', 'Low', 'Neutral', 'Good', 'Very good'];
const coins = [
    { id: 'register', name: 'Register' }, { id: 'create', name: 'Create' }, { id: 'distribute', name: 'Distribute' },
    { id: 'collect', name: 'Collect' }, { id: 'main', name: 'Main' },
];
const assetPath = 'assets/expansion/life/';
const session = new Map();
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });

function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function button(label, type = 'button') {
    const element = node('button', 'nfg-life-button', label);
    element.type = type;
    return element;
}

function link(label, href) {
    const element = node('a', 'nfg-life-link', label);
    element.href = href;
    return element;
}

function image(src, alt) {
    const element = node('img');
    element.src = src;
    element.alt = alt;
    element.loading = 'lazy';
    return element;
}

function card(title, description) {
    const element = node('article', 'nfg-life-card');
    element.append(node('h3', '', title));
    if (description) element.append(node('p', 'nfg-life-muted', description));
    return element;
}

function referenceGrid(items) {
    const gallery = node('div', 'nfg-life-references');
    for (const [file, title] of items) {
        const figure = node('figure');
        figure.append(image(`${assetPath}${file}.webp`, title), node('figcaption', '', title));
        gallery.append(figure);
    }
    return gallery;
}

function field(title, input) {
    const label = node('label', 'nfg-life-field');
    label.append(node('span', '', title), input);
    return label;
}

function input(type, options = {}) {
    return Object.assign(node('input'), { type, ...options });
}

function select(items) {
    const element = node('select');
    for (const [value, title] of items) element.append(Object.assign(node('option', '', title), { value }));
    return element;
}

function status() {
    const element = node('p', 'nfg-life-status');
    element.setAttribute('role', 'status');
    return element;
}

function today() {
    const date = new Date();
    return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(part => String(part).padStart(2, '0')).join('-');
}

function dateLabel(value) {
    const date = new Date(`${value}T00:00:00Z`);
    const element = node('time', '', Number.isFinite(date.getTime()) ? dateFormat.format(date) : value);
    element.dateTime = value;
    return element;
}

function read(kind) {
    if (session.has(kind)) return session.get(kind);
    try {
        const entries = JSON.parse(localStorage.getItem(`nfg-life-${kind}-v1`));
        return Array.isArray(entries) ? entries : [];
    } catch {
        return [];
    }
}

function save(kind, entries) {
    try {
        localStorage.setItem(`nfg-life-${kind}-v1`, JSON.stringify(entries));
        session.delete(kind);
        return true;
    } catch {
        session.set(kind, entries);
        return false;
    }
}

function showSaved(message, persistent) {
    message.textContent = persistent ? 'Saved in this browser.' : 'Saved for this visit only. Browser storage is unavailable.';
}

function foodPanel(container) {
    const exercise = card('Food color mood meter', 'Choose a group from the NFG food chart and log how you feel.');
    const moodForm = node('form', 'nfg-life-grid');
    const groupButtons = node('div', 'nfg-life-colors');
    groupButtons.setAttribute('aria-label', 'NFG food color groups');
    const examples = node('p', 'nfg-life-examples');
    const options = colorGroups.map(group => {
        const option = button(group.name);
        option.style.setProperty('--life-group', group.color);
        option.addEventListener('click', () => {
            selected = group;
            update();
        });
        groupButtons.append(option);
        return { option, group };
    });
    let selected = colorGroups[0];
    const mood = input('range', { min: 1, max: 5, step: 1, value: '3' });
    const meter = node('div', 'nfg-life-mood-meter');
    meter.setAttribute('aria-hidden', 'true');
    const position = node('span');
    meter.append(position);
    const moodLabel = node('output', 'nfg-life-mood-label');
    const when = input('date', { required: true, value: today() });
    const feedback = status();
    const history = card('Mood history');
    const rows = node('ul', 'nfg-life-rows');
    history.append(rows);
    const recent = () => {
        rows.replaceChildren();
        const entries = read('mood');
        if (!entries.length) rows.append(node('li', 'nfg-life-muted', 'No mood entries yet.'));
        for (const entry of entries.slice().reverse()) {
            const group = colorGroups.find(item => item.id === entry.group);
            if (!group || !moods[entry.rating - 1]) continue;
            const row = node('li');
            const badge = node('strong', '', group.name);
            badge.style.color = group.color;
            row.append(badge, node('span', '', moods[entry.rating - 1]), dateLabel(entry.date));
            rows.append(row);
        }
    };
    function update() {
        for (const { group, option } of options) option.setAttribute('aria-pressed', String(group === selected));
        examples.textContent = selected.foods;
        examples.style.color = selected.color;
        const rating = Number(mood.value);
        moodLabel.value = moods[rating - 1];
        mood.setAttribute('aria-valuetext', moods[rating - 1]);
        position.style.left = `${(rating - 1) * 25}%`;
        meter.style.setProperty('--life-group', selected.color);
    }
    mood.addEventListener('input', update);
    moodForm.append(field('My mood', mood), moodLabel, meter, field('Date', when), button('Save mood', 'submit'), feedback);
    moodForm.addEventListener('submit', event => {
        event.preventDefault();
        if (!when.value) return;
        const rating = Number(mood.value);
        const entries = [...read('mood'), { group: selected.id, rating, date: when.value }];
        showSaved(feedback, save('mood', entries));
        recent();
    });
    exercise.append(groupButtons, examples, moodForm, link('Open the Day 1 Food lesson photos ↗', '#explore/photos/1-5'));
    const food = card('NFG kitchen, salmon & food vending');
    food.append(referenceGrid([
        ['salmon-cooking', 'Salmon preparation in the NFG kitchen'],
        ['salmon-vegetables', 'Notes with the salmon and vegetables meal'],
        ['vending-kitchen', 'NFG kitchen layout with a vending unit'],
        ['vending-machines', 'Fresh-food vending machines from the reference archive'],
    ]));
    container.append(exercise, history, food);
    update();
    recent();
}

function plantingPanel(container) {
    const journal = card('Planting & growing', 'Record what you planted and when you watered it.');
    const form = node('form', 'nfg-life-inline');
    const plant = input('text', { required: true, placeholder: 'Plant or seed name' });
    const planted = input('date', { required: true, value: today() });
    const feedback = status();
    form.append(field('Plant', plant), field('Planting date', planted), button('Add plant', 'submit'));
    const collection = node('div', 'nfg-life-plants');
    journal.append(form, feedback, collection);
    const growing = card('NFG growing references');
    growing.append(referenceGrid([
        ['planting-harvest', 'Planting, watering and harvest'], ['seedling-to-crop', 'From seedlings to established plants'],
    ]), link('Generational Wealth lesson photos ↗', '#explore/photos/8-2'), link('Abundance lesson photos ↗', '#explore/photos/8-3'));
    container.append(journal, growing);

    function drawPlants() {
        collection.replaceChildren();
        const plants = read('plants');
        if (!plants.length) collection.append(node('p', 'nfg-life-muted', 'No plants logged yet.'));
        for (const item of plants.slice().reverse()) {
            const row = node('article', 'nfg-life-plant');
            const header = node('div', 'nfg-life-plant-head');
            const start = node('p', 'nfg-life-muted', 'Planted ');
            start.append(dateLabel(item.date));
            header.append(node('h4', '', item.name), start);
            const water = node('form', 'nfg-life-inline');
            const date = input('date', { required: true, min: item.date, value: today() < item.date ? item.date : today() });
            water.append(field('Watering date', date), button('Log watering', 'submit'));
            water.addEventListener('submit', event => {
                event.preventDefault();
                const records = read('plants');
                const latest = records.find(record => record.id === item.id);
                if (!latest || !date.value || date.value < latest.date) {
                    feedback.textContent = 'Choose a watering date on or after planting.';
                    return;
                }
                if (latest.watered.includes(date.value)) {
                    feedback.textContent = 'That watering date is already logged.';
                    return;
                }
                const next = records.map(record => record.id === latest.id
                    ? { ...record, watered: [...record.watered, date.value].sort() } : record);
                showSaved(feedback, save('plants', next));
                drawPlants();
            });
            const log = node('div', 'nfg-life-waterings');
            if (!item.watered.length) log.append(node('span', 'nfg-life-muted', 'No watering dates yet.'));
            else log.append(node('span', '', 'Watered'), ...item.watered.map(dateLabel));
            row.append(header, water, log);
            collection.append(row);
        }
    }
    form.addEventListener('submit', event => {
        event.preventDefault();
        const name = plant.value.trim();
        if (!name || !planted.value) {
            feedback.textContent = 'Enter a plant name and planting date.';
            return;
        }
        const entry = { id: crypto.randomUUID(), name, date: planted.value, watered: [] };
        showSaved(feedback, save('plants', [...read('plants'), entry]));
        plant.value = '';
        drawPlants();
    });
    drawPlants();
}

function walletPanel(container) {
    const wallet = card('NFG Wallet prep', 'Practice recording the original NFG coins in your browser.');
    const shelf = node('div', 'nfg-life-wallet');
    const entries = card('Practice coin entries');
    const list = node('ul', 'nfg-life-rows');
    entries.append(list);
    const form = node('form', 'nfg-life-inline');
    const selection = select(coins.map(coin => [coin.id, coin.name]));
    selection.value = 'register';
    const direction = select([['add', 'Add'], ['use', 'Use']]);
    direction.value = 'add';
    const amount = input('number', { required: true, min: 1, step: 1, inputMode: 'numeric' });
    const when = input('date', { required: true, value: today() });
    const feedback = status();
    const coinCards = coins.map(coin => {
        const coinButton = button(coin.name);
        const total = node('strong');
        coinButton.classList.add('nfg-life-coin');
        coinButton.replaceChildren(image(`${assetPath}coin-${coin.id}.webp`, ''), node('span', '', coin.name), total);
        coinButton.addEventListener('click', () => { selection.value = coin.id; refresh(); });
        shelf.append(coinButton);
        return { coin, coinButton, total };
    });

    function balance(rows, id) {
        return rows.reduce((count, row) => row.coin === id ? count + row.quantity : count, 0);
    }
    function refresh() {
        const rows = read('wallet');
        for (const { coin, coinButton, total } of coinCards) {
            total.textContent = String(balance(rows, coin.id));
            coinButton.setAttribute('aria-pressed', String(coin.id === selection.value));
        }
        list.replaceChildren();
        if (!rows.length) list.append(node('li', 'nfg-life-muted', 'No practice coin entries yet.'));
        for (const row of rows.slice().reverse()) {
            const coin = coins.find(item => item.id === row.coin);
            if (!coin) continue;
            const item = node('li');
            item.append(node('strong', '', coin.name), node('span', '', `${row.quantity > 0 ? '+' : '−'}${Math.abs(row.quantity)}`), dateLabel(row.date));
            list.append(item);
        }
    }
    selection.addEventListener('change', refresh);
    form.append(field('NFG coin', selection), field('Action', direction), field('Quantity', amount), field('Date', when), button('Record coin entry', 'submit'));
    form.addEventListener('submit', event => {
        event.preventDefault();
        const value = Number(amount.value);
        const quantity = value * (direction.value === 'use' ? -1 : 1);
        const coin = selection.value;
        const rows = read('wallet');
        const total = balance(rows, coin) + quantity;
        if (!Number.isSafeInteger(value) || value <= 0 || !when.value || !coins.some(item => item.id === coin)) {
            feedback.textContent = 'Choose an NFG coin, a whole quantity, and a date.';
            return;
        }
        if (!Number.isSafeInteger(total) || total < 0) {
            feedback.textContent = 'Enter a quantity within the available practice coin balance.';
            return;
        }
        showSaved(feedback, save('wallet', [...rows, { coin, quantity, date: when.value }]));
        amount.value = '';
        refresh();
    });
    wallet.append(shelf, form, feedback, link('Open Money In & Money Out ↗', '#dashboard/money'));
    container.append(wallet, entries);
    refresh();
}

export function mountLife(container) {
    const panels = { food: foodPanel, planting: plantingPanel, wallet: walletPanel };
    const root = node('div', 'nfg-life');
    const tabs = node('div', 'nfg-life-tabs');
    tabs.setAttribute('aria-label', 'Food, planting and Wallet sections');
    const body = node('div', 'nfg-life-panels');
    const buttons = views.map(([id, title]) => {
        const tab = button(title);
        tab.addEventListener('click', () => { location.hash = `life/${id}`; });
        tabs.append(tab);
        return { id, tab };
    });
    let active;
    function render() {
        const [page, view] = location.hash.slice(1).split('/');
        if (page !== 'life') return;
        const next = Object.hasOwn(panels, view) ? view : 'food';
        if (next === active) return;
        active = next;
        for (const { id, tab } of buttons) tab.setAttribute('aria-pressed', String(id === next));
        body.replaceChildren();
        panels[next](body);
    }
    root.append(tabs, body);
    container.replaceChildren(root);
    window.addEventListener('hashchange', render);
    render();
    return { destroy() { window.removeEventListener('hashchange', render); root.remove(); } };
}
