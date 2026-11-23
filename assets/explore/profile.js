const storageKey = 'nfg-registration-profile-v1';
const fields = [
    ['Display name', 'displayName'], ['Legal name', 'legalName'], ['Artist name', 'artistName'],
    ['Business name', 'company'], ['Publishing company', 'publishingCompany'],
    ['Email', 'email', 'email'], ['Phone', 'phone', 'tel'], ['Street address', 'address'],
    ['City', 'city'], ['State or region', 'region'], ['Postal code', 'postalCode'], ['Country', 'country'],
];
const empty = Object.fromEntries(fields.map(([, name]) => [name, '']));
let sessionProfile;

function clean(value) {
    return typeof value === 'string' ? value.trim().slice(0, 160) : '';
}

function normalize(value) {
    return Object.fromEntries(fields.map(([, name]) => [name, clean(value?.[name])]));
}

export function getNfgProfile() {
    if (sessionProfile) return { ...sessionProfile };
    try {
        const data = localStorage.getItem(storageKey);
        return data ? normalize(JSON.parse(data)) : { ...empty };
    } catch {
        return { ...empty };
    }
}

function writeProfile(value) {
    const profile = normalize(value);
    let stored = false;
    try {
        localStorage.setItem(storageKey, JSON.stringify(profile));
        sessionProfile = undefined;
        stored = true;
    } catch {
        sessionProfile = profile;
    }
    window.dispatchEvent(new CustomEvent('nfg-profile-change', { detail: profile }));
    return stored;
}

window.addEventListener('storage', event => {
    if (event.key !== storageKey) return;
    sessionProfile = undefined;
    window.dispatchEvent(new CustomEvent('nfg-profile-change', { detail: getNfgProfile() }));
});

function inputField(label, name, type, profile) {
    const field = document.createElement('label');
    const title = document.createElement('span');
    const input = document.createElement('input');
    title.textContent = label;
    input.name = name;
    input.type = type || 'text';
    input.maxLength = 160;
    input.value = profile[name];
    field.append(title, input);
    return { field, input };
}

export function mountProfile(container) {
    const form = document.createElement('form');
    form.className = 'nfg-profile-form';
    const intro = document.createElement('p');
    intro.textContent = 'Use the same details in signup worksheets, shop orders and the Jukebox payee breakdown.';
    const profile = getNfgProfile();
    const fieldGrid = document.createElement('div');
    fieldGrid.className = 'nfg-profile-fields';
    const inputs = new Map();
    for (const [label, name, type] of fields) {
        const { field, input } = inputField(label, name, type, profile);
        inputs.set(name, input);
        fieldGrid.append(field);
    }
    const controls = document.createElement('div');
    controls.className = 'nfg-profile-actions';
    const save = document.createElement('button');
    save.type = 'submit';
    save.textContent = 'Save profile';
    const jukebox = document.createElement('a');
    jukebox.href = '#enjoy-music';
    jukebox.textContent = 'Open Jukebox ↗';
    controls.append(save, jukebox);
    const message = document.createElement('p');
    message.setAttribute('role', 'status');
    const detail = document.createElement('small');
    detail.textContent = 'Profile edits are saved in this browser.';
    const source = document.createElement('details');
    source.className = 'nfg-profile-import';
    const sourceHeading = document.createElement('summary');
    sourceHeading.textContent = 'Use your existing NFG profile';
    const sourceSteps = document.createElement('p');
    sourceSteps.textContent = 'In your existing profile, open Forms & signups → The MLC → Download worksheet.';
    const original = document.createElement('a');
    original.href = 'https://nfg-red-day-profile.mrdeyomusic.chatgpt.site/';
    original.target = '_blank';
    original.rel = 'noopener';
    original.textContent = 'Open the original NFG profile ↗';
    const fileField = document.createElement('label');
    const fileLabel = document.createElement('span');
    fileLabel.textContent = 'Import publisher from worksheet';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = '.txt,text/plain';
    fileField.append(fileLabel, file);
    source.append(sourceHeading, sourceSteps, original, fileField);
    form.append(intro, fieldGrid, controls, detail, source, message);
    file.addEventListener('change', async () => {
        const worksheet = file.files?.[0];
        if (!worksheet) return;
        try {
            if (worksheet.size > 262144) throw new Error();
            const contents = await worksheet.text();
            const row = contents.match(/^\s*Publisher\s*\/\s*administrator\s*:\s*([^\r\n]+)/im);
            const name = clean(row?.[1]);
            if (!name || /^[-—–]+$/.test(name)) throw new Error();
            inputs.get('publishingCompany').value = name;
            message.textContent = 'Publisher imported. Save the profile to use it in the Jukebox.';
        } catch {
            message.textContent = 'Choose an NFG MLC worksheet with a publisher filled in.';
        } finally {
            file.value = '';
        }
    });
    form.addEventListener('submit', event => {
        event.preventDefault();
        const stored = writeProfile(Object.fromEntries(Array.from(inputs, ([name, input]) => [name, input.value])));
        message.textContent = stored ? 'Profile saved.' : 'Saved for this visit. Browser storage is unavailable.';
    });
    container.replaceChildren(form);
}
