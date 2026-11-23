import { days } from '../explore/lessons.js';

const root = 'assets/expansion/references/';
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const amount = value => usd.format(value / 100);
const currentYear = new Date().getFullYear();
const ledgerKey = 'nfg-financial-ledger-v1';
const timelineKey = 'nfg-timeline-v1';
const salesKey = 'nfg-sales-counts-v1';
const number = new Intl.NumberFormat('en-US');
const yearStart = [2012, 2016, 2020, 2024, 2026];
const sectionNames = { overview: 'Overview', money: 'Money & tax', maps: 'Heat maps', markets: 'Market lab', timeline: 'Timeline', graduation: 'You Did It!', gatekeepers: 'Gatekeepers' };
const empty = { maps: [], market: {}, publicData: {} };
const readData = file => fetch(root + file).then(response => response.ok ? response.json() : null).catch(() => null);
const saved = (key, fallback) => {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value ?? fallback;
    } catch {
        return fallback;
    }
};
function save(key, value, status) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        if (status) status.textContent = 'Browser storage is unavailable. These entries will last for this visit.';
        return false;
    }
}

function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}

function field(label, control) {
    const wrapper = el('label', undefined, 'nfg-dash-field');
    wrapper.append(el('span', label), control);
    return wrapper;
}

function input(type, key) {
    const control = el('input');
    control.type = type;
    control.name = key;
    return control;
}

function select(options, name) {
    const control = el('select');
    control.name = name;
    for (const [value, title] of options) control.add(new Option(title, value));
    return control;
}

function button(text, type = 'button') {
    const control = el('button', text, 'x-download-link');
    control.type = type;
    return control;
}

function link(text, href) {
    const anchor = el('a', text, 'nfg-dash-link');
    anchor.href = href;
    if (href.startsWith('https:')) {
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
    }
    return anchor;
}

function panel(title, subtitle) {
    const content = el('section', undefined, 'nfg-dash-panel');
    content.append(el('h3', title));
    if (subtitle) content.append(el('p', subtitle));
    return content;
}

function localDate(value = new Date()) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function validDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(date + 'T00:00:00Z');
    return Number.isFinite(+parsed) && parsed.toISOString().startsWith(date);
}

function toCents(raw) {
    const text = String(raw).trim().replace(/^\$/, '').replace(/,/g, '');
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
    const value = Math.round(Number(text) * 100);
    return Number.isSafeInteger(value) && value <= 1e12 ? value : null;
}

function download(name, content) {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const anchor = el('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvField(value) {
    const text = String(value);
    const escaped = /^[=+@\-\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text) ? "'" + text : text;
    return '"' + escaped.replaceAll('"', '""') + '"';
}

export function yearTotals(entries, year, entity) {
    let incoming = 0, outgoing = 0, taxReview = 0;
    for (const entry of entries) {
        if (entry.entity !== entity || !entry.date.startsWith(String(year) + '-')) continue;
        if (entry.direction === 'in') incoming += entry.cents;
        else {
            outgoing += entry.cents;
            if (entry.review) taxReview += entry.cents;
        }
    }
    return { incoming, outgoing, taxReview, net: incoming - outgoing };
}

function moneyPanels(entries, year, entity) {
    const totals = yearTotals(entries, year, entity);
    const row = el('div', undefined, 'nfg-dash-money');
    for (const [title, value, className] of [
        ['Money out', totals.outgoing, 'is-out'], ['Money in', totals.incoming, 'is-in'],
    ]) {
        const metric = el('div', undefined, 'nfg-dash-money-side ' + className);
        metric.append(el('span', title), el('strong', amount(value)));
        row.append(metric);
    }
    return row;
}

function overview(data) {
    const content = el('div', undefined, 'nfg-dash-stack');
    const cash = panel('Cash flow', 'Business entries for ' + currentYear);
    cash.append(moneyPanels(saved(ledgerKey, []), currentYear, 'business'), link('Open money & tax', '#dashboard/money'));
    const course = panel('Course timeline');
    const cards = el('div', undefined, 'nfg-dash-course');
    for (const day of days) {
        const action = link(`Day ${day.day} · ${day.title}`, '#day-' + day.day);
        action.style.setProperty('--day-color', day.color || '#efc865');
        cards.append(action);
    }
    course.append(cards, link('Edit your timeline', '#dashboard/timeline'));
    const device = panel('Current device');
    const small = matchMedia('(max-width: 760px)').matches;
    const touch = navigator.maxTouchPoints > 0;
    const type = navigator.userAgentData?.mobile || (touch && small) ? 'Mobile' : touch ? 'Touch-enabled computer or tablet' : 'Desktop or laptop';
    device.append(el('p', type + ' · ' + window.innerWidth + 'px viewport'),
        el('p', 'This is the current session. Device totals need an analytics export.'));
    content.append(cash, course, device);
    const reference = data.courseReferences.find(entry => /dashboard/i.test(entry.title));
    if (reference) {
        const prior = panel('Original NFG dashboard', reference.description);
        const image = el('img', undefined, 'nfg-dash-original');
        image.src = reference.src;
        image.alt = reference.title;
        image.loading = 'lazy';
        prior.append(image);
        content.append(prior);
    }
    const publicData = data.publicData;
    const netWorth = publicData.wealth || publicData.netWorth || publicData.householdNetWorth;
    if (netWorth?.rows?.length) {
        const wealth = panel('U.S. family median net worth', netWorth.label || netWorth.description);
        const bars = el('div', undefined, 'nfg-dash-bars');
        const maximum = Math.max(...netWorth.rows.map(row => row.value));
        for (const row of netWorth.rows) {
            const bar = el('div', undefined, 'nfg-dash-bar');
            const fill = el('i');
            fill.style.width = Math.max(3, 100 * row.value / maximum) + '%';
            bar.append(el('span', row.label || row.name), el('strong', usd.format(row.value)), fill);
            bars.append(bar);
        }
        wealth.append(bars);
        if (netWorth.url) wealth.append(link('Federal Reserve survey ↗', netWorth.url));
        content.append(wealth);
    }
    const ranks = publicData.billionaires;
    if (ranks?.rows?.length) {
        const wealthy = panel('Ten largest fortunes', ranks.label || ranks.description);
        const list = el('ol', undefined, 'nfg-dash-rank');
        for (const row of ranks.rows) {
            const item = el('li');
            item.append(el('span', row.name), el('strong', '$' + number.format(row.value) + 'B'));
            list.append(item);
        }
        wealthy.append(list);
        if (ranks.url) wealthy.append(link('Forbes annual list ↗', ranks.url));
        content.append(wealthy);
    }
    const marketsList = publicData.recordedMusicMarkets;
    if (marketsList?.rows?.length) {
        const worldwide = panel('Top 10 recorded-music markets', `IFPI industry revenue ranking, ${marketsList.year}`);
        const list = el('ol', undefined, 'nfg-dash-rank');
        for (const entry of marketsList.rows) list.append(el('li', entry.market));
        worldwide.append(list, link('IFPI Global Music Report ↗', marketsList.url));
        content.append(worldwide);
    }
    const rankedSales = data.ownerSales;
    if (rankedSales?.territories?.length) {
        const salesOriginal = panel('Top 10 NFG TuneCore territories', `Reported earnings rank · ${rankedSales.period.start} to ${rankedSales.period.end}`);
        const list = el('ol', undefined, 'nfg-dash-rank');
        for (const territory of rankedSales.territories.slice(0, 10)) list.append(el('li', territory.market));
        salesOriginal.append(list, el('p', rankedSales.description));
        content.append(salesOriginal);
    }
    const sales = panel('Top 10 sales locations from your data', 'Import your own location results with place and count columns.');
    const source = input('file', 'sales');
    source.accept = '.csv,text/csv';
    let locations = saved(salesKey, []);
    const ranking = el('ol', undefined, 'nfg-dash-rank');
    const status = el('p');
    status.setAttribute('role', 'status');
    function drawSales() {
        ranking.replaceChildren(...locations.slice(0, 10).map(row => {
            const item = el('li');
            item.append(el('span', row.name), el('strong', number.format(row.count)));
            return item;
        }));
        if (!locations.length) ranking.append(el('li', 'No sales locations imported.'));
    }
    source.addEventListener('change', async () => {
        const file = source.files?.[0];
        if (!file) return;
        try {
            if (file.size > 1e6) throw new Error();
            const rows = (await file.text()).replace(/^\uFEFF/, '').trim().split(/\r?\n/);
            if (!/^\s*"?place"?\s*,\s*"?count"?$/i.test(rows.shift() || '')) throw new Error();
            const totals = new Map();
            for (const line of rows) {
                const match = line.match(/^\s*(?:"((?:[^"]|"")*)"|([^,]+))\s*,\s*(\d+)\s*$/);
                if (!match) throw new Error();
                const name = (match[1]?.replaceAll('""', '"') ?? match[2]).trim().slice(0, 100);
                const count = Number(match[3]);
                if (!name || !Number.isSafeInteger(count)) throw new Error();
                totals.set(name, (totals.get(name) || 0) + count);
            }
            locations = [...totals].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
            status.textContent = `Loaded ${locations.length} locations.`;
            save(salesKey, locations, status);
            drawSales();
        } catch {
            status.textContent = 'Use a CSV with place,count on the first line and one location per row.';
        } finally {
            source.value = '';
        }
    });
    drawSales();
    sales.append(field('Sales data', source), status, ranking);
    content.append(sales);
    return content;
}

function moneyTab() {
    const layout = el('div', undefined, 'nfg-dash-stack');
    const annual = panel('Annual P&L and tax review', 'Build a yearly worksheet for personal or business records.');
    const year = input('number', 'year');
    year.min = '1900';
    year.max = String(currentYear + 1);
    year.value = String(currentYear);
    const entity = select([['business', 'Business'], ['personal', 'Personal']], 'entity');
    const filters = el('div', undefined, 'nfg-dash-controls');
    filters.append(field('Year', year), field('Records', entity));
    const totals = el('div');
    const register = el('div', undefined, 'nfg-dash-register');
    const ledger = saved(ledgerKey, []);
    const status = el('p');
    status.setAttribute('role', 'status');
    const exportData = button('Export annual P&L');
    annual.append(filters, totals, register, exportData, status, link('IRS Schedule C ↗', 'https://www.irs.gov/forms-pubs/about-schedule-c-form-1040'),
        link('IRS individual income tax return ↗', 'https://www.irs.gov/forms-pubs/about-form-1040'));
    const entries = panel('Add a transaction', 'Mark expenses for review with your tax preparer.');
    const form = el('form', undefined, 'nfg-dash-controls');
    const date = input('date', 'date');
    date.value = localDate();
    const direction = select([['in', 'Money in'], ['out', 'Money out']], 'direction');
    const category = input('text', 'category');
    category.maxLength = 75;
    const cash = input('number', 'amount');
    cash.min = '0.01';
    cash.step = '.01';
    const review = input('checkbox', 'review');
    review.disabled = true;
    const add = button('Add transaction', 'submit');
    date.required = category.required = cash.required = true;
    form.append(field('Date', date), field('Direction', direction), field('Category', category),
        field('Amount (USD)', cash), field('Review for deduction', review), add);
    entries.append(form);
    layout.append(annual, entries);

    function matching() {
        return ledger.filter(entry => entry.entity === entity.value && entry.date.startsWith(year.value + '-'));
    }
    function draw() {
        const result = yearTotals(ledger, year.value, entity.value);
        const tax = el('div', undefined, 'nfg-dash-controls');
        tax.append(el('strong', `Net activity ${amount(result.net)}`),
            el('span', `Expenses marked for tax review ${amount(result.taxReview)}`));
        totals.replaceChildren(moneyPanels(ledger, year.value, entity.value), tax);
        const details = el('details');
        details.open = register.querySelector('details')?.open || false;
        const rows = matching().sort((a, b) => b.date.localeCompare(a.date));
        details.append(el('summary', `Transactions (${rows.length})`));
        for (const entry of rows) {
            const item = el('div', undefined, 'nfg-dash-record');
            const remove = button('Remove');
            item.append(el('span', `${entry.date} · ${entry.category} · ${entry.direction === 'out' ? '−' : ''}${amount(entry.cents)}`), remove);
            remove.addEventListener('click', () => {
                const index = ledger.indexOf(entry);
                ledger.splice(index, 1);
                save(ledgerKey, ledger, status);
                draw();
                const undo = button('Undo removal');
                status.replaceChildren(undo);
                undo.addEventListener('click', () => {
                    ledger.splice(index, 0, entry);
                    status.textContent = 'Transaction restored.';
                    save(ledgerKey, ledger, status);
                    draw();
                }, { once: true });
            });
            details.append(item);
        }
        register.replaceChildren(details);
    }
    for (const control of [year, entity]) control.addEventListener('change', draw);
    direction.addEventListener('change', () => {
        review.disabled = direction.value === 'in';
        if (review.disabled) review.checked = false;
    });
    form.addEventListener('submit', event => {
        event.preventDefault();
        const value = toCents(cash.value);
        if (!value || !validDate(date.value) || !category.value.trim()) return;
        ledger.push({ entity: entity.value, date: date.value, category: category.value.trim(),
            cents: value, direction: direction.value, review: review.checked });
        year.value = date.value.slice(0, 4);
        category.value = cash.value = '';
        review.checked = false;
        status.textContent = 'Transaction saved.';
        save(ledgerKey, ledger, status);
        draw();
    });
    exportData.addEventListener('click', () => {
        const header = 'date,entity,direction,category,amount,review_for_deduction';
        const rows = matching().map(entry => [entry.date, entry.entity, entry.direction, entry.category,
            (entry.cents / 100).toFixed(2), entry.review ? 'yes' : 'no'].map(csvField).join(','));
        download(`nfg-${entity.value}-${year.value}-pl.csv`, [header, ...rows].join('\r\n'));
    });
    draw();
    layout.append(flipAndRisk());
    return layout;
}

function flipAndRisk() {
    const container = el('div', undefined, 'nfg-dash-grid');
    const flip = panel('Flip calculator');
    const controls = el('div', undefined, 'nfg-dash-controls');
    const costs = ['Purchase price', 'Repairs', 'Holding costs', 'Selling fees', 'Estimated selling price'].map(name => {
        const control = input('number', name);
        control.min = '0';
        control.step = '.01';
        controls.append(field(name, control));
        return control;
    });
    const total = el('output', 'Enter costs and a sale price.');
    const recalc = () => {
        if (!costs[4].value) {
            total.textContent = 'Enter costs and a sale price.';
            return;
        }
        const values = costs.map(control => toCents(control.value) ?? 0);
        total.textContent = 'Estimated result before tax ' + amount(values.at(-1) - values.slice(0, 4).reduce((a, b) => a + b, 0));
    };
    for (const control of costs) control.addEventListener('input', recalc);
    flip.append(controls, total);
    const risk = panel('Risk scenario', 'Compare likelihood with the size of a possible loss.');
    const probability = input('range', 'likelihood');
    probability.min = '0';
    probability.max = '100';
    probability.value = '25';
    const impact = input('number', 'loss');
    impact.min = '0';
    impact.step = '.01';
    const result = el('output');
    const update = () => {
        result.textContent = `${probability.value}% likelihood · Probability-weighted loss ${amount((toCents(impact.value) || 0) * Number(probability.value) / 100)}`;
    };
    probability.addEventListener('input', update);
    impact.addEventListener('input', update);
    update();
    risk.append(field('Likelihood (%)', probability), field('Possible loss (USD)', impact), result);
    const leverage = panel('Investor leverage', 'Compare your own capital with money raised for the same project.');
    const own = input('number', 'own-capital'), other = input('number', 'outside-capital');
    own.min = other.min = '0';
    own.step = other.step = '.01';
    const share = el('output', 'Enter capital contributions.');
    const show = () => {
        const first = toCents(own.value) || 0;
        const second = toCents(other.value) || 0;
        share.textContent = first + second ? `Total funding ${amount(first + second)} · Outside funding ${Math.round(1000 * second / (first + second)) / 10}%` : 'Enter capital contributions.';
    };
    own.addEventListener('input', show);
    other.addEventListener('input', show);
    leverage.append(field('Your contribution (USD)', own), field('Outside funding (USD)', other), share);
    container.append(flip, risk, leverage);
    return container;
}

function mapsTab(maps) {
    const content = panel('NFG heat maps', 'Archived research from the NFG course.');
    if (!maps.length) {
        content.append(el('p', 'The map archive is unavailable.'));
        return content;
    }
    const map = select(maps.map((item, index) => [String(index), item.title]), 'map');
    const highlight = input('checkbox', 'glow');
    highlight.checked = true;
    const controls = el('div', undefined, 'nfg-dash-controls');
    controls.append(field('Map', map), field('Glow on warmest map regions', highlight));
    const frame = el('figure', undefined, 'nfg-dash-map');
    const image = el('img');
    const overlay = el('img', undefined, 'nfg-dash-map-overlay');
    overlay.alt = '';
    overlay.setAttribute('aria-hidden', 'true');
    const caption = el('figcaption');
    const graphics = el('div', undefined, 'nfg-dash-map-graphic');
    graphics.append(image, overlay);
    frame.append(graphics, caption);
    content.append(controls, frame);
    function draw() {
        const active = maps[Number(map.value)];
        image.src = active.src || active.image || active.path;
        image.alt = active.alt || active.title;
        caption.textContent = active.description || active.caption || active.title;
        overlay.hidden = !active.highlight || !highlight.checked;
        highlight.disabled = !active.highlight;
        if (active.highlight) overlay.src = active.highlight;
    }
    map.addEventListener('change', draw);
    highlight.addEventListener('change', draw);
    draw();
    return content;
}

function markets(data) {
    const content = panel('Candlestick lab', 'The open and close are the first and last daily observations of a month. Wicks show that month’s highest and lowest daily observations.');
    const tickers = Object.entries(data);
    if (!tickers.length) {
        content.append(el('p', 'Historical market series are unavailable.'));
        return content;
    }
    const ticker = select(tickers.map(([key, entry]) => [key, entry.title]), 'ticker');
    const period = select(yearStart.map(year => [String(year), String(year)]), 'period');
    period.value = '2024';
    const controls = el('div', undefined, 'nfg-dash-controls');
    controls.append(field('Series', ticker), field('Start year', period));
    const chart = el('div', undefined, 'nfg-dash-chart');
    const source = link('Data source ↗', tickers[0][1].source);
    const chartLegend = el('p', 'Gold bands mark months where the close rose 30% or more over three months. These bands label recorded price movement.');
    const legend = el('div', undefined, 'nfg-dash-controls');
    legend.append(chartLegend, source);
    const table = el('details');
    const summary = el('summary', 'Read monthly values');
    table.append(summary);
    content.append(controls, chart, legend, table);
    function draw() {
        const dataset = data[ticker.value], start = Number(period.value);
        const end = start + (start === 2024 ? 3 : start === 2026 ? 1 : 4);
        const rows = dataset.intervals.filter(row => Number(row[0].slice(0, 4)) >= start && Number(row[0].slice(0, 4)) < end);
        source.href = dataset.source;
        table.replaceChildren(summary);
        if (!rows.length) {
            chart.replaceChildren(el('p', 'The source has no observations in this period.'));
            return;
        }
        const low = Math.min(...rows.map(row => row[3]));
        const high = Math.max(...rows.map(row => row[2]));
        const max = high + (high - low) * .1;
        const min = Math.max(0, low - (high - low) * .08);
        const position = value => 100 * (value - min) / Math.max(max - min, .001);
        const column = el('div', undefined, 'nfg-dash-candles');
        column.setAttribute('role', 'img');
        column.setAttribute('aria-label', `${dataset.title} monthly price candles from ${rows[0][0]} to ${rows.at(-1)[0]}`);
        const values = el('ul');
        rows.forEach(([month, open, high, low, close]) => {
            const index = dataset.intervals.findIndex(row => row[0] === month);
            const previous = dataset.intervals[index - 3]?.[4];
            const candle = el('div', undefined, 'nfg-dash-candle ' + (close >= open ? 'is-up' : 'is-down'));
            if (previous && close / previous >= 1.3) candle.classList.add('is-accelerating');
            const wick = el('i'), body = el('b');
            wick.style.bottom = position(low) + '%';
            wick.style.height = position(high) - position(low) + '%';
            body.style.bottom = position(Math.min(open, close)) + '%';
            body.style.height = Math.max(.7, Math.abs(position(close) - position(open))) + '%';
            candle.append(wick, body);
            column.append(candle);
            values.append(el('li', `${month} · Open ${number.format(open)} · High ${number.format(high)} · Low ${number.format(low)} · Close ${number.format(close)}`));
        });
        const axis = el('div', undefined, 'nfg-dash-axis');
        axis.append(el('span', rows[0][0]), el('span', rows.at(-1)[0]));
        chart.replaceChildren(column, axis);
        table.append(values);
    }
    ticker.addEventListener('change', draw);
    period.addEventListener('change', draw);
    draw();
    return content;
}

function timeline() {
    const content = panel('Your timeline', 'Save a date and milestone for each room day.');
    const records = saved(timelineKey, []);
    const form = el('form', undefined, 'nfg-dash-controls');
    const date = input('date', 'date');
    date.value = localDate();
    const day = select(days.map(record => [String(record.day), `Day ${record.day} · ${record.title}`]), 'day');
    const milestone = input('text', 'milestone');
    milestone.maxLength = 150;
    milestone.required = date.required = true;
    const add = button('Save milestone', 'submit');
    form.append(field('Date', date), field('Room day', day), field('Milestone', milestone), add);
    const status = el('p');
    status.setAttribute('role', 'status');
    const list = el('ol', undefined, 'nfg-dash-rank');
    content.append(form, status, list, link('Open Room Planner', '#planner'));
    function draw() {
        list.replaceChildren(...[...records].sort((a, b) => a.date.localeCompare(b.date)).map(record => {
            const item = el('li');
            item.append(el('span', `${record.date} · ${record.title}`), link('Day ' + record.day, '#day-' + record.day));
            return item;
        }));
    }
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!validDate(date.value) || !milestone.value.trim()) return;
        records.push({ date: date.value, day: day.value, title: milestone.value.trim() });
        status.textContent = 'Milestone saved.';
        save(timelineKey, records, status);
        milestone.value = '';
        draw();
    });
    draw();
    return content;
}

function gatekeepersTab() {
    const content = panel('Who is chasing you?', 'Four characters from the original NFG Gatekeepers maze.');
    const image = el('img', undefined, 'nfg-dash-original');
    image.src = 'arcade/nfg-suited-gatekeepers.png';
    image.alt = 'Original set of four suited NFG Gatekeepers characters';
    const roles = el('ol', undefined, 'nfg-dash-rank');
    for (const name of ['The Label', 'Management', 'Distribution', 'Your Self']) roles.append(el('li', name));
    content.append(image, roles, link('Play the NFG maze ↗', '#arcade'));
    return content;
}

function graduationTab(speech) {
    const content = panel(speech?.title || 'You Did It!');
    if (!speech?.paragraphs?.length) return content;
    const image = el('img', undefined, 'nfg-dash-graduation');
    image.src = speech.src;
    image.alt = speech.alt;
    content.append(image);
    const action = button('Read speech aloud');
    const stop = button('Stop');
    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
        action.addEventListener('click', () => {
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(speech.paragraphs.join(' ')));
        });
        stop.addEventListener('click', () => window.speechSynthesis.cancel());
        const group = el('div', undefined, 'nfg-dash-controls');
        group.append(action, stop);
        content.append(group);
    }
    for (const paragraph of speech.paragraphs) content.append(el('p', paragraph));
    content.append(el('small', speech.source));
    return content;
}

export async function mountDashboard(container) {
    const [maps, market, publicData, courseReferences, speech, ownerSales] = await Promise.all(
        ['maps.json', 'market.json', 'public-data.json', 'course-references.json', 'you-did-it.json', 'owner-sales.json'].map(readData)
    );
    const data = { maps: maps?.maps || maps || empty.maps, market: market || empty.market, publicData: publicData || empty.publicData,
        courseReferences: courseReferences || [], ownerSales };
    const nav = el('div', undefined, 'nfg-dash-tabs');
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Dashboard sections');
    const body = el('div', undefined, 'nfg-dash-body');
    const render = () => {
        const [page, path] = location.hash.slice(1).split('/');
        if (page !== 'dashboard') return;
        const key = Object.hasOwn(sectionNames, path) ? path : 'overview';
        for (const anchor of nav.children) {
            if (anchor.hash === '#dashboard/' + key) anchor.setAttribute('aria-current', 'page');
            else anchor.removeAttribute('aria-current');
        }
        const view = { overview: () => overview(data), money: moneyTab, maps: () => mapsTab(data.maps),
            markets: () => markets(data.market), timeline, graduation: () => graduationTab(speech), gatekeepers: gatekeepersTab };
        body.replaceChildren(view[key]());
    };
    for (const [path, title] of Object.entries(sectionNames)) nav.append(link(title, '#dashboard/' + path));
    container.replaceChildren(nav, body);
    window.addEventListener('hashchange', render);
    render();
}
