import { getNfgProfile } from './profile.js';
import { models } from './models.js';

const CONTACT = 'mrdeyomusic@gmail.com';
const DRAFT_PREFIX = 'nfg-form-draft-v1:';

const providers = {
    ascap: {
        name: 'ASCAP', url: 'https://www.ascap.com/join',
        roles: ['Writer', 'Publisher', 'Writer and publisher'],
        guidance: 'Choose a writer or publisher application on the ASCAP site. Have the names you use for your music business ready.',
    },
    bmi: {
        name: 'BMI', url: 'https://www.bmi.com/join',
        roles: ['Songwriter or composer', 'Publisher'],
        guidance: 'BMI requests a valid email for writers and proposed business names for publishers. U.S. and international publishers use different application paths.',
    },
    sesac: {
        name: 'SESAC', url: 'https://www.sesac.com/frequently-asked-questions/',
        roles: ['Writer', 'Publisher working with a SESAC writer'],
        guidance: 'Creator affiliation is by invitation. Publishers working with a SESAC writer can follow the publisher-account directions in the official FAQ.',
    },
    mlc: {
        name: 'The MLC', url: 'https://www.themlc.com/get-started',
        roles: ['Self-administered songwriter', 'Publisher or administrator', 'Songwriter Hub user'],
        guidance: 'Start with a portal account. Self-administered writers and publishers can follow the member path. Writers with a publisher can use the Songwriter Hub.',
    },
    hfa: {
        name: 'Harry Fox Agency', url: 'https://help.harryfox.com/how-to-become-an-hfa-publisher-affiliate',
        roles: ['Self-administered publisher'],
        guidance: 'Review HFA’s publisher affiliation steps before applying. Check who administers your publishing and have your publishing entity details ready.',
    },
    'music-reports': {
        name: 'Music Reports', url: 'https://publishing.musicreports.com/faq/',
        roles: ['Self-published writer', 'Publisher or administrator'],
        guidance: 'Music Reports explains how to create a publisher account and supply a catalog. Prepare your publisher mailing address and contact details.',
    },
    soundexchange: {
        name: 'SoundExchange', url: 'https://www.soundexchange.com/register/',
        roles: ['Featured recording artist', 'Sound recording rights owner', 'Both artist and rights owner', 'Authorized representative'],
        guidance: 'Choose the recording artist or rights-owner role and prepare the contact and artist details. Follow the portal’s identity and payment setup.',
    },
    'soundexchange-direct': {
        name: 'SoundExchange Direct', url: 'https://www.soundexchange.com/register/',
        roles: ['Featured recording artist', 'Sound recording rights owner', 'Both artist and rights owner'],
        guidance: 'Start with SoundExchange registration. Registered creators use SoundExchange Direct to claim recordings and manage their account.',
    },
    tunecore: {
        name: 'TuneCore', url: 'https://support.tunecore.com/hc/en-us/articles/115006689908-How-do-I-create-a-new-TuneCore-account',
        roles: ['Artist', 'Label or account manager'],
        guidance: 'Create and verify your TuneCore account. Artist and release metadata are entered when you add a release.',
        fields: ['displayName', 'email', 'artistName', 'company', 'country'],
    },
    songtrust: {
        name: 'Songtrust', url: 'https://app.songtrust.com/signup',
        roles: ['Songwriter', 'Publisher or administrator'],
        guidance: 'Have your account contact details ready. Review the official registration terms before adding your catalog.',
    },
    songfile: {
        name: 'Songfile', url: 'https://help.harryfox.com/how-do-i-use-songfile',
        roles: ['Cover recording licensee'],
        guidance: 'Use Songfile for eligible limited-quantity mechanical licenses. Have the song, your recording format, and the number of copies or streams ready.',
    },
    aimp: {
        name: 'AIMP', url: 'https://aimp.org/become-a-member/',
        roles: ['Individual member', 'Company member'],
        guidance: 'Review local chapter options and membership categories. AIMP directs corporate membership inquiries to chapter administrators.',
    },
    soundcloud: {
        name: 'SoundCloud', url: 'https://help.soundcloud.com/hc/en-us/articles/115003569608-Creating-an-account-on-SoundCloud',
        roles: ['Artist', 'Listener'],
        guidance: 'Use an email or a supported sign-in option to create your account. Set your display name and follow SoundCloud’s verification steps.',
        fields: ['displayName', 'email', 'artistName', 'country'],
    },
    spotify: {
        name: 'Spotify for Artists', url: 'https://artists.spotify.com/get-started',
        roles: ['Artist', 'Artist team'],
        guidance: 'Use your artist profile link or URI to claim the profile. Have your distribution and team details handy.',
        fields: ['displayName', 'email', 'artistName', 'company'],
    },
    apple: {
        name: 'Apple Music for Artists', url: 'https://artists.apple.com/support/1101-claim-your-account',
        roles: ['Artist', 'Artist manager', 'Label representative'],
        guidance: 'Follow the artist page claim steps. Label representatives can coordinate access with the artist.',
        fields: ['displayName', 'email', 'artistName', 'company'],
    },
};

const aliases = {
    'the-mlc': 'mlc',
    'mechanical-licensing-collective': 'mlc',
    'harry-fox-agency': 'hfa',
    'harry-fox-agency-hfa': 'hfa',
    'sound-exchange': 'soundexchange',
    'music-reports-inc': 'music-reports',
    'tune-core': 'tunecore',
    'spotify-for-artists': 'spotify',
    'apple-music-for-artists': 'apple',
};

const fields = {
    legalName: ['Legal name', 'text', 'name'],
    displayName: ['Contact name', 'text', 'name'],
    email: ['Email', 'email', 'email'],
    artistName: ['Artist name', 'text', 'nickname'],
    publishingCompany: ['Publishing company', 'text', 'organization'],
    company: ['Company or label', 'text', 'organization'],
    phone: ['Phone', 'tel', 'tel'],
    address: ['Street address', 'text', 'street-address'],
    city: ['City', 'text', 'address-level2'],
    region: ['State or region', 'text', 'address-level1'],
    postalCode: ['Postal code', 'text', 'postal-code'],
    country: ['Country', 'text', 'country-name'],
};
const signupFields = ['legalName', 'email', 'artistName', 'publishingCompany', 'company',
    'phone', 'address', 'city', 'region', 'postalCode', 'country'];
const orderFields = ['displayName', 'email', 'company', 'phone', 'address', 'city', 'region', 'postalCode', 'country'];
const shippingFields = ['phone', 'address', 'city', 'region', 'postalCode', 'country'];

function clean(value, max = 160) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function decode(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function slug(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function getSignupProvider(item) {
    const key = slug(clean(decode(item ?? ''))).replace(/^logo-/, '');
    const canonical = Object.hasOwn(aliases, key) ? aliases[key] : key;
    return Object.hasOwn(providers, canonical) ? providers[canonical] : undefined;
}

function itemDetails(item) {
    if (typeof item === 'string') {
        const title = clean(decode(item));
        const model = models.find(entry => entry.id === title);
        return model ? { id: model.id, title: model.title } : { title };
    }
    return item && typeof item === 'object' ? item : {};
}

function localDraft(key) {
    try {
        const saved = JSON.parse(localStorage.getItem(key) || '{}');
        return saved && typeof saved === 'object' ? saved : {};
    } catch {
        return {};
    }
}

function element(tag, className, text) {
    const entry = document.createElement(tag);
    if (className) entry.className = className;
    if (text) entry.textContent = text;
    return entry;
}

function field(label, input) {
    const wrapper = element('label', 'nfg-form-field');
    wrapper.append(element('span', null, label), input);
    return wrapper;
}

function button(text, type = 'button') {
    const control = element('button', 'nfg-form-button', text);
    control.type = type;
    return control;
}

function externalLink(text, url) {
    const link = element('a', 'nfg-form-button nfg-form-primary', text);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
}

function checkoutUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch {
        return '';
    }
}

function encode(value) {
    return encodeURIComponent(value.toWellFormed());
}

function downloadDraft(name, content) {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function mountNfgForm(container, { kind = 'signup', item = '' } = {}) {
    const signup = kind === 'signup';
    const record = itemDetails(item);
    const provider = signup && getSignupProvider(record.provider || record.id || record.title);
    const title = provider?.name || clean(record.title) || (signup ? 'Company signup' : 'NFG shop item');
    const key = DRAFT_PREFIX + kind + ':' + encode(provider?.name || clean(record.id) || title);
    const saved = localDraft(key);
    const includes = signup ? provider?.fields || signupFields : orderFields;
    const profile = () => getNfgProfile() || {};
    const form = element('form', 'nfg-draft-form');
    const heading = element('h3', 'nfg-form-title', signup ? `${title} signup draft` : title);
    const intro = element('p', 'nfg-form-copy', signup
        ? 'Review your profile details and keep a local worksheet for the official application.'
        : 'Review the item and quantity, then request availability and pricing from NFG.');
    const grid = element('div', 'nfg-form-grid');
    const inputs = new Map();
    form.append(heading, intro);

    if (provider?.guidance) {
        form.append(element('p', 'nfg-form-guidance', provider.guidance));
    }
    if (provider?.roles?.length) {
        const select = document.createElement('select');
        select.name = 'role';
        for (const role of ['', ...provider.roles]) {
            const option = element('option', null, role || 'Choose a role');
            option.value = role;
            select.append(option);
        }
        select.value = provider.roles.includes(saved.role) ? saved.role : '';
        inputs.set('role', ['Application role', select]);
        grid.append(field('Application role', select));
    }
    if (!signup) {
        const quantity = document.createElement('input');
        quantity.name = 'quantity';
        quantity.type = 'number';
        quantity.min = '1';
        quantity.max = '999';
        quantity.step = '1';
        quantity.required = true;
        quantity.value = String(saved.quantity || record.quantity || 1);
        inputs.set('quantity', ['Quantity', quantity]);
        grid.append(field('Quantity', quantity));
    }

    function autofill(useSaved = false) {
        const data = profile();
        for (const name of includes) {
            const [, input] = inputs.get(name);
            const current = name === 'displayName' ? data.displayName || data.legalName : data[name];
            input.value = useSaved && typeof saved[name] === 'string' ? clean(saved[name]) : clean(current);
        }
    }

    for (const name of includes) {
        const [label, type, complete] = fields[name];
        const input = document.createElement('input');
        input.name = name;
        input.type = type;
        input.autocomplete = complete;
        input.maxLength = 160;
        inputs.set(name, [label, input]);
        grid.append(field(label, input));
    }
    autofill(true);

    const notes = document.createElement('textarea');
    notes.name = 'notes';
    notes.rows = 3;
    notes.maxLength = 600;
    notes.value = clean(saved.notes, 600);
    inputs.set('notes', ['Notes', notes]);
    const notesField = field(signup ? 'Notes for your application' : 'Order notes', notes);
    form.append(grid, notesField);

    const actions = element('div', 'nfg-form-actions');
    const save = button('Save draft', 'submit');
    save.classList.add('nfg-form-primary');
    const download = button('Download draft');
    const reset = button('Use current profile');
    const clear = button('Clear saved draft');
    const editProfile = element('a', 'nfg-form-inline', 'Edit NFG profile');
    editProfile.href = '#profile';
    actions.append(save, download, reset, clear, editProfile);
    form.append(actions);

    const feedback = element('p', 'nfg-form-feedback');
    feedback.setAttribute('role', 'status');
    const localCopy = element('small', 'nfg-form-local', 'Saved drafts stay in this browser.');
    form.append(feedback, localCopy);

    function values() {
        return Object.fromEntries([...inputs].map(([name, [, control]]) => [name, clean(control.value, name === 'notes' ? 600 : 160)]));
    }

    function draftText(data, shareShipping = true) {
        const headingLines = signup
            ? ['NFG signup worksheet', `Organization: ${title}`]
            : ['NFG order request', `Item: ${title}`];
        const lines = [...inputs].filter(([name]) => (shareShipping || !shippingFields.includes(name)) && data[name])
            .map(([name, [label]]) => `${label}: ${data[name]}`);
        return [...headingLines, '', ...lines].join('\n');
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        try {
            localStorage.setItem(key, JSON.stringify(values()));
            feedback.textContent = 'Draft saved in this browser.';
        } catch {
            feedback.textContent = 'This browser could not save the draft. Download a copy to keep it.';
        }
    });
    reset.addEventListener('click', () => {
        autofill();
        feedback.textContent = 'Updated the contact fields from your NFG profile.';
    });
    clear.addEventListener('click', () => {
        try {
            localStorage.removeItem(key);
            autofill();
            notes.value = '';
            if (inputs.has('role')) inputs.get('role')[1].value = '';
            if (inputs.has('quantity')) inputs.get('quantity')[1].value = '1';
            feedback.textContent = 'Saved draft cleared.';
        } catch {
            feedback.textContent = 'This browser could not clear the saved draft.';
        }
    });
    download.addEventListener('click', () => {
        downloadDraft(`nfg-${kind}-${slug(title) || 'draft'}.txt`, draftText(values()));
        feedback.textContent = 'Draft downloaded.';
    });

    if (signup && provider?.url) {
        const finish = element('div', 'nfg-form-next');
        finish.append(externalLink(`Open ${title} official site ↗`, provider.url));
        form.append(finish);
    } else if (!signup) {
        const next = element('div', 'nfg-form-next nfg-order-next');
        const checkout = checkoutUrl(record.checkoutUrl);
        if (checkout) next.append(externalLink('Open seller checkout ↗', checkout));

        const preview = element('pre', 'nfg-order-preview');
        preview.setAttribute('aria-label', 'Email draft preview');
        const shareShipping = document.createElement('input');
        shareShipping.type = 'checkbox';
        const consent = document.createElement('input');
        consent.type = 'checkbox';
        const email = button('Open email draft');
        email.classList.add('nfg-form-primary');
        email.disabled = true;

        function updateEmail() {
            preview.textContent = draftText(values(), shareShipping.checked);
            email.disabled = !consent.checked;
        }

        form.addEventListener('input', event => {
            if (event.target !== consent) consent.checked = false;
            updateEmail();
        });
        for (const control of [reset, clear]) {
            control.addEventListener('click', () => {
                consent.checked = false;
                updateEmail();
            });
        }
        email.addEventListener('click', () => {
            if (!consent.checked || !form.reportValidity()) return;
            const draft = document.createElement('a');
            const subject = `NFG order request · ${title.replace(/[\r\n]+/g, ' ')}`;
            draft.href = `mailto:${CONTACT}?subject=${encode(subject)}&body=${encode(preview.textContent)}`;
            draft.click();
        });

        const include = element('label', 'nfg-form-check');
        include.append(shareShipping, 'Include shipping and phone details in the email');
        const review = element('label', 'nfg-form-check');
        review.append(consent, 'I reviewed the details in this email draft');
        next.append(include, preview, review, email);
        form.append(next);
        updateEmail();
    }

    container.replaceChildren(form);
    return () => form.remove();
}
