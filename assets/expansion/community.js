// Community requests go to the site worker. Static hosting needs a separately configured API for this feature.
import { getNfgProfile } from '../explore/profile.js';

const ENDPOINT = '/api/community';
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
}

function button(text, type = 'button') {
    const node = element('button', text, 'nfg-community-button');
    node.type = type;
    return node;
}

function projectLink(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch {
        return '';
    }
}

function composer(parentId, post) {
    const form = element('form', null, 'nfg-community-compose');
    const inputs = element('fieldset');
    const name = element('input');
    name.name = 'name';
    name.maxLength = 64;
    name.autocomplete = 'nickname';
    const profile = getNfgProfile() || {};
    name.value = profile.displayName || profile.name || '';
    const body = element('textarea');
    body.name = 'body';
    body.required = true;
    body.maxLength = 1200;
    body.rows = parentId ? 3 : 4;
    const link = element('input');
    link.name = 'link';
    link.type = 'url';
    link.maxLength = 1000;
    link.placeholder = 'https://';
    for (const [label, input] of [
        ['Display name', name],
        [parentId ? 'Reply' : 'Message', body],
        ['Project link (optional)', link],
    ]) {
        const field = element('label');
        field.append(element('span', label), input);
        inputs.append(field);
    }
    const send = button(parentId ? 'Post reply' : 'Publish post', 'submit');
    send.classList.add('nfg-community-primary');
    inputs.append(send);
    form.append(inputs);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const message = body.value.trim();
        const project = link.value.trim();
        if (!message) {
            body.setCustomValidity('Write a message before posting.');
            body.reportValidity();
            return;
        }
        if (project && !projectLink(project)) {
            link.setCustomValidity('Use a public HTTPS project link.');
            link.reportValidity();
            return;
        }
        inputs.disabled = true;
        const saved = await post({
            body: message, name: name.value.trim(), link: projectLink(project), parentId,
        });
        if (saved) {
            body.value = '';
            link.value = '';
        }
        inputs.disabled = false;
    });
    body.addEventListener('input', () => body.setCustomValidity(''));
    link.addEventListener('input', () => link.setCustomValidity(''));
    return { form, inputs };
}

export function mountCommunity(container) {
    const shell = element('div', null, 'nfg-community');
    const access = element('p', 'Posts and links are shared with people who have access to this site.', 'nfg-community-copy');
    const status = element('p', 'Loading discussions…', 'nfg-community-status');
    status.setAttribute('role', 'status');
    const feed = element('ol', null, 'nfg-community-feed');
    feed.setAttribute('aria-label', 'Community discussions');
    const refresh = button('Refresh discussions');
    const requests = new AbortController();
    const topComposer = composer(undefined, post);
    topComposer.form.setAttribute('aria-label', 'New discussion');
    topComposer.inputs.disabled = true;
    let loadSequence = 0;

    const header = element('div', null, 'nfg-community-header');
    header.append(access, refresh);
    shell.append(header, topComposer.form, status, feed);
    container.replaceChildren(shell);

    async function call(path = '', options = {}) {
        return fetch(ENDPOINT + path, { credentials: 'same-origin', signal: requests.signal, ...options });
    }

    function failure(response, fallback) {
        if (response.status === 401 || response.status === 403) return 'Sign in with access to this site to participate.';
        if (response.status === 429) return 'Posting is temporarily limited. Try again in a moment.';
        return fallback;
    }

    async function post(message) {
        status.textContent = message.parentId ? 'Posting reply…' : 'Publishing post…';
        try {
            const response = await call('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message),
            });
            if (response.status !== 201) {
                status.textContent = failure(response, 'The discussion could not be posted. Your draft is still here.');
                return false;
            }
            await load(message.parentId ? 'Reply posted.' : 'Post published.');
            return true;
        } catch (error) {
            if (error.name !== 'AbortError') status.textContent = 'Connection lost. Your draft is still here.';
            return false;
        }
    }

    async function remove(entry, reply, control) {
        if (!window.confirm(reply ? 'Remove this reply?' : 'Remove this discussion and its replies?')) return;
        control.disabled = true;
        try {
            const response = await call('/' + encodeURIComponent(entry.id), { method: 'DELETE' });
            if (response.status === 204) await load('Removed from Community.');
            else status.textContent = failure(response, 'This message could not be removed.');
        } catch (error) {
            if (error.name !== 'AbortError') status.textContent = 'Connection lost. Try removing the message again.';
        } finally {
            control.disabled = false;
        }
    }

    function message(entry, reply = false) {
        const card = element('article', null, reply ? 'nfg-community-reply' : 'nfg-community-post');
        const heading = element('div', null, 'nfg-community-byline');
        heading.append(element('strong', entry.author || 'Community member'));
        const when = new Date(entry.createdAt);
        if (!Number.isNaN(when.getTime())) {
            const time = element('time', dateFormat.format(when));
            time.dateTime = when.toISOString();
            heading.append(time);
        }
        if (entry.canDelete) {
            const erase = button('Remove');
            erase.addEventListener('click', () => remove(entry, reply, erase));
            heading.append(erase);
        }
        card.append(heading, element('p', entry.body || '', 'nfg-community-message'));

        const url = projectLink(entry.link);
        if (url) {
            const link = element('a', 'Open project · ' + new URL(url).hostname + ' ↗', 'nfg-community-link');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            card.append(link);
        }
        if (!reply) {
            const replies = Array.isArray(entry.replies) ? entry.replies : [];
            if (replies.length) {
                const list = element('ol', null, 'nfg-community-replies');
                list.setAttribute('aria-label', 'Replies');
                for (const child of replies) {
                    const row = element('li');
                    row.append(message(child, true));
                    list.append(row);
                }
                card.append(list);
            }
            const write = element('details', null, 'nfg-community-reply-box');
            write.append(element('summary', 'Reply'), composer(String(entry.id), post).form);
            card.append(write);
        }
        return card;
    }

    async function load(success) {
        const request = ++loadSequence;
        refresh.disabled = true;
        try {
            const response = await call();
            if (request !== loadSequence) return;
            if (!response.ok) {
                topComposer.inputs.disabled = true;
                if (response.status === 401 || response.status === 403) feed.replaceChildren();
                status.textContent = failure(response, 'Community could not load. Try refreshing.');
                return;
            }
            const payload = await response.json();
            if (request !== loadSequence) return;
            if (!Array.isArray(payload.posts)) throw new Error('Invalid discussion data');
            const rows = payload.posts.map(entry => {
                const row = element('li');
                row.append(message(entry));
                return row;
            });
            feed.replaceChildren(...rows);
            topComposer.inputs.disabled = false;
            status.textContent = success || (rows.length ? '' : 'Start a discussion or share a project.');
        } catch (error) {
            if (request === loadSequence && error.name !== 'AbortError') {
                status.textContent = 'Community could not load. Try refreshing.';
            }
        } finally {
            if (request === loadSequence) refresh.disabled = false;
        }
    }

    refresh.addEventListener('click', () => load());
    load();
    return () => {
        requests.abort();
        shell.remove();
    };
}
