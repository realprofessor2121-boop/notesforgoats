const key = 'nfg-royalty-receipts-v1';
const quarterly = [1, 4, 7, 10];
const monthly = Array.from({ length: 12 }, (_, index) => index + 1);
const portals = [
    ['The MLC', 'Mechanical', monthly], ['HFA / Harry Fox', 'Mechanical', []], ['Music Reports', 'Mechanical', []],
    ['ASCAP Writer', 'Performance', quarterly], ['ASCAP Publisher', 'Performance', quarterly],
    ['BMI Writer', 'Performance', quarterly], ['BMI Publisher (LLC)', 'Performance', quarterly],
    ['SESAC Writer', 'Performance', []], ['Songtrust Admin', 'Publishing administration', []],
    ['SoundExchange', 'Digital recording performance', monthly],
    ['TuneCore', 'Distribution', monthly], ['SoundCloud Artist', 'Distribution', monthly],
];
const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
const dateLabel = new Intl.DateTimeFormat(undefined, { month: 'long', timeZone: 'UTC' });
const allowedDate = /^\d{4}-\d{2}-\d{2}$/;
let sessionRows;

function row(value) {
    const company = typeof value?.company === 'string' ? value.company.trim().slice(0, 120) : '';
    const date = value?.date;
    if (!company || !allowedDate.test(date) || !Number.isSafeInteger(value.cents)) return null;
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!Number.isFinite(parsed.valueOf()) || !parsed.toISOString().startsWith(date)) return null;
    return { company, date, cents: value.cents };
}

function cents(value) {
    const clean = String(value).trim().replace(/^\$/, '').replace(/,/g, '');
    if (!/^-?\d+(?:\.\d{1,2})?$/.test(clean)) return NaN;
    return Math.round(Number(clean) * 100);
}

function readRows() {
    if (sessionRows) return sessionRows.slice();
    try {
        const records = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(records) ? records.map(row).filter(Boolean) : [];
    } catch {
        return [];
    }
}

function writeRows(rows) {
    try {
        localStorage.setItem(key, JSON.stringify(rows));
        sessionRows = undefined;
        return true;
    } catch {
        sessionRows = rows.slice();
        return false;
    }
}

export function parseReceiptCsv(text) {
    const rows = [];
    let record = [];
    let field = '';
    let quoted = false;
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        if (char === '"' && quoted && text[index + 1] === '"') {
            field += '"';
            index++;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (!quoted && (char === ',' || char === '\n')) {
            record.push(field.trim());
            field = '';
            if (char === '\n') {
                if (record.some(Boolean)) rows.push(record);
                record = [];
            }
        } else {
            field += char;
        }
    }
    if (quoted) throw new Error('Close the quotation marks in the CSV and try again.');
    record.push(field.trim());
    if (record.some(Boolean)) rows.push(record);
    const columns = (rows.shift() || []).map(value => value.replace(/^\uFEFF/, '').trim().toLowerCase());
    const company = columns.indexOf('company'), date = columns.indexOf('date'), amount = columns.indexOf('amount');
    if ([company, date, amount].includes(-1)) throw new Error('Use CSV columns named company, date and amount.');
    return rows.map((values, index) => {
        const value = row({ company: values[company], date: values[date], cents: cents(values[amount]) });
        if (!value) throw new Error(`Check the company, YYYY-MM-DD date, and USD amount on row ${index + 2}.`);
        return value;
    });
}

export function estimateCompany(rows, company, forecastMonth) {
    const matchingCycles = new Map();
    for (const entry of rows) {
        const month = entry.date.slice(0, 7);
        if (entry.company.toLowerCase() !== company.toLowerCase() || month >= forecastMonth ||
            month.slice(-2) !== forecastMonth.slice(-2)) continue;
        matchingCycles.set(month, (matchingCycles.get(month) || 0) + entry.cents);
    }
    const observed = [...matchingCycles].sort(([a], [b]) => b.localeCompare(a)).slice(0, 6)
        .map(([, amount]) => amount).sort((a, b) => a - b);
    if (!observed.length) return null;
    const middle = Math.floor(observed.length / 2);
    const median = observed.length % 2 ? observed[middle] : (observed[middle - 1] + observed[middle]) / 2;
    return { median, count: observed.length, low: observed[0], high: observed.at(-1) };
}

function element(tag, text) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
}

function label(name, control) {
    const item = element('label');
    item.append(element('span', name), control);
    return item;
}

function link(name, href) {
    const anchor = element('a', name);
    anchor.href = href;
    if (href.startsWith('https:')) {
        anchor.target = '_blank';
        anchor.rel = 'noopener';
    }
    return anchor;
}

const guide = [
    ['Performance', 'ASCAP, BMI, SESAC and other PROs', 'They license public performances of the composition and distribute composition royalties to their affiliated writers and publishers.'],
    ['Digital recording performance', 'SoundExchange', 'It collects certain U.S. digital performance royalties for sound recordings and pays eligible recording artists and rights owners.'],
    ['Distribution', 'Your distributor or direct platform', 'Services report use of the master recording. The distributor or platform pays the party who supplied it under their agreement.'],
    ['Synchronization', 'The production or its licensing agent', 'Pairing music with a film, video, ad or game generally requires a license for the composition and a separate license for the recording used. The terms determine who is paid.'],
];

export function mountRoyalties(container) {
    let rows = readRows();
    const wrapper = element('div');
    wrapper.className = 'nfg-royalties';
    const navigation = element('div');
    navigation.className = 'nfg-royalty-nav';
    navigation.append(link('Mechanical royalties', '#mechanical'), link('Other royalties', '#mechanical/other'), link('Back to the house ↗', '#tour'));
    const description = element('div');
    description.className = 'nfg-royalty-guide';
    const form = element('form');
    form.className = 'nfg-royalty-form';
    const company = element('input'), date = element('input'), amount = element('input');
    company.required = date.required = amount.required = true;
    company.setAttribute('list', 'nfg-royalty-companies');
    company.maxLength = 120;
    date.type = 'date';
    amount.type = 'number';
    amount.step = '0.01';
    amount.inputMode = 'decimal';
    const known = element('datalist');
    known.id = 'nfg-royalty-companies';
    for (const [name] of portals) {
        const option = element('option');
        option.value = name;
        known.append(option);
    }
    const save = element('button', 'Add a received payment');
    save.type = 'submit';
    form.append(label('Company', company), label('Date received', date), label('Amount (USD)', amount), save, known);
    const file = element('input');
    file.type = 'file';
    file.accept = '.csv,text/csv';
    const status = element('p');
    status.setAttribute('role', 'status');
    const history = element('details');
    const historyTitle = element('summary');
    const historyRows = element('ul');
    history.append(historyTitle, historyRows);
    const month = element('input');
    month.type = 'month';
    const next = new Date();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    month.value = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    const estimateSection = element('section');
    estimateSection.className = 'nfg-royalty-estimates';
    const table = element('div');
    table.className = 'nfg-estimate-cards';
    estimateSection.append(element('h3', 'Expected payments'), label('Compare month', month),
        element('p', 'Estimates use the median of up to six years of received payments in the same calendar month. Import received amounts in USD with company, date and amount columns.'), table);
    const book = link('Get the NFG payout calendar for Blender ↓', 'assets/explore/downloads/nfg-distribution-calendar.blend');
    book.download = '';
    wrapper.append(navigation, description, estimateSection, form, label('Import received payments (CSV)', file), status, history, book);
    container.replaceChildren(wrapper);

    function drawExplanation() {
        const other = location.hash.endsWith('/other');
        navigation.children[Number(other)].setAttribute('aria-current', 'page');
        navigation.children[Number(!other)].removeAttribute('aria-current');
        const cards = location.hash.endsWith('/other') ? guide : [
            ['Mechanical royalties', 'The MLC, HFA and Music Reports', 'Mechanical royalties come from licensed copying and distribution of the musical composition. Which company pays depends on the license, service, and your publishing arrangements.'],
        ];
        description.replaceChildren(...cards.map(([title, who, why]) => {
            const card = element('article');
            card.append(element('h3', title), element('strong', who), element('p', why));
            return card;
        }));
        description.append(link('Music rights guide ↗', 'https://www.copyright.gov/music-modernization/educational-materials/musicians-income.pdf'));
    }

    function render() {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month.value)) return;
        const number = Number(month.value.slice(-2));
        const providers = new Map(portals.map(value => [value[0].toLowerCase(), value]));
        for (const record of rows) {
            const companyKey = record.company.toLowerCase();
            if (!providers.has(companyKey)) providers.set(companyKey, [record.company, 'Imported company', []]);
        }
        const monthName = dateLabel.format(new Date(`${month.value}-01T00:00:00Z`));
        const cards = Array.from(providers.values(), ([name, type, timing]) => {
            const card = element('article');
            const estimate = estimateCompany(rows, name, month.value);
            const amount = estimate ? money.format(estimate.median / 100) : 'No comparable receipts';
            const cadence = !timing.length ? 'Timing varies' : timing.includes(number) ? 'On the NFG calendar' : 'Outside the NFG calendar window';
            card.append(element('h4', name), element('small', type), element('strong', amount),
                element('span', `${monthName} · ${cadence}`));
            if (estimate) {
                const { count, low, high } = estimate;
                card.append(element('small', `${count} comparable month${count === 1 ? '' : 's'}${count < 3 ? ' · Limited history' : ''} · ${money.format(low / 100)} to ${money.format(high / 100)}`));
            }
            return card;
        });
        table.replaceChildren(...cards);
        historyTitle.textContent = `Received payments (${rows.length})`;
        historyRows.replaceChildren(...rows.map((record, index) => {
            const entry = element('li', `${record.company} · ${record.date} · ${money.format(record.cents / 100)}`);
            const remove = element('button', 'Remove');
            remove.type = 'button';
            remove.addEventListener('click', () => {
                rows = rows.filter((_, position) => position !== index);
                writeRows(rows);
                render();
            });
            entry.append(remove);
            return entry;
        }));
    }

    function saveHistory(message) {
        const saved = writeRows(rows);
        status.textContent = saved ? message : `${message} Available for this visit.`;
        render();
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        const value = row({ company: company.value, date: date.value, cents: cents(amount.value) });
        if (!value) return;
        rows.push(value);
        form.reset();
        saveHistory('Payment added.');
    });
    file.addEventListener('change', async () => {
        const csv = file.files?.[0];
        if (!csv) return;
        try {
            if (csv.size > 4 * 1024 * 1024) throw new Error('Choose a CSV file smaller than 4 MB.');
            const added = parseReceiptCsv(await csv.text());
            const seen = new Set(rows.map(value => JSON.stringify(value)));
            const original = rows.length;
            for (const record of added) {
                const id = JSON.stringify(record);
                if (seen.has(id)) continue;
                seen.add(id);
                rows.push(record);
            }
            saveHistory(`Imported ${rows.length - original} new payments.`);
        } catch (error) {
            status.textContent = error.message;
        } finally {
            file.value = '';
        }
    });
    month.addEventListener('change', render);
    window.addEventListener('hashchange', drawExplanation);
    drawExplanation();
    render();
}
