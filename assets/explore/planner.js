e withimport { days } from './lessons.js';

const storageKey = 'nfg-room-planner-v1';
const characters = [
    { id: 'notes', name: 'Notes' }, { id: 'notas', name: 'Notas' },
    { id: 'mentor', name: 'Mentor' }, { id: 'ai', name: 'AI' },
];
const roomNames = [
    'Old bedroom', 'Personal care room', 'Game room', 'Business room', 'Studio',
    'Distribution office', 'Collection & marketing', 'Trophy room', 'Future & legacy',
];
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dateFormat = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const mounted = new WeakSet();

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function button(className, text, label) {
    const node = element('button', className, text);
    node.type = 'button';
    if (label) node.setAttribute('aria-label', label);
    return node;
}

function dateAt(year, month, day) {
    const date = new Date(0);
    date.setFullYear(year, month, day);
    date.setHours(12, 0, 0, 0);
    return date;
}

function dateKey(date) {
    const year = String(date.getFullYear()).padStart(4, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function fromKey(key) {
    const [year, month, day] = key.split('-').map(Number);
    return dateAt(year, month - 1, day);
}

function isDateKey(key) {
    return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) &&
        !key.startsWith('0000-') && dateKey(fromKey(key)) === key;
}

function firstOfMonth(date) {
    return dateAt(date.getFullYear(), date.getMonth(), 1);
}

function shiftMonth(date, change) {
    const start = dateAt(date.getFullYear(), date.getMonth() + change, 1);
    const last = dateAt(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    return dateAt(start.getFullYear(), start.getMonth(), Math.min(date.getDate(), last));
}

function roomName(index) {
    return `Day ${index} · ${roomNames[index]}`;
}

function loadPlans() {
    try {
        const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (Array.isArray(value)) {
            return value.filter(item => item && typeof item.id === 'string' &&
                characters.some(character => character.id === item.character) &&
                Number.isInteger(item.room) && days[item.room] && isDateKey(item.date))
                .map(item => ({ ...item, completed: item.completed === true }));
        }
    } catch {
        // The planner is also usable in browsers that restrict local storage.
    }
    return [];
}

function actionButton(text, run, label) {
    const node = button('nfg-plan-link', text, label);
    node.addEventListener('click', run);
    return node;
}

export function mountPlanner(container) {
    if (!container || mounted.has(container)) return;
    mounted.add(container);
    container.classList.add('nfg-planner');

    let plans = loadPlans();
    let activeCharacter = characters[0];
    let selectedDate = dateKey(new Date());
    let viewMonth = firstOfMonth(fromKey(selectedDate));
    let editingId = null;
    let removed;

    const characterGroup = element('div', 'nfg-plan-characters');
    characterGroup.setAttribute('role', 'group');
    characterGroup.setAttribute('aria-label', 'Choose a character');
    const characterButtons = characters.map(character => {
        const control = button('nfg-plan-character');
        const image = element('img');
        image.src = `characters/${character.id}.png`;
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        control.append(image, element('span', '', character.name));
        control.addEventListener('click', () => {
            if (character.id === activeCharacter.id) return;
            activeCharacter = character;
            cancelEdit();
            render();
            announce(`Showing ${character.name}’s room days.`);
        });
        return control;
    });
    characterGroup.append(...characterButtons);

    const calendar = element('section', 'nfg-plan-calendar');
    calendar.setAttribute('aria-label', 'Room-day calendar');
    const toolbar = element('div', 'nfg-plan-toolbar');
    const monthHeading = element('h3', 'nfg-plan-month');
    monthHeading.setAttribute('aria-live', 'polite');
    const navigation = element('div', 'nfg-plan-navigation');
    const back = button('nfg-plan-arrow', '‹', 'Previous month');
    const forward = button('nfg-plan-arrow', '›', 'Next month');
    const todayButton = button('nfg-plan-today', 'Today');
    back.addEventListener('click', () => navigateMonth(-1));
    forward.addEventListener('click', () => navigateMonth(1));
    todayButton.addEventListener('click', () => selectDate(dateKey(new Date())));
    navigation.append(back, todayButton, forward);
    toolbar.append(monthHeading, navigation);
    const weekdays = element('div', 'nfg-plan-weekdays');
    weekdays.setAttribute('aria-hidden', 'true');
    weekdays.append(...weekdayLabels.map(day => element('span', '', day)));
    const grid = element('div', 'nfg-plan-grid');
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Calendar dates. Use the arrow keys to change the date.');
    calendar.append(toolbar, weekdays, grid);

    const panel = element('div', 'nfg-plan-panel');
    const form = element('form', 'nfg-plan-form');
    const formHeading = element('h3', '', 'Schedule a room day');
    const roomInput = element('select');
    roomInput.required = true;
    const chooseRoom = element('option', '', 'Select a room day');
    chooseRoom.value = '';
    roomInput.append(chooseRoom, ...days.map(day => {
        const option = element('option', '', roomName(day.day));
        option.value = String(day.day);
        return option;
    }));
    const dateInput = element('input');
    dateInput.type = 'date';
    dateInput.min = '0001-01-01';
    dateInput.max = '9999-12-31';
    dateInput.required = true;
    dateInput.addEventListener('change', () => {
        if (isDateKey(dateInput.value)) selectDate(dateInput.value);
    });
    const roomField = element('label', 'nfg-plan-field');
    roomField.append(element('span', '', 'Room day'), roomInput);
    const dateField = element('label', 'nfg-plan-field');
    dateField.append(element('span', '', 'Date'), dateInput);
    const submit = element('button', 'nfg-plan-submit', 'Add to calendar');
    submit.type = 'submit';
    const cancel = actionButton('Cancel edit', () => {
        cancelEdit();
        roomInput.focus();
    });
    cancel.hidden = true;
    const formActions = element('div', 'nfg-plan-form-actions');
    formActions.append(submit, cancel);
    form.append(formHeading, roomField, dateField, formActions);
    form.addEventListener('submit', saveRoom);

    const agenda = element('section', 'nfg-plan-agenda');
    const agendaHeading = element('h3');
    const planList = element('ul', 'nfg-plan-list');
    const empty = element('p', 'nfg-plan-empty');
    agenda.append(agendaHeading, empty, planList);
    panel.append(form, agenda);
    const layout = element('div', 'nfg-plan-layout');
    layout.append(calendar, panel);
    const announcement = element('p', 'nfg-plan-announcement');
    announcement.setAttribute('role', 'status');
    const undo = actionButton('Undo remove', restoreRemoved);
    undo.hidden = true;
    const feedback = element('div', 'nfg-plan-feedback');
    feedback.append(announcement, undo);
    container.replaceChildren(characterGroup, layout, feedback);

    function announce(message) {
        announcement.textContent = message;
    }

    function persist(message) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(plans));
            announce(message);
        } catch {
            announce(`${message} This browser could not save the change after closing the page.`);
        }
    }

    function personalPlans() {
        return plans.filter(item => item.character === activeCharacter.id)
            .sort((first, second) => first.date.localeCompare(second.date) || first.room - second.room);
    }

    function selectDate(key, focusCalendar = false) {
        selectedDate = key;
        viewMonth = firstOfMonth(fromKey(key));
        dateInput.value = key;
        renderCalendar(personalPlans());
        if (focusCalendar) [...grid.children].find(control => control.dataset.date === key)?.focus();
    }

    function navigateMonth(change) {
        const next = shiftMonth(viewMonth, change);
        if (next.getFullYear() < 1 || next.getFullYear() > 9999) return;
        viewMonth = next;
        renderCalendar(personalPlans());
    }

    function handleCalendarKey(event, date) {
        const shift = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
        let next;
        if (shift !== undefined) next = dateAt(date.getFullYear(), date.getMonth(), date.getDate() + shift);
        else if (event.key === 'PageUp') next = shiftMonth(date, -1);
        else if (event.key === 'PageDown') next = shiftMonth(date, 1);
        else return;
        event.preventDefault();
        const key = dateKey(next);
        if (isDateKey(key)) selectDate(key, true);
    }

    function renderCalendar(items) {
        const today = dateKey(new Date());
        const currentMonth = dateKey(viewMonth).slice(0, 7);
        const year = viewMonth.getFullYear();
        const month = viewMonth.getMonth();
        const subdivisions = new Map();
        for (const item of items) {
            if (!subdivisions.has(item.date)) subdivisions.set(item.date, []);
            subdivisions.get(item.date).push(item);
        }
        monthHeading.textContent = monthFormat.format(viewMonth);
        back.disabled = currentMonth === '0001-01';
        forward.disabled = currentMonth === '9999-12';
        const cells = Array.from({ length: viewMonth.getDay() }, () => element('span', 'nfg-plan-blank'));
        const total = dateAt(year, month + 1, 0).getDate();
        const tabStop = selectedDate.startsWith(currentMonth) ? selectedDate : dateKey(viewMonth);
        for (let day = 1; day <= total; day += 1) {
            const date = dateAt(year, month, day);
            const key = dateKey(date);
            const entries = subdivisions.get(key) || [];
            const missed = entries.some(item => !item.completed && key < today);
            const description = entries.map(item => `${roomName(item.room)}${item.completed ? ', complete' : key < today ? ', missed' : ''}`).join('; ');
            const control = button('nfg-plan-date', undefined,
                `${dateFormat.format(date)}${description ? `, ${description}` : ''}`);
            control.dataset.date = key;
            if (missed) control.classList.add('nfg-plan-date-missed');
            control.tabIndex = key === tabStop ? 0 : -1;
            control.setAttribute('aria-pressed', String(key === selectedDate));
            if (key === today) control.setAttribute('aria-current', 'date');
            control.append(element('span', 'nfg-plan-date-number', String(day)));
            if (entries.length) {
                if (entries.length === 1) {
                    const label = element('span', 'nfg-plan-date-room', `Day ${entries[0].room}`);
                    label.style.setProperty('--nfg-room-color', days[entries[0].room].color);
                    label.setAttribute('aria-hidden', 'true');
                    control.append(label);
                }
                const dots = element('span', 'nfg-plan-dots');
                dots.setAttribute('aria-hidden', 'true');
                for (const entry of entries.slice(0, 4)) {
                    const dot = element('span');
                    dot.style.setProperty('--nfg-room-color', days[entry.room].color);
                    dots.append(dot);
                }
                if (entries.length > 4) dots.append(element('span', 'nfg-plan-more', '+'));
                control.append(dots);
            }
            control.addEventListener('click', () => selectDate(key, true));
            control.addEventListener('keydown', event => handleCalendarKey(event, date));
            cells.push(control);
        }
        grid.replaceChildren(...cells);
    }

    function render() {
        characterButtons.forEach((control, index) => control.setAttribute('aria-pressed',
            String(characters[index].id === activeCharacter.id)));
        const items = personalPlans();
        renderCalendar(items);
        renderAgenda(items);
    }

    function renderAgenda(items) {
        const today = dateKey(new Date());
        agendaHeading.textContent = `${activeCharacter.name}’s room days`;
        empty.hidden = items.length > 0;
        empty.textContent = 'Pick a date and add a room day.';
        planList.replaceChildren(...items.map(item => {
            const row = element('li', 'nfg-plan-entry');
            row.dataset.id = item.id;
            row.style.setProperty('--nfg-room-color', days[item.room].color);
            const main = element('div', 'nfg-plan-entry-main');
            const title = element('strong', '', roomName(item.room));
            const time = element('time', '', dateFormat.format(fromKey(item.date)));
            time.dateTime = item.date;
            main.append(title, time);
            if (item.completed || item.date < today) {
                const tag = element('span', `nfg-plan-badge ${item.completed ? 'is-done' : 'is-missed'}`,
                    item.completed ? 'Complete' : 'Missed');
                main.append(tag);
            }
            const actions = element('div', 'nfg-plan-entry-actions');
            const room = roomName(item.room);
            const editText = !item.completed && item.date < today ? 'Reschedule' : 'Edit date';
            actions.append(
                actionButton(editText, () => editRoom(item), `${editText} for ${room}`),
                actionButton(item.completed ? 'Undo complete' : 'Mark complete', () => toggleComplete(item),
                    `${item.completed ? 'Undo completion' : 'Mark complete'} for ${room}`),
                actionButton('Remove', () => removeRoom(item), `Remove ${room}`),
            );
            row.append(main, actions);
            return row;
        }));
    }

    function cancelEdit() {
        editingId = null;
        formHeading.textContent = 'Schedule a room day';
        submit.textContent = 'Add to calendar';
        roomInput.value = '';
        dateInput.value = selectedDate;
        cancel.hidden = true;
    }

    function editRoom(item) {
        editingId = item.id;
        formHeading.textContent = 'Edit room day';
        submit.textContent = 'Save changes';
        cancel.hidden = false;
        roomInput.value = String(item.room);
        selectDate(item.date);
        dateInput.focus();
    }

    function saveRoom(event) {
        event.preventDefault();
        const room = Number(roomInput.value);
        const date = dateInput.value;
        if (!isDateKey(date) || roomInput.value === '' || !days[room]) return;
        if (plans.some(item => item.character === activeCharacter.id && item.room === room &&
            item.date === date && item.id !== editingId)) {
            announce(`${roomName(room)} is already scheduled on that date.`);
            return;
        }
        if (editingId) {
            plans = plans.map(item => item.id === editingId ? { ...item, room, date } : item);
        } else {
            const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            plans.push({ id, character: activeCharacter.id, room, date, completed: false });
        }
        const message = `${roomName(room)} ${editingId ? 'updated' : 'scheduled'} for ${dateFormat.format(fromKey(date))}.`;
        selectDate(date);
        cancelEdit();
        renderAgenda(personalPlans());
        persist(message);
    }

    function toggleComplete(item) {
        plans = plans.map(plan => plan.id === item.id ? { ...plan, completed: !item.completed } : plan);
        render();
        [...planList.children].find(row => row.dataset.id === item.id)?.querySelectorAll('button')[1]?.focus();
        persist(`${roomName(item.room)} ${item.completed ? 'marked incomplete' : 'completed'}.`);
    }

    function removeRoom(item) {
        removed = item;
        if (editingId === item.id) cancelEdit();
        plans = plans.filter(plan => plan.id !== item.id);
        render();
        undo.hidden = false;
        undo.focus();
        persist(`${roomName(item.room)} removed from the calendar.`);
    }

    function restoreRemoved() {
        if (!removed) return;
        const item = removed;
        const duplicate = plans.some(plan => plan.character === item.character && plan.room === item.room && plan.date === item.date);
        if (!duplicate) plans.push(item);
        removed = undefined;
        undo.hidden = true;
        render();
        roomInput.focus();
        persist(`${roomName(item.room)} restored to ${characters.find(character => character.id === item.character).name}’s calendar.`);
    }

    dateInput.value = selectedDate;
    render();
}
