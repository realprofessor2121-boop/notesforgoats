import { getNfgProfile } from './profile.js';

const prefix = 'nfg-jukebox-details:';
const standardRoles = ['Artist(s)', 'Writer(s)', 'Producer(s)', 'Engineer(s)', 'Mixing', 'Mastering'];
const pieColors = ['#e8bb61', '#73bbac', '#ed8e89', '#9aa7df', '#d78bb7', '#c4be81', '#7eafd0'];
const unassignedColor = '#504b45';
const percentage = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const sessionDetails = new Map();
const roleAliases = {
    artist: 'Artist(s)', artists: 'Artist(s)', performer: 'Artist(s)', performers: 'Artist(s)',
    writer: 'Writer(s)', writers: 'Writer(s)', songwriter: 'Writer(s)', songwriters: 'Writer(s)',
    producer: 'Producer(s)', producers: 'Producer(s)', engineer: 'Engineer(s)', engineers: 'Engineer(s)',
    mixer: 'Mixing', mixing: 'Mixing', mastering: 'Mastering',
};

function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function action(label) {
    const button = node('button', 'nfg-music-button', label);
    button.type = 'button';
    return button;
}

function field(title, control) {
    const label = node('label', 'nfg-jukebox-field');
    label.append(node('span', '', title), control);
    return label;
}

function normalizeCredits(entries) {
    const roles = new Map();
    for (const row of entries) {
        const rawRole = typeof row?.role === 'string' ? row.role.trim() : '';
        const names = Array.isArray(row?.names) ? row.names.filter(value => typeof value === 'string').join(', ') : row?.names;
        if (!rawRole || typeof names !== 'string' || !names.trim()) continue;
        const role = Object.hasOwn(roleAliases, rawRole.toLowerCase()) ? roleAliases[rawRole.toLowerCase()] : rawRole;
        const key = role.toLowerCase();
        const previous = roles.get(key);
        if (!previous) roles.set(key, { role, names: names.trim() });
        else if (previous.names !== names.trim()) previous.names += `, ${names.trim()}`;
    }
    return [...roles.values()];
}

function sourceDetails(track) {
    const credits = [...(track.credits || [])];
    if (track.artist) credits.unshift({ role: 'Artist(s)', names: track.artist });
    return { lyrics: track.lyrics || '', credits: normalizeCredits(credits), splits: [], edited: false };
}

function normalizeSplits(rows) {
    const splits = rows.filter(row => typeof row?.payee === 'string' && row.payee.trim() &&
        typeof row?.role === 'string' && Number.isInteger(row?.points) && row.points >= 0 && row.points <= 10000)
        .map(({ payee, role, points }) => ({ payee: payee.trim(), role: role.trim(), points }));
    return splits.reduce((sum, row) => sum + row.points, 0) <= 10000 ? splits : [];
}

function loadDetails(track) {
    if (sessionDetails.has(track.id)) return sessionDetails.get(track.id);
    try {
        const stored = JSON.parse(localStorage.getItem(prefix + track.id));
        if (stored && typeof stored.lyrics === 'string' && Array.isArray(stored.credits)) {
            return { lyrics: stored.lyrics, credits: normalizeCredits(stored.credits),
                splits: normalizeSplits(Array.isArray(stored.splits) ? stored.splits : []), edited: true };
        }
    } catch {
        // The original details still work when browser storage is unavailable.
    }
    return sourceDetails(track);
}

function saveDetails(track, details) {
    try {
        if (details.edited) localStorage.setItem(prefix + track.id, JSON.stringify(details));
        else localStorage.removeItem(prefix + track.id);
        sessionDetails.delete(track.id);
        return true;
    } catch {
        sessionDetails.set(track.id, details);
        return false;
    }
}

export function parseLyrics(source) {
    const explicitOffset = source.match(/^\[offset:([+-]?\d+)\]/im);
    const offset = explicitOffset ? Number(explicitOffset[1]) / 1000 : 0;
    const stamp = /\[(\d+):([0-5]\d(?:[.:]\d{1,3})?)\]/g;
    const meta = /^\[[a-z]+:[^\]]*\]\s*$/i;
    const plain = [];
    const timed = [];
    for (const input of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
        if (meta.test(input)) continue;
        const times = [...input.matchAll(stamp)];
        const line = input.replace(stamp, '').trimEnd();
        plain.push(line);
        for (const [, minutes, seconds] of times) {
            const time = Number(minutes) * 60 + Number(seconds.replace(':', '.')) + offset;
            if (Number.isFinite(time)) timed.push({ time: Math.max(time, 0), line });
        }
    }
    timed.sort((first, second) => first.time - second.time);
    return { timed, plain: plain.join('\n').trim() };
}

export function parseCredits(source) {
    const text = source.replace(/^\uFEFF/, '').trim();
    if (!text) return [];
    if (text.startsWith('{') || text.startsWith('[')) {
        const data = JSON.parse(text);
        const items = Array.isArray(data) ? data : Object.entries(data).map(([role, names]) => ({ role, names }));
        return normalizeCredits(items.map(item => ({ role: item?.role, names: item?.names ?? item?.name })));
    }
    const textRows = text.split(/\r?\n/).flatMap(line => {
        const match = line.match(/^\s*([^:;,\t]+?)\s*[:;,\t]\s*(.*?)\s*$/);
        if (!match || /^role$/i.test(match[1])) return [];
        return [{ role: match[1].replace(/^"|"$/g, ''), names: match[2].replace(/^"|"$/g, '').replaceAll('""', '"') }];
    });
    return normalizeCredits(textRows);
}

function splitChart(splits) {
    const panel = node('div', 'nfg-jukebox-split-view');
    panel.append(node('h4', '', 'Publisher payees & splits'));
    const company = getNfgProfile()?.publishingCompany?.trim();
    const profile = node('p', 'nfg-jukebox-publisher', company ? `Publishing company · ${company}` : 'Add your publishing company in your NFG profile.');
    const editProfile = node('a', 'nfg-jukebox-profile-link', 'Edit NFG profile');
    editProfile.href = '#profile';
    panel.append(profile, editProfile);
    if (!splits.length) {
        panel.append(node('p', 'nfg-jukebox-empty', 'No publisher payees or shares entered for this track.'));
        return panel;
    }
    const chart = node('div', 'nfg-jukebox-pie-layout');
    const pie = node('div', 'nfg-jukebox-pie');
    pie.setAttribute('aria-hidden', 'true');
    const legend = node('ul', 'nfg-jukebox-pie-legend');
    let used = 0;
    const segments = [];
    function slice(name, role, points, color) {
        const from = used;
        used += points;
        if (points) segments.push(`${color} ${from / 100}% ${used / 100}%`);
        const item = node('li');
        const swatch = node('span', 'nfg-jukebox-swatch');
        swatch.style.backgroundColor = color;
        swatch.setAttribute('aria-hidden', 'true');
        const label = node('span', 'nfg-jukebox-payee', name);
        if (role) label.append(node('small', '', role));
        item.append(swatch, label, node('strong', '', `${percentage.format(points / 100)}%`));
        legend.append(item);
    }
    splits.forEach(({ payee, role, points }, index) => slice(payee, role, points, pieColors[index % pieColors.length]));
    if (used < 10000) slice('Unassigned', '', 10000 - used, unassignedColor);
    pie.style.backgroundImage = `conic-gradient(${segments.join(', ')})`;
    chart.append(pie, legend);
    panel.append(chart);
    return panel;
}

function splitEditor() {
    const editor = node('fieldset', 'nfg-jukebox-split-editor');
    const rows = node('div', 'nfg-jukebox-split-rows');
    const add = action('Add publisher payee');
    const fields = [];
    const help = node('p', 'nfg-listening-rule', 'Enter shares up to 100% total. Any remainder stays unassigned.');
    editor.append(node('legend', '', 'Publisher payees & splits'), help, rows, add);

    function addRow(split = {}) {
        const row = node('div', 'nfg-jukebox-split-row');
        const payee = node('input');
        payee.type = 'text';
        payee.value = split.payee || '';
        const role = node('input');
        role.type = 'text';
        role.value = split.role || '';
        const share = node('input');
        share.type = 'number';
        share.inputMode = 'decimal';
        share.min = 0;
        share.max = 100;
        share.step = .01;
        share.value = split.points === undefined ? '' : String(split.points / 100);
        const item = { payee, role, share };
        const remove = action('Remove');
        remove.setAttribute('aria-label', 'Remove publisher payee row');
        remove.addEventListener('click', () => {
            fields.splice(fields.indexOf(item), 1);
            row.remove();
            add.focus();
        });
        row.append(field('Payee or publisher', payee), field('Credit role (optional)', role), field('Share (%)', share), remove);
        fields.push(item);
        rows.append(row);
        return payee;
    }

    add.addEventListener('click', () => addRow().focus());
    return {
        editor,
        load(splits) {
            fields.length = 0;
            rows.replaceChildren();
            splits.forEach(addRow);
        },
        collect() {
            const splits = [];
            let total = 0;
            for (const row of fields) {
                const [payee, role, share] = [row.payee.value.trim(), row.role.value.trim(), row.share.value];
                if (!payee && !role && share === '') continue;
                if (!payee || share === '') {
                    (payee ? row.share : row.payee).focus();
                    throw new Error('Enter a payee and share for each split.');
                }
                const points = Math.round(Number(share) * 100);
                if (!Number.isFinite(points) || points < 0 || points > 10000) {
                    row.share.focus();
                    throw new Error('Each payee share must be between 0% and 100%.');
                }
                total += points;
                if (total > 10000) {
                    row.share.focus();
                    throw new Error('Combined shares cannot exceed 100%.');
                }
                splits.push({ payee, role, points });
            }
            return splits;
        },
    };
}

function openEditor(track, current, update) {
    const dialog = node('dialog', 'nfg-jukebox-dialog');
    const heading = node('h3', '', `Edit track details for ${track.title}`);
    heading.id = 'nfg-jukebox-editor-title';
    dialog.setAttribute('aria-labelledby', heading.id);
    const close = action('Close');
    close.addEventListener('click', () => dialog.close());
    const header = node('div', 'nfg-jukebox-editor-head');
    header.append(heading, close);
    const form = node('form', 'nfg-jukebox-editor');
    const editorGrid = node('div', 'nfg-jukebox-editor-grid');
    const lyricEditor = node('div', 'nfg-jukebox-pane');
    const creditEditor = node('div', 'nfg-jukebox-pane');
    const lyrics = node('textarea');
    lyrics.rows = 9;
    lyrics.value = current.lyrics;
    lyrics.placeholder = 'Paste lyrics or LRC timestamps';
    const lyricFile = node('input');
    lyricFile.type = 'file';
    lyricFile.accept = '.lrc,.txt,text/plain';
    lyricEditor.append(field('Lyrics', lyrics), field('Upload lyrics (.lrc or .txt)', lyricFile));

    const roleList = node('div', 'nfg-jukebox-credit-rows');
    const roleFields = [];
    const addRole = action('Add custom role');
    const importText = node('textarea');
    importText.rows = 3;
    importText.placeholder = 'Role: Name';
    const importButton = action('Import pasted credits');
    const creditFile = node('input');
    creditFile.type = 'file';
    creditFile.accept = '.json,.csv,.tsv,.txt,application/json,text/plain,text/csv';
    const status = node('p', 'nfg-music-feedback');
    status.setAttribute('role', 'status');
    const payees = splitEditor();
    payees.load(current.splits);

    function addRoleField(role = '', names = '', standard = false) {
        const row = node('div', 'nfg-jukebox-credit-row');
        const input = node('input');
        input.type = 'text';
        input.value = names;
        const item = { role, input };
        if (standard) row.append(field(role, input));
        else {
            const name = node('input');
            name.type = 'text';
            name.value = role;
            item.name = name;
            const remove = action('Remove');
            remove.addEventListener('click', () => {
                roleFields.splice(roleFields.indexOf(item), 1);
                row.remove();
                addRole.focus();
            });
            row.append(field('Role', name), field('Name(s)', input), remove);
        }
        roleFields.push(item);
        roleList.append(row);
        return item;
    }

    function showRoles(credits) {
        roleList.replaceChildren();
        roleFields.length = 0;
        for (const role of standardRoles) addRoleField(role, credits.find(row => row.role === role)?.names, true);
        for (const { role, names } of credits.filter(row => !standardRoles.includes(row.role))) addRoleField(role, names);
    }

    const collectRoles = () => normalizeCredits(roleFields.map(({ role, name, input }) => ({
        role: name ? name.value : role,
        names: input.value,
    })));

    function importCredits(value) {
        try {
            const imported = parseCredits(value);
            if (!imported.length) {
                status.textContent = 'Use “Role: Name” on each line or upload a CSV or JSON credit list.';
                return;
            }
            showRoles(normalizeCredits([...collectRoles(), ...imported]));
            status.textContent = 'Credits added to the editor. Save to apply them.';
        } catch {
            status.textContent = 'The credit data could not be read.';
        }
    }

    async function readFile(input, apply) {
        const file = input.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            if (dialog.open) apply(text);
        } catch {
            status.textContent = 'The uploaded file could not be read.';
        }
    }

    showRoles(current.credits);
    addRole.addEventListener('click', () => addRoleField().name.focus());
    lyricFile.addEventListener('change', () => readFile(lyricFile, text => { lyrics.value = text; }));
    importButton.addEventListener('click', () => importCredits(importText.value));
    creditFile.addEventListener('change', () => readFile(creditFile, importCredits));
    creditEditor.append(roleList, addRole);
    const bulk = node('details', 'nfg-jukebox-import');
    bulk.append(node('summary', '', 'Import credits'), field('Paste credits', importText), importButton,
        field('Upload credits (.txt, .csv or .json)', creditFile));
    creditEditor.append(bulk);
    editorGrid.append(lyricEditor, creditEditor);

    const save = action('Save details');
    save.type = 'submit';
    save.classList.add('nfg-track-play');
    const reset = action('Restore source details');
    reset.addEventListener('click', () => {
        const source = sourceDetails(track);
        lyrics.value = source.lyrics;
        showRoles(source.credits);
        payees.load(source.splits);
        status.textContent = 'Source details restored in the editor. Save to apply them.';
    });
    const footer = node('div', 'nfg-jukebox-editor-footer');
    footer.append(save, reset, node('p', 'nfg-listening-rule', 'Edits stay in this browser.'));
    form.append(editorGrid, payees.editor, footer, status);
    form.addEventListener('submit', event => {
        event.preventDefault();
        let splits;
        try {
            splits = payees.collect();
        } catch (error) {
            status.textContent = error.message;
            return;
        }
        const details = { lyrics: lyrics.value.trim(), credits: collectRoles(), splits, edited: true };
        const source = sourceDetails(track);
        if (!splits.length && source.lyrics === details.lyrics && JSON.stringify(source.credits) === JSON.stringify(details.credits)) {
            details.edited = false;
        }
        const persisted = saveDetails(track, details);
        dialog.close();
        update(details, persisted);
    });
    dialog.append(header, form);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    document.body.append(dialog);
    dialog.showModal();
}

export function mountTrackDetails() {
    const element = node('section', 'nfg-jukebox-details');
    element.setAttribute('aria-label', 'Track lyrics, credits and publishing splits');
    const bar = node('div', 'nfg-jukebox-detail-bar');
    const tabs = node('div', 'nfg-jukebox-tabs');
    const lyricTab = action('Lyrics');
    const creditTab = action('Credits');
    const splitTab = action('Splits');
    const edit = action('Edit track details');
    tabs.append(lyricTab, creditTab, splitTab);
    const follow = node('input');
    follow.type = 'checkbox';
    follow.checked = true;
    const follower = node('label', 'nfg-jukebox-follow');
    follower.append(follow, 'Follow playback');
    bar.append(tabs, follower);
    const content = node('div', 'nfg-jukebox-scroll');
    content.setAttribute('role', 'region');
    content.tabIndex = 0;
    const foot = node('div', 'nfg-jukebox-detail-foot');
    const status = node('p', 'nfg-music-feedback');
    status.setAttribute('role', 'status');
    foot.append(edit, status);
    element.append(bar, content, foot);

    let view = 'lyrics';
    let track;
    let audio;
    let details;
    let timed = [];
    let lines = [];
    let active = -1;

    function advance() {
        if (!audio || !follow.checked || view === 'splits') return;
        if (view === 'lyrics' && timed.length) {
            const index = timed.findLastIndex(row => row.time <= audio.currentTime);
            if (index === active) return;
            lines[active]?.removeAttribute('aria-current');
            active = index;
            if (active < 0) {
                content.scrollTop = 0;
                return;
            }
            const line = lines[active];
            line.setAttribute('aria-current', 'true');
            content.scrollTop = line.offsetTop - Math.max(0, (content.clientHeight - line.offsetHeight) / 2);
        } else if (Number.isFinite(audio.duration) && audio.duration > 0) {
            content.scrollTop = (content.scrollHeight - content.clientHeight) * audio.currentTime / audio.duration;
        }
    }

    function render() {
        lyricTab.setAttribute('aria-pressed', String(view === 'lyrics'));
        creditTab.setAttribute('aria-pressed', String(view === 'credits'));
        splitTab.setAttribute('aria-pressed', String(view === 'splits'));
        follower.hidden = view === 'splits';
        const paneTitle = { lyrics: 'Lyrics', credits: 'Credits', splits: 'Publisher payees and splits' };
        content.setAttribute('aria-label', paneTitle[view]);
        content.replaceChildren();
        content.scrollTop = 0;
        active = -1;
        if (!details) return;
        if (view === 'lyrics') {
            const lyrics = parseLyrics(details.lyrics);
            timed = lyrics.timed;
            lines = [];
            if (timed.length) {
                const list = node('div', 'nfg-jukebox-lyrics');
                lines = timed.map(row => node('p', 'nfg-jukebox-lyric-line', row.line));
                list.append(...lines);
                content.append(list);
            } else if (lyrics.plain) content.append(node('p', 'nfg-jukebox-plain-lyrics', lyrics.plain));
            else content.append(node('p', 'nfg-jukebox-empty', 'No lyrics loaded for this track.'));
        } else if (view === 'splits') content.append(splitChart(details.splits));
        else if (details.credits.length) {
            const list = node('dl', 'nfg-jukebox-credits');
            for (const { role, names } of details.credits) {
                const pair = node('div');
                pair.append(node('dt', '', role), node('dd', '', names));
                list.append(pair);
            }
            content.append(list);
        } else content.append(node('p', 'nfg-jukebox-empty', 'No credits loaded for this track.'));
        advance();
    }

    lyricTab.addEventListener('click', () => { view = 'lyrics'; render(); });
    creditTab.addEventListener('click', () => { view = 'credits'; render(); });
    splitTab.addEventListener('click', () => { view = 'splits'; render(); });
    follow.addEventListener('change', () => { active = -1; advance(); });
    const stopFollowing = () => { follow.checked = false; };
    content.addEventListener('wheel', stopFollowing, { passive: true });
    content.addEventListener('touchstart', stopFollowing, { passive: true });
    content.addEventListener('keydown', event => {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stopFollowing();
    });
    edit.addEventListener('click', () => {
        if (!track) return;
        const openedTrack = track;
        openEditor(openedTrack, details, (saved, persisted) => {
            if (track !== openedTrack) return;
            details = saved;
            status.textContent = persisted ? 'Details saved.' : 'Saved for this visit. Browser storage is unavailable.';
            render();
        });
    });
    return {
        element,
        show(newTrack, player, signal) {
            track = newTrack;
            audio = player;
            details = loadDetails(track);
            status.textContent = details.edited ? 'Edited in this browser' : '';
            player?.addEventListener('timeupdate', advance, { signal });
            player?.addEventListener('seeked', advance, { signal });
            player?.addEventListener('loadedmetadata', advance, { signal });
            window.addEventListener('nfg-profile-change', () => { if (view === 'splits') render(); }, { signal });
            render();
        },
    };
}
