import { getNfgProfile } from '../explore/profile.js';

const STORE = 'nfg-business-workflows-v1';
const THIS_YEAR = new Date().getFullYear();
const logo = name => `assets/explore/posters/logo-${name}.webp`;

const riaa2025 = 'https://www.riaa.com/wp-content/uploads/2026/03/RIAA-Year-End-Revenue-2025.pdf';
const industryRevenue = [
    ['Streaming', '9,474.5'],
    ['Single downloads', '110.8'],
    ['Album downloads', '111.0'],
    ['Vinyl', '1,042.9'],
    ['CD', '312.4'],
    ['Other physical formats', '25.8'],
];

const stages = ['Draft', 'Ready', 'Submitted by me', 'Confirmed'];
const releaseStages = ['Draft', 'Master ready', 'Delivered', 'Released'];
const mediaFormats = ['Single', 'EP', 'Album', 'Compilation', 'Remix'];
const field = (id, label, options = {}) => ({ id, label, ...options });
const choose = (id, label, options, initial) => field(id, label, { options, initial });
const text = (id, label, required = false) => field(id, label, { required });
const long = (id, label) => field(id, label, { type: 'textarea' });
const day = (id, label) => ({ id, label });
const yes = (id, label) => field(id, label, { type: 'checkbox' });
const date = (id, label) => field(id, label, { type: 'date' });
const number = (id, label, options = {}) => field(id, label, { type: 'number', min: 0, ...options });
const url = (id, label) => field(id, label, { type: 'url' });
const ref = (label, href, image) => ({ label, href, image });
const song = text('song', 'Song or release title', true);
const artist = field('artist', 'Artist', { profile: 'artistName' });
const label = field('label', 'Label', { profile: 'company' });
const publisher = field('publisher', 'Publishing company', { profile: 'publishingCompany' });
const d = {
    label: day('2-4', '2.4 Label Structure'),
    copyright: day('3-3', '3.3 Protections'),
    royalty: day('3-4', '3.4 Royalties'),
    studios: day('4-7', '4.7 Make Music'),
    master: day('5-1', '5.1 Mastering'),
    codes: day('5-2', '5.2 ISRC & UPC'),
    splits: day('5-3', '5.3 Split Sheets & TM'),
    artists: day('5-4', '5.4 For Artists'),
    storage: day('5-5', '5.5 Song Storage'),
    delivery: day('5-6', '5.6 Upload to DSP & SF'),
    check: day('5-7', '5.7 Quality Check'),
    marketing: day('6-1', '6.1 Marketing 101'),
    social: day('6-2', '6.2 Social Media MRK'),
    broadcast: day('6-3', '6.3 Radio & TV Monitor'),
    strategy: day('6-5', '6.5 Strategy & Release'),
    growth: day('7-4', '7.4 Progress Bar'),
    awards: day('7-6', '7.6 Plaques Red Carpet'),
};

export const workflowSections = [
    { id: 'release', label: 'Release planning', tasks: [
        {
            id: 'goals', label: 'Annual song release goal', lessons: [d.strategy, d.growth],
            description: 'Set a yearly song target. Progress uses releases marked Released and the number of songs in each release.',
            fields: [number('year', 'Release year', { min: 1900, max: 9999, initial: THIS_YEAR, required: true }),
                number('target', 'Songs to release', { min: 1, max: 9999, required: true }),
                long('plan', 'Milestones or monthly plan')],
            headline: 'year',
        },
        {
            id: 'releases', label: 'Masters, stems, albums & singles', lessons: [d.studios, d.master, d.storage, d.check],
            description: 'Track the final master, instrumental and stems alongside the release date and quality checks.',
            fields: [song, artist, label, choose('format', 'Release format', mediaFormats, 'Single'),
                date('releasedAt', 'Release date'),
                number('tracks', 'Number of songs', { min: 1, max: 999, initial: 1, required: true }),
                choose('stage', 'Release status', releaseStages, 'Draft'), text('master', 'Master version or storage reference'),
                long('stems', 'Stems and alternate versions'), yes('masterReview', 'Final master approved'),
                yes('rightsReview', 'Credits and permissions reviewed'),
                yes('mediaReview', 'Cover art and metadata reviewed')],
            headline: 'song',
        },
    ] },
    { id: 'registration', label: 'Registration', tasks: [
        {
            id: 'registry', label: 'Song registry', lessons: [d.codes, d.royalty, d.storage],
            description: 'Keep one local entry for each recording or version and record its underlying composition details.',
            fields: [song, artist, text('version', 'Recording version'), text('isrc', 'Recording ISRC'),
                text('iswc', 'Composition ISWC'), text('upc', 'Release UPC or EAN'), text('ipi', 'Writer or publisher IPI'),
                text('writers', 'Writers'), publisher, label, text('masterOwner', 'Master rights owner'),
                url('reference', 'Official record or catalog link')],
            links: [
                ref('Look up an ISRC', 'https://isrc.soundexchange.com/', logo('soundexchange')),
                ref('IFPI ISRC assignment', 'https://isrc.ifpi.org/get-isrc'),
                ref('The MLC work search and tools', 'https://www.themlc.com/tools', logo('mlc')),
            ],
            headline: 'song',
        },
        {
            id: 'metadata', label: 'Luminate, AllMusic & TiVo', lessons: [d.codes, d.delivery],
            description: 'Prepare registration metadata and keep a record of submissions you make. AllMusic routes artist and release information through its Xperi metadata provider, formerly TiVo.',
            fields: [song, artist, choose('provider', 'Destination', ['Luminate CONNECT', 'Xperi / TiVo for AllMusic', 'The MLC']),
                text('ids', 'ISRC, UPC/EAN or work ID'), url('releaseLink', 'Public release or press kit link'),
                choose('stage', 'Registration status', stages, 'Draft'), date('submittedAt', 'Date submitted'),
                text('receipt', 'Reference number or receipt')],
            links: [
                ref('Luminate CONNECT music registration', 'https://support.luminatedata.com/portal/en/kb/articles/music-registration'),
                ref('AllMusic product submissions', 'https://www.allmusic.com/product-submissions'),
                ref('TiVo / Xperi music metadata', 'https://business.tivo.com/products-solutions/metadata/music-metadata'),
            ],
            headline: 'song',
        },
    ] },
    { id: 'rights', label: 'Rights & team', tasks: [
        {
            id: 'splits', label: 'Split sheets', lessons: [d.splits, d.royalty],
            description: 'Add one share per contributor. Totals are calculated per song and rights type. Review the worksheet with collaborators and keep the signed agreement separately.',
            fields: [song, choose('rights', 'Rights type', ['Composition', 'Master recording'], 'Composition'),
                text('contributor', 'Contributor name', true), text('role', 'Contribution'),
                number('percent', 'Agreed share (%)', { max: 100, step: .01, required: true }),
                text('ipi', 'IPI or contributor ID'), text('pro', 'Performing rights organization'), publisher,
                text('agreement', 'Agreement or signature reference')],
            links: [ref('Songtrust split sheet guide', 'https://help.songtrust.com/knowledge/how-do-i-decide-on-splits', logo('songtrust'))],
            headline: 'contributor',
        },
        {
            id: 'cues', label: 'Cue sheets', lessons: [d.royalty, d.broadcast],
            description: 'Log each use of music in a production. Prepare your worksheet for the producer or authorized cue sheet filer.',
            fields: [text('production', 'Production title', true), text('episode', 'Episode or version'), song,
                text('use', 'Use type or scene'), text('timecode', 'Start timecode'), text('duration', 'Duration (mm:ss)'),
                text('writers', 'Writers and shares'), publisher, text('pro', 'PRO or publisher contact'),
                date('airDate', 'First air or release date'), text('filer', 'Producer or filer')],
            links: [ref('BMI cue sheet guide', 'https://www.bmi.com/creators/what_is_a_cue_sheet', logo('bmi'))],
            headline: 'production',
        },
        {
            id: 'copyright', label: 'Copyright PA & SR', lessons: [d.copyright, d.splits],
            description: 'Record the composition and the sound recording separately. PA covers the musical work. SR covers a recording. The U.S. Copyright Office explains when one SR application can cover both.',
            fields: [song, choose('workType', 'Worksheet type', ['PA · Musical composition', 'SR · Sound recording', 'SR · Both under eligible ownership']),
                text('claimant', 'Copyright claimant'), text('authors', 'Authors'), date('publishedAt', 'First publication date'),
                text('deposit', 'Deposit copy reference'), choose('stage', 'Application status', stages, 'Draft'), text('caseNumber', 'Application or registration number')],
            links: [ref('Copyright Office PA and SR guidance', 'https://www.copyright.gov/register/pa-sr.html'),
                ref('U.S. Copyright Office registration', 'https://www.copyright.gov/registration/')],
            headline: 'song',
        },
        {
            id: 'team', label: 'Label structure', lessons: [d.label, d.royalty],
            description: 'Give each label task an owner and keep their area of responsibility visible.',
            fields: [label, choose('area', 'Label function', ['Management', 'A&R', 'Production', 'Publishing',
                'Distribution', 'Marketing', 'Licensing', 'Business affairs', 'Accounting', 'Other']),
                text('owner', 'Responsible person or team', true), text('contact', 'Contact or reference'), long('responsibility', 'Responsibilities and approvals')],
            headline: 'owner',
        },
    ] },
    { id: 'promotion', label: 'Promotion', tasks: [
        {
            id: 'press', label: 'LookingList & press submissions', lessons: [d.marketing, d.broadcast, d.strategy],
            description: 'Plan a pitch to The Looking List or another press brand. Save the recipient, opportunity and approved private listening link before you submit.',
            fields: [song, artist, field('outlet', 'List, curator or press brand', { required: true, initial: 'The Looking List' }), text('opportunity', 'Brief, feature or placement'),
                url('policy', 'Official submission guidelines'), url('pressKit', 'Press kit or listening link'),
                choose('stage', 'Outreach status', ['Draft', 'Ready', 'Sent by me', 'Replied', 'Placed', 'Closed'], 'Draft'),
                date('sentAt', 'Submission date'), date('followUp', 'Follow-up date'), long('pitch', 'Pitch and key credits')],
            links: [ref('The Looking List submission guidelines', 'https://thelookinglist.com/submission-guidlines/')],
            headline: 'outlet',
        },
        {
            id: 'collect', label: 'Collect 1 marketing', lessons: [d.marketing, d.social, d.strategy],
            description: 'Choose the audience, the next relationship step and a specific offer. Give each one a measure.',
            fields: [song, text('audience', 'Audience'), text('visibility', 'Visibility action'),
                text('connection', 'Connection action'), text('offer', 'Offer'), text('measure', 'Success measure'),
                date('when', 'Review date'), long('notes', 'Channel, assets and follow-up')],
            headline: 'song',
        },
        {
            id: 'ads', label: 'Google Ads campaign plan', lessons: [d.marketing, d.social, d.strategy],
            description: 'Plan visibility, connection or offers. Prepare an audience, destination and budget before setting anything live in Google Ads.',
            fields: [text('campaign', 'Campaign name', true), artist,
                choose('objective', 'NFG purpose', ['Visibility', 'Connection', 'Offers']),
                text('account', 'Google Ads account label'),
                choose('stage', 'Campaign status', ['Planning', 'Account ready', 'Draft in Google Ads', 'Active (confirmed)'], 'Planning'),
                text('audience', 'Audience or geography'), text('measure', 'Primary result to measure'),
                url('destination', 'Landing page'), number('budget', 'Planned budget', { step: .01 }),
                text('currency', 'Currency'), date('startAt', 'Planned start date'), date('endAt', 'Planned end date'),
                yes('creative', 'Ad creative approved'), yes('landing', 'Landing page checked')],
            links: [ref('Create a Google Ads account', 'https://support.google.com/google-ads/answer/6366720'),
                ref('Google Ads campaign objectives', 'https://support.google.com/google-ads/answer/7450050')],
            headline: 'campaign',
        },
    ] },
    { id: 'sales', label: 'Sales & awards', tasks: [
        {
            id: 'channels', label: 'Places to sell or stream', lessons: [d.delivery, d.artists],
            description: 'Use your distributor for DSP delivery and artist dashboards for profiles. Direct sales can include downloads, physical music and merchandise.',
            fields: [song, artist, choose('channel', 'Channel', ['Spotify', 'Apple Music or iTunes', 'Amazon Music',
                'YouTube', 'SoundCloud', 'Bandcamp', 'NFG Shop', 'Direct physical sales', 'Other']),
                text('provider', 'Distributor or seller'), url('listing', 'Artist profile or listing link'),
                choose('stage', 'Status', ['Researching', 'Account ready', 'Delivered', 'Live'], 'Researching'),
                yes('profile', 'Artist profile verified'), yes('delivery', 'Delivery checked')],
            links: [ref('Spotify for Artists', 'https://artists.spotify.com/get-started'),
                ref('Apple Music distribution', 'https://artists.apple.com/support/1108-get-your-next-release-on-apple-music'),
                ref('Amazon Music for Artists', 'https://artists.amazonmusic.com/getting-started'),
                ref('YouTube Official Artist Channels', 'https://support.google.com/youtube/answer/7336634', logo('youtube')),
                ref('TuneCore signup worksheet', '#signup/tunecore', logo('tunecore')),
                ref('Spotify profile worksheet', '#signup/spotify'),
                ref('Bandcamp for Artists', 'https://bandcamp.com/artists'),
                ref('SoundCloud distribution', 'https://help.soundcloud.com/hc/en-us/articles/360051038314-Distribution-with-SoundCloud-for-Artists', logo('soundcloud'))],
            headline: 'song',
        },
        {
            id: 'sales', label: 'Sales, streams & device report', lessons: [d.delivery, d.growth],
            description: 'Enter a figure from an actual report. Keep paid units, downloads and streams separate, and copy the platform’s format or device label.',
            fields: [song, text('platform', 'Platform or seller', true), text('period', 'Report period', true),
                choose('metric', 'Metric', ['Paid units sold', 'Downloads', 'Streams', 'Reported revenue']),
                field('device', 'Format or device', {
                    suggestions: ['Phone', 'Tablet', 'Computer', 'TV', 'Connected speaker', 'Digital single', 'Digital album', 'CD', 'Vinyl', 'Cassette'],
                }),
                number('value', 'Reported amount', { step: .01, required: true }), text('currency', 'Currency, if applicable'),
                text('source', 'Report source or statement reference', true), url('sourceLink', 'Report link')],
            industry: true,
            headline: 'song',
        },
        {
            id: 'awards', label: 'RIAA awards & plaques', lessons: [d.awards, d.growth],
            description: 'Track certifications and plaque requests alongside the official evidence and rights-holder contact. Use the RIAA portal to check and apply for official certification.',
            fields: [song, artist, label, choose('format', 'Award product', mediaFormats), text('certification', 'Award level or certification'),
                choose('stage', 'Status', ['Research', 'Evidence gathered', 'Applied by rights holder', 'Certified', 'Plaque requested'], 'Research'),
                date('awardDate', 'Certification date'), text('reference', 'Certification or audit reference'),
                url('proof', 'Official award record'), text('recipient', 'Plaque recipient'),
                text('vendor', 'Authorized plaque supplier'), yes('approved', 'Rights holder confirmed plaque request')],
            links: [ref('RIAA certification portal', 'https://certification.riaa.com/'),
                ref('RIAA award search', 'https://www.riaa.com/gold-platinum/'),
                ref('RIAA official plaque guidance', 'https://www.riaa.com/goldandplatinum60/')],
            examples: [
                ['assets/expansion/references/riaa-course-logo.webp', 'Original NFG RIAA course logo'],
                ['assets/expansion/references/riaa-awards.webp', 'Gold, Platinum and Diamond awards shown in the NFG lesson'],
            ],
            headline: 'song',
        },
    ] },
];

function el(tag, className, content = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== '') node.textContent = content;
    return node;
}

function action(label, type = 'button') {
    const control = el('button', 'nfg-workflow-button', label);
    control.type = type;
    return control;
}

function makeStore() {
    let memory = {};
    let fallback = false;
    return {
        read() {
            if (fallback) return memory;
            try {
                const stored = JSON.parse(localStorage.getItem(STORE) || '{}');
                memory = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
            } catch {
                fallback = true;
            }
            return memory;
        },
        save(workflows) {
            memory = workflows;
            try {
                localStorage.setItem(STORE, JSON.stringify(workflows));
                fallback = false;
            } catch {
                fallback = true;
            }
            return !fallback;
        },
    };
}

function allRecords(workflows, task) {
    return Array.isArray(workflows[task]) ? workflows[task] : [];
}

function lessonLinks(lessons) {
    const row = el('div', 'nfg-workflow-lessons');
    for (const lesson of lessons) {
        const link = el('a', 'nfg-workflow-lesson', lesson.label);
        link.href = `#day-${lesson.id.split('-')[0]}/${lesson.id}`;
        row.append(link);
    }
    return row;
}

function officialLinks(links) {
    const resourceList = el('ul', 'nfg-workflow-resources');
    for (const resource of links) {
        const item = el('li');
        const link = el('a');
        link.href = resource.href;
        if (resource.href.startsWith('https://')) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }
        if (resource.image) {
            const picture = el('img');
            picture.src = resource.image;
            picture.alt = '';
            picture.loading = 'lazy';
            link.append(picture);
        }
        link.append(el('span', '', resource.label + ' ↗'));
        item.append(link);
        resourceList.append(item);
    }
    return resourceList;
}

function createControl(definition) {
    const wrapper = el('label', `nfg-workflow-field${definition.type === 'checkbox' ? ' nfg-workflow-check' : ''}`);
    const title = el('span', '', definition.label);
    let control;
    if (definition.options) {
        control = el('select');
        for (const option of ['', ...definition.options]) {
            const entry = el('option', '', option || 'Choose');
            entry.value = option;
            control.append(entry);
        }
    } else if (definition.type === 'textarea') {
        control = el('textarea');
        control.rows = 3;
        control.maxLength = 1800;
        wrapper.classList.add('nfg-workflow-wide');
    } else {
        control = el('input');
        control.type = definition.type || 'text';
        if (definition.type === 'number') {
            control.min = String(definition.min);
            control.step = definition.step === .01 ? 'any' : String(definition.step ?? 1);
            if (definition.max != null) control.max = String(definition.max);
        } else if (['text', 'url'].includes(control.type)) {
            control.maxLength = control.type === 'text' ? 240 : 1000;
        }
    }
    control.name = definition.id;
    control.required = Boolean(definition.required);
    if (definition.required) title.append(' *');
    if (definition.type === 'checkbox') wrapper.append(control, title);
    else wrapper.append(title, control);
    if (definition.suggestions) {
        const choices = el('datalist');
        choices.id = 'nfg-workflow-values-' + definition.id;
        control.setAttribute('list', choices.id);
        for (const suggestion of definition.suggestions) {
            const option = el('option');
            option.value = suggestion;
            choices.append(option);
        }
        wrapper.append(choices);
    }
    return { wrapper, control };
}

function asText(value) {
    return value === true ? 'Yes' : value === false ? 'No' : String(value ?? '');
}

function csvCell(value) {
    const content = asText(value).replace(/^[\r\n]+/, '');
    const safe = /^[\s]*[=+\-@]/.test(content) ? "'" + content : content;
    return '"' + safe.replaceAll('"', '""') + '"';
}

function downloadRecords(task, rows) {
    const csv = [task.fields.map(field => field.label), ...rows.map(row => task.fields.map(field => row[field.id]))]
        .map(row => row.map(csvCell).join(',')).join('\r\n');
    const link = el('a');
    const objectUrl = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    link.href = objectUrl;
    link.download = `nfg-${task.id}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

const splitKey = row => `${String(row.song || '').normalize().trim().toLowerCase()}| ${row.rights}`;
const cents = row => Math.round(Number(row.percent || 0) * 100);
const scopeSum = (rows, item) => rows.filter(row => splitKey(row) === splitKey(item)).reduce((sum, row) => sum + cents(row), 0);

function recordDescription(task, row, data) {
    if (task.id === 'goals') {
        const count = allRecords(data, 'releases')
            .filter(release => release.stage === 'Released' && String(release.releasedAt).slice(0, 4) === String(row.year))
            .reduce((sum, release) => sum + Number(release.tracks || 0), 0);
        return `${count} of ${row.target} songs released`;
    }

    if (task.id === 'splits') {
        const total = scopeSum(allRecords(data, 'splits'), row) / 100;
        return `${row.song} · ${row.rights} · ${row.percent}% share · ${total}% entered`;
    }

    if (task.id === 'sales') {
        return [[row.value, row.currency, row.metric].filter(Boolean).join(' '), row.platform, row.device, row.period]
            .filter(Boolean).join(' · ');
    }
    const summaries = ['song', 'format', 'provider', 'objective', 'channel', 'stage', 'metric', 'workType', 'use', 'duration']
        .filter(key => key !== task.headline).map(key => row[key]).filter(Boolean);
    return summaries.join(' · ');
}

function validate(task, row, saved) {
    if (task.id === 'goals' && allRecords(saved, 'goals').some(goal => goal.year === row.year && goal.id !== row.id)) {
        return 'Edit the existing goal for this year.';
    }
    if (task.id === 'splits') {
        if (!row.rights) return 'Choose the rights type for this split.';
        if (Math.abs(Number(row.percent) * 100 - cents(row)) > .000001) return 'Use up to two decimal places for shares.';
        const others = allRecords(saved, 'splits').filter(record => record.id !== row.id);
        if (scopeSum(others, row) + cents(row) > 10_000) {
            return 'Shares for this song and rights type exceed 100%.';
        }
    }
    if (task.id === 'releases' && row.stage === 'Released' && !row.releasedAt) return 'Enter the release date.';
    if (task.id === 'ads' && row.endAt && row.startAt && row.endAt < row.startAt) return 'The end date comes before the start date.';
    if (task.id === 'ads' && row.budget !== '' && !row.currency) return 'Enter the budget currency.';
    if (task.id === 'sales' && !row.metric) return 'Select the metric used in your report.';
    if (task.id === 'sales' && row.metric === 'Reported revenue' && !row.currency) return 'Enter the report currency.';
    return '';
}

function industryTable() {
    const detail = el('details', 'nfg-workflow-industry');
    detail.append(el('summary', '', '2025 U.S. recorded music industry reference'));
    const table = el('table');
    table.append(el('caption', '', 'Revenue by format in millions of U.S. dollars'));
    const header = el('thead');
    const heading = el('tr');
    heading.append(el('th', '', 'Format'), el('th', '', 'Revenue'));
    header.append(heading);
    const rows = el('tbody');
    for (const [format, revenue] of industryRevenue) {
        const row = el('tr');
        row.append(el('th', '', format), el('td', '', `$${revenue}M`));
        rows.append(row);
    }
    table.append(header, rows);
    const source = el('a', 'nfg-workflow-lesson', 'RIAA 2025 year-end report ↗');
    source.href = riaa2025;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    detail.append(table, source);
    return detail;
}

function mountTask(task, store, redrawAll) {
    const details = el('details', 'nfg-workflow-task');
    details.append(el('summary', '', task.label));
    const body = el('div', 'nfg-workflow-task-content');
    body.append(lessonLinks(task.lessons), el('p', 'nfg-workflow-copy', task.description));
    if (task.links?.length) body.append(officialLinks(task.links));
    if (task.industry) body.append(industryTable());
    if (task.examples?.length) {
        const assets = el('div', 'nfg-workflow-examples');
        for (const [src, alt] of task.examples) {
            const image = el('img');
            image.src = src;
            image.alt = alt;
            image.loading = 'lazy';
            assets.append(image);
        }
        body.append(assets);
    }

    const form = el('form', 'nfg-workflow-editor');
    form.setAttribute('aria-label', task.label + ' record');
    const inputs = new Map();
    const grid = el('div', 'nfg-workflow-fields');
    for (const definition of task.fields) {
        const { control, wrapper } = createControl(definition);
        inputs.set(definition.id, control);
        grid.append(wrapper);
    }

    const buttons = el('div', 'nfg-workflow-actions');
    const save = action('Save record', 'submit');
    save.classList.add('nfg-workflow-primary');
    const cancel = action('Cancel edit');
    const download = action('Download CSV');
    const status = el('p', 'nfg-workflow-status');
    status.setAttribute('role', 'status');
    buttons.append(save, cancel, download);
    form.append(grid, buttons, status);
    const records = el('ul', 'nfg-workflow-records');
    records.setAttribute('aria-label', `Saved records for ${task.label}`);
    body.append(form, records);
    details.append(body);
    let editing;

    function fill(row = {}) {
        const profile = getNfgProfile() || {};
        for (const definition of task.fields) {
            const entry = inputs.get(definition.id);
            if (definition.type === 'checkbox') entry.checked = Boolean(row[definition.id]);
            else {
                const profileValue = definition.profile
                    ? profile[definition.profile] || (definition.id === 'artist' ? profile.displayName : '')
                    : undefined;
                entry.value = row[definition.id] ?? profileValue ?? definition.initial ?? '';
            }
        }
        editing = row.id;
        save.textContent = editing ? 'Save changes' : 'Save record';
        cancel.hidden = !editing;
    }

    function draw() {
        const saved = store.read();
        const rows = allRecords(saved, task.id);
        download.disabled = rows.length === 0;
        records.replaceChildren();
        if (!rows.length) {
            records.append(el('li', 'nfg-workflow-empty', 'No saved records yet.'));
            return;
        }
        for (const record of rows) {
            const item = el('li', 'nfg-workflow-record');
            const copy = el('div');
            copy.append(el('strong', '', record[task.headline] || task.label));
            const summary = recordDescription(task, record, saved);
            if (summary) copy.append(el('p', '', summary));
            const edit = action('Edit');
            const remove = action('Remove');
            edit.setAttribute('aria-label', `Edit ${record[task.headline] || task.label}`);
            remove.setAttribute('aria-label', `Remove ${record[task.headline] || task.label}`);
            edit.addEventListener('click', () => {
                fill(record);
                status.textContent = '';
                form.querySelector('input, select, textarea')?.focus();
            });
            remove.addEventListener('click', () => {
                const message = `Remove ${record[task.headline] || 'this record'} from this browser?`;
                if (!window.confirm(message)) return;
                const next = store.read();
                next[task.id] = allRecords(next, task.id).filter(row => row.id !== record.id);
                store.save(next);
                if (editing === record.id) fill();
                status.textContent = 'Record removed.';
                redrawAll();
            });
            const actions = el('div', 'nfg-workflow-actions');
            actions.append(edit, remove);
            item.append(copy, actions);
            records.append(item);
        }
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        const row = { id: editing ?? crypto.randomUUID() };
        for (const definition of task.fields) {
            const input = inputs.get(definition.id);
            row[definition.id] = definition.type === 'checkbox' ? input.checked : input.value.trim();
        }
        const data = store.read();
        const issue = validate(task, row, data);
        if (issue) {
            status.textContent = issue;
            return;
        }
        const existing = allRecords(data, task.id);
        data[task.id] = existing.some(record => record.id === row.id)
            ? existing.map(record => record.id === row.id ? row : record)
            : [...existing, row];
        const persisted = store.save(data);
        fill();
        status.textContent = persisted ? 'Saved in this browser.' : 'Saved for this session. Download a copy to keep it.';
        redrawAll();
    });
    cancel.addEventListener('click', () => {
        fill();
        status.textContent = '';
    });
    download.addEventListener('click', () => downloadRecords(task, allRecords(store.read(), task.id)));

    fill();
    draw();
    return { details, draw };
}

export function mountWorkflows(container) {
    const workspace = el('div', 'nfg-workflow');
    const tabs = el('div', 'nfg-workflow-tabs');
    tabs.setAttribute('aria-label', 'Workflow lesson areas');
    const store = makeStore();
    const panels = new Map();
    const controls = new Map();
    const recordViews = [];
    const redrawAll = () => recordViews.forEach(view => view.draw());

    function select(section) {
        if (!panels.has(section)) return;
        for (const [id, panel] of panels) {
            panel.hidden = id !== section;
            controls.get(id).setAttribute('aria-pressed', String(id === section));
        }
    }

    for (const section of workflowSections) {
        const tab = action(section.label);
        tab.addEventListener('click', () => select(section.id));
        controls.set(section.id, tab);
        tabs.append(tab);
        const panel = el('section', 'nfg-workflow-panel');
        panel.setAttribute('aria-label', section.label);
        panels.set(section.id, panel);
        for (const [index, task] of section.tasks.entries()) {
            const view = mountTask(task, store, redrawAll);
            view.details.open = index === 0;
            recordViews.push(view);
            panel.append(view.details);
        }
    }
    workspace.append(
        tabs,
        el('p', 'nfg-workflow-local', 'Worksheets stay in this browser. Use the official links to complete account, filing and submission steps.'),
        ...panels.values(),
    );
    container.replaceChildren(workspace);

    function followHash() {
        const [, section] = window.location.hash.split('/');
        if (panels.has(section)) select(section);
    }

    function updated(event) {
        if (event.key === STORE) redrawAll();
    }
    select('release');
    followHash();
    window.addEventListener('hashchange', followHash);
    window.addEventListener('storage', updated);
    return () => {
        window.removeEventListener('hashchange', followHash);
        window.removeEventListener('storage', updated);
        workspace.remove();
    };
}
