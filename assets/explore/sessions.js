import { days } from './lessons.js';

const storageKey = 'nfg-room-sessions-v1';
const roomNames = [
    'Old bedroom', 'Personal care room', 'Game room', 'Business room', 'Studio',
    'Distribution office', 'Collection & marketing', 'Trophy room', 'Future & legacy',
];
const reminderOptions = [[0, 'None'], [5, '5 minutes before'], [15, '15 minutes before'],
    [30, '30 minutes before'], [60, '1 hour before'], [1440, '1 day before']];
const durations = [[15, '15 minutes'], [30, '30 minutes'], [45, '45 minutes'], [60, '1 hour'],
    [90, '1 hour 30 minutes'], [120, '2 hours'], [180, '3 hours']];
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' });
const mounted = new WeakSet();
const minutesMs = 60_000;
const encoder = new TextEncoder();

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function button(className, text, run) {
    const node = element('button', className, text);
    node.type = 'button';
    if (run) node.addEventListener('click', run);
    return node;
}

function link(className, text, href, openTab = false) {
    const node = element('a', className, text);
    node.href = href;
    if (openTab) {
        node.target = '_blank';
        node.rel = 'noopener noreferrer';
    }
    return node;
}

export function parseLocalStart(date, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
    const stamp = new Date(0);
    stamp.setFullYear(year, month - 1, day);
    stamp.setHours(hour, minute, 0, 0);
    return stamp.getFullYear() === year && stamp.getMonth() === month - 1 && stamp.getDate() === day &&
        stamp.getHours() === hour && stamp.getMinutes() === minute ? stamp.getTime() : null;
}

export function validatedZoomURL(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
        const url = new URL(value.trim());
        const hostname = url.hostname.toLowerCase();
        const official = ['zoom.us', 'zoomgov.com'].some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
        const joinPath = /^\/(?:j\/\d{9,11}|wc\/join\/\d{9,11}|my\/[a-z\d._-]+)\/?$/i.test(url.pathname);
        if (url.protocol === 'https:' && !url.username && !url.password && !url.port && official && joinPath) return url.href;
    } catch {
        return null;
    }
    return null;
}

function safeEmail(value) {
    return typeof value === 'string' && (value === '' || /^[^\s@<>,;]+@[a-z\d-]+(?:\.[a-z\d-]+)*$/i.test(value));
}

function pad(number, size = 2) {
    return String(number).padStart(size, '0');
}

function localParts(stamp) {
    const date = new Date(stamp);
    return {
        date: `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
        time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    };
}

function dayName(day) {
    return `Day ${day} · ${days[day].title}`;
}

function eventTitle(session) {
    return `NFG ${dayName(session.day)} · ${roomNames[session.day]}`;
}

function endTime(session) {
    return session.start + session.duration * minutesMs;
}

function describeSession(session) {
    const sections = [`Room: ${roomNames[session.day]}`];
    if (session.zoom) sections.push(`Join Zoom: ${session.zoom}`);
    if (session.note) sections.push(session.note);
    return sections.join('\n\n');
}

function inviteText(session) {
    return [eventTitle(session),
        `${dateFormat.formatRange(new Date(session.start), new Date(endTime(session)))} (${localZone})`,
        describeSession(session)].join('\n\n');
}

function utcTime(stamp) {
    return new Date(stamp).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function icsText(value = '') {
    return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function foldLine(line) {
    let result = '';
    let octets = 0;
    for (const character of line) {
        const size = encoder.encode(character).length;
        if (octets + size > 75) {
            result += '\r\n ';
            octets = 1;
        }
        result += character;
        octets += size;
    }
    return result;
}

function mailAddress(email) {
    return `mailto:${encodeURIComponent(email).replace('%40', '@')}`;
}

export function createCalendarFile(session) {
    const lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Notes For Goats//Room Sessions//EN', 'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT', `UID:${session.id}@notes-for-goats`, `SEQUENCE:${session.sequence || 0}`,
        `DTSTAMP:${utcTime(session.modified)}`, `LAST-MODIFIED:${utcTime(session.modified)}`,
        `DTSTART:${utcTime(session.start)}`, `DTEND:${utcTime(endTime(session))}`,
        `SUMMARY:${icsText(eventTitle(session))}`, `DESCRIPTION:${icsText(describeSession(session))}`,
    ];
    if (session.zoom) lines.push(`LOCATION:${icsText(session.zoom)}`, `URL:${session.zoom}`);
    if (session.reminder > 0) {
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:-PT${session.reminder}M`,
            `DESCRIPTION:${icsText(eventTitle(session))}`, 'END:VALARM');
        if (session.emailAlarm && session.email) {
            lines.push('BEGIN:VALARM', 'ACTION:EMAIL', `TRIGGER:-PT${session.reminder}M`,
                `SUMMARY:${icsText(eventTitle(session))}`, `DESCRIPTION:${icsText(inviteText(session))}`,
                `ATTENDEE:${mailAddress(session.email)}`, 'END:VALARM');
        }
    }
    return lines.concat('END:VEVENT', 'END:VCALENDAR').map(foldLine).join('\r\n') + '\r\n';
}

export function googleCalendarURL(session) {
    const target = new URL('https://calendar.google.com/calendar/render');
    target.searchParams.set('action', 'TEMPLATE');
    target.searchParams.set('text', eventTitle(session));
    target.searchParams.set('dates', `${utcTime(session.start)}/${utcTime(endTime(session))}`);
    target.searchParams.set('details', describeSession(session));
    if (session.zoom) target.searchParams.set('location', session.zoom);
    if (session.email) target.searchParams.set('add', session.email);
    return target.href;
}

function knownDuration(duration) {
    return durations.some(([minutes]) => duration === minutes);
}

function knownReminder(reminder) {
    return reminderOptions.some(([minutes]) => reminder === minutes);
}

function validInstant(stamp) {
    return Number.isFinite(stamp) && new Date(stamp).getUTCFullYear() >= 1 && new Date(stamp).getUTCFullYear() <= 9999;
}

function getSessions() {
    try {
        const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (Array.isArray(value)) return value.filter(entry => entry &&
            typeof entry.id === 'string' && /^[a-z\d-]+$/i.test(entry.id) && days[entry.day] &&
            validInstant(entry.start) && validInstant(endTime(entry)) && validInstant(entry.modified) &&
            knownDuration(entry.duration) && knownReminder(entry.reminder) && typeof entry.zoom === 'string' &&
            validatedZoomURL(entry.zoom) !== null &&
            safeEmail(entry.email) && typeof entry.note === 'string');
    } catch {
        // Storage access can be restricted by browser settings, so keep the editor usable in memory.
    }
    return [];
}

function getPlannedDates() {
    try {
        const value = JSON.parse(localStorage.getItem('nfg-room-planner-v1') || '[]');
        if (Array.isArray(value)) return value.filter(entry => entry && typeof entry.date === 'string' &&
            typeof entry.character === 'string' && days[entry.room] && parseLocalStart(entry.date, '12:00') !== null);
    } catch {
        // The sessions editor also accepts manual dates.
    }
    return [];
}

function selectedDayFromHash(hash) {
    const match = /^#sessions(?:\/([0-8]))?$/.exec(hash);
    return match ? Number(match[1] || 0) : null;
}

function selectControl(options) {
    const select = element('select');
    select.append(...options.map(([value, title]) => {
        const option = element('option', '', title);
        option.value = String(value);
        return option;
    }));
    return select;
}

function wrapField(text, node, wide = false) {
    const label = element('label', `nfg-session-field${wide ? ' nfg-session-wide' : ''}`);
    label.append(element('span', '', text), node);
    return label;
}

function textInput(type) {
    const node = element('input');
    node.type = type;
    return node;
}

function downloadEvent(session) {
    const file = new Blob([createCalendarFile(session)], { type: 'text/calendar;charset=UTF-8' });
    const url = URL.createObjectURL(file);
    const download = link('', '', url);
    download.download = `nfg-day-${session.day}-${localParts(session.start).date}.ics`;
    document.body.append(download);
    download.click();
    download.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function mountSessions(container) {
    if (!container || mounted.has(container)) return;
    mounted.add(container);
    container.classList.add('nfg-sessions');
    let sessions = getSessions();
    let activeId;
    let removed;

    const layout = element('div', 'nfg-session-layout');
    const form = element('form', 'nfg-session-form');
    const formHeading = element('h3', 'nfg-session-heading', 'Schedule a room session');
    const newSession = button('nfg-session-small', 'New session', () => resetForm(true));
    newSession.hidden = true;
    const formHeader = element('div', 'nfg-session-form-header nfg-session-wide');
    formHeader.append(formHeading, newSession);
    const day = selectControl(days.map(item => [item.day, `${dayName(item.day)} · ${roomNames[item.day]}`]));
    const date = textInput('date');
    date.required = true;
    date.min = '0001-01-01';
    date.max = '9999-12-31';
    const start = textInput('time');
    start.required = true;
    const duration = selectControl(durations);
    const zoom = textInput('url');
    zoom.placeholder = 'https://zoom.us/j/…';
    zoom.maxLength = 600;
    const email = textInput('email');
    email.placeholder = 'name@example.com';
    email.maxLength = 254;
    const reminder = selectControl(reminderOptions);
    const emailAlarm = textInput('checkbox');
    const alarmField = element('label', 'nfg-session-checkbox nfg-session-wide');
    alarmField.append(emailAlarm, element('span', '', 'Include an email reminder in the calendar file'));
    const note = element('textarea');
    note.rows = 3;
    note.maxLength = 1400;
    const help = element('p', 'nfg-session-note nfg-session-wide',
        'Save an event, then add it to your calendar for phone alerts. Email alarms depend on the calendar app.');
    const zone = element('p', 'nfg-session-note nfg-session-wide', `Times are entered in ${localZone}. Sessions are saved on this device.`);
    const submit = element('button', 'nfg-session-primary', 'Save session');
    submit.type = 'submit';
    const actions = element('div', 'nfg-session-actions nfg-session-wide');
    actions.append(submit, link('nfg-session-small', 'Schedule in Zoom', 'https://zoom.us/meeting/schedule', true),
        link('nfg-session-small', 'Host now in Zoom', 'https://zoom.us/start/videomeeting', true));

    let plannedDates;
    const planned = element('select');
    const plannedField = wrapField('Use a date from Room Planner', planned, true);
    function refreshPlannedDates() {
        plannedDates = getPlannedDates();
        const choices = selectControl([['', 'Select a planned date'], ...plannedDates.map((item, index) => {
            const name = ({ notes: 'Notes', notas: 'Notas', mentor: 'Mentor', ai: 'AI' })[item.character] || 'Planner';
            return [index, `${name} · Day ${item.room} · ${item.date}`];
        })]);
        planned.replaceChildren(...choices.children);
        plannedField.hidden = plannedDates.length === 0;
    }
    planned.addEventListener('change', () => {
        if (planned.value === '') return;
        const item = plannedDates[Number(planned.value)];
        day.value = String(item.room);
        date.value = item.date;
    });
    form.append(formHeader, wrapField('Room day', day, true), plannedField,
        wrapField('Date', date), wrapField('Start time', start), wrapField('Duration', duration),
        wrapField('Calendar reminder', reminder), wrapField('Zoom join link (optional)', zoom, true),
        wrapField('Email for invite or reminder (optional)', email, true), alarmField,
        wrapField('Invite note (optional)', note, true), zone, help, actions);

    const saved = element('section', 'nfg-session-saved');
    const savedHeading = element('h3', 'nfg-session-heading', 'Saved sessions');
    const savedList = element('div', 'nfg-session-list');
    const share = element('section', 'nfg-session-share');
    share.setAttribute('aria-label', 'Share selected session');
    saved.append(savedHeading, savedList, share);
    layout.append(form, saved);
    const status = element('p', 'nfg-session-status');
    status.setAttribute('role', 'status');
    const undo = button('nfg-session-small', 'Undo remove', () => {
        if (!removed) return;
        sessions.push(removed);
        showForm(removed, true);
        removed = undefined;
        undo.hidden = true;
        renderSaved();
        persist('Session restored.');
    });
    undo.hidden = true;
    const feedback = element('div', 'nfg-session-actions nfg-session-feedback');
    feedback.append(status, undo);
    container.replaceChildren(layout, feedback);

    function persist(message) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(sessions));
            status.textContent = message;
        } catch {
            status.textContent = `${message} The browser could not save this change after the page closes.`;
        }
    }

    function resetValidity(field) {
        field.setCustomValidity('');
    }

    date.addEventListener('input', () => resetValidity(start));
    start.addEventListener('input', () => resetValidity(start));
    zoom.addEventListener('input', () => resetValidity(zoom));
    email.addEventListener('input', () => resetValidity(email));
    emailAlarm.addEventListener('change', () => resetValidity(email));
    reminder.addEventListener('change', () => {
        emailAlarm.disabled = Number(reminder.value) === 0;
        if (emailAlarm.disabled) emailAlarm.checked = false;
        resetValidity(email);
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        const old = sessions.find(item => item.id === activeId);
        const original = old && localParts(old.start);
        const stamp = original?.date === date.value && original.time === start.value
            ? old.start : parseLocalStart(date.value, start.value);
        const timeSpan = Number(duration.value);
        if (stamp === null || !validInstant(stamp + timeSpan * minutesMs)) {
            start.setCustomValidity('Choose a valid local date and time.');
            start.reportValidity();
            return;
        }
        const linkURL = validatedZoomURL(zoom.value);
        if (linkURL === null) {
            zoom.setCustomValidity('Enter a Zoom HTTPS join link, such as https://zoom.us/j/12345678901.');
            zoom.reportValidity();
            return;
        }
        const inviteEmail = email.value.trim();
        if (!safeEmail(inviteEmail) || (emailAlarm.checked && !inviteEmail)) {
            email.setCustomValidity('Enter a valid email address to include an email alarm.');
            email.reportValidity();
            return;
        }
        const session = {
            id: old?.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            sequence: old ? (old.sequence || 0) + 1 : 0, modified: Date.now(), day: Number(day.value),
            start: stamp, duration: timeSpan, zoom: linkURL, email: inviteEmail,
            reminder: Number(reminder.value), emailAlarm: emailAlarm.checked, note: note.value.trim(),
        };
        if (old) sessions = sessions.map(item => item.id === old.id ? session : item);
        else sessions.push(session);
        activeId = session.id;
        showForm(session);
        renderSaved();
        persist(old ? 'Session updated. Export the updated calendar event to apply the change.' : 'Session saved. Choose a calendar or share option.');
    });

    function resetForm(focus = false) {
        activeId = undefined;
        form.reset();
        day.value = String(selectedDayFromHash(window.location.hash) ?? 0);
        duration.value = '60';
        reminder.value = '15';
        emailAlarm.disabled = false;
        for (const field of [start, zoom, email]) resetValidity(field);
        formHeading.textContent = 'Schedule a room session';
        newSession.hidden = true;
        submit.textContent = 'Save session';
        renderSaved();
        if (focus) day.focus();
    }

    function showForm(session, focus = false) {
        activeId = session.id;
        day.value = String(session.day);
        planned.value = '';
        const parts = localParts(session.start);
        date.value = parts.date;
        start.value = parts.time;
        duration.value = String(session.duration);
        zoom.value = session.zoom;
        email.value = session.email;
        reminder.value = String(session.reminder);
        emailAlarm.disabled = session.reminder === 0;
        emailAlarm.checked = Boolean(session.emailAlarm);
        note.value = session.note;
        for (const field of [start, zoom, email]) resetValidity(field);
        formHeading.textContent = 'Edit room session';
        newSession.hidden = false;
        submit.textContent = 'Save changes';
        if (focus) date.focus();
    }

    function renderSaved() {
        const sorted = [...sessions].sort((left, right) => left.start - right.start);
        if (!sorted.length) {
            savedList.replaceChildren(element('p', 'nfg-session-note', 'Choose a room day, date, and time to start.'));
        } else {
            savedList.replaceChildren(...sorted.map(session => {
                const control = button('nfg-session-entry', undefined, () => {
                    showForm(session, true);
                    renderSaved();
                });
                control.style.setProperty('--nfg-session-day-color', days[session.day].color);
                control.setAttribute('aria-pressed', String(session.id === activeId));
                control.append(element('strong', '', dayName(session.day)),
                    element('span', '', dateFormat.format(new Date(session.start))));
                return control;
            }));
        }
        const session = sessions.find(item => item.id === activeId);
        share.hidden = !session;
        if (!session) {
            share.replaceChildren();
            return;
        }
        const heading = element('h4', '', roomNames[session.day]);
        const exportActions = element('div', 'nfg-session-actions');
        const fallBack = element('textarea', 'nfg-session-invite-text');
        fallBack.readOnly = true;
        fallBack.rows = 5;
        fallBack.hidden = true;
        fallBack.setAttribute('aria-label', 'Invitation text');
        exportActions.append(button('nfg-session-small', 'Download calendar file (.ics)', () => downloadEvent(session)),
            link('nfg-session-small', 'Open Google Calendar', googleCalendarURL(session), true),
            button('nfg-session-small', 'Copy invite', async () => {
                const text = inviteText(session);
                try {
                    await navigator.clipboard.writeText(text);
                    status.textContent = 'Invitation copied.';
                } catch {
                    fallBack.value = text;
                    fallBack.hidden = false;
                    fallBack.focus();
                    fallBack.select();
                    status.textContent = 'Select and copy the invitation text.';
                }
            }));
        const mailSubject = encodeURIComponent(eventTitle(session));
        const mailBody = encodeURIComponent(inviteText(session));
        exportActions.append(link('nfg-session-small', 'Compose email invite', `${mailAddress(session.email)}?subject=${mailSubject}&body=${mailBody}`));
        if (session.zoom) exportActions.append(link('nfg-session-small', 'Join Zoom', session.zoom, true));
        const remove = button('nfg-session-remove', 'Remove session', () => {
            removed = session;
            sessions = sessions.filter(item => item.id !== session.id);
            resetForm();
            undo.hidden = false;
            undo.focus();
            persist('Session removed from this device.');
        });
        const calendarHelp = element('p', 'nfg-session-note', 'The calendar file includes your selected reminder. In Google Calendar, check notifications before you save.');
        share.replaceChildren(heading, exportActions, calendarHelp, fallBack, remove);
    }

    window.addEventListener('hashchange', () => {
        const roomDay = selectedDayFromHash(window.location.hash);
        if (roomDay !== null) {
            refreshPlannedDates();
            if (!activeId) day.value = String(roomDay);
        }
    });
    refreshPlannedDates();
    resetForm();
}
