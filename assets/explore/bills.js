const storagePrefix = 'nfg-explore-bills-v1:';
const statuses = {
    pending: 'Balance pending',
    due: 'Needs payment',
    balanced: 'Balanced',
    credit: 'Above balance',
    paid: 'Paid',
};
const emptyBill = { amount: '', dueDate: '', status: 'pending' };
const unavailableStorage = new Map();
const moneyFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });

function isDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().startsWith(value);
}

function normalizeBill(value) {
    const hasAmount = typeof value?.amount === 'string' && value.amount.trim() !== '' && Number.isFinite(Number(value.amount));
    return {
        amount: hasAmount ? Number(value.amount).toFixed(2) : '',
        dueDate: isDate(value?.dueDate) ? value.dueDate : '',
        status: Object.hasOwn(statuses, value?.status) ? value.status : 'pending',
    };
}

export function getBillState(billId) {
    if (unavailableStorage.has(billId)) return { ...unavailableStorage.get(billId) };
    try {
        const value = localStorage.getItem(storagePrefix + billId);
        return value ? normalizeBill(JSON.parse(value)) : { ...emptyBill };
    } catch {
        return { ...emptyBill };
    }
}

function notifyBillChange(billId, state) {
    window.dispatchEvent(new CustomEvent('nfg-bill-change', { detail: { billId, state } }));
}

function saveBill(billId, state) {
    let stored = false;
    try {
        localStorage.setItem(storagePrefix + billId, JSON.stringify(state));
        unavailableStorage.delete(billId);
        stored = true;
    } catch {
        unavailableStorage.set(billId, state);
    }
    notifyBillChange(billId, state);
    return stored;
}

window.addEventListener('storage', event => {
    if (!event.key?.startsWith(storagePrefix)) return;
    const billId = event.key.slice(storagePrefix.length);
    unavailableStorage.delete(billId);
    notifyBillChange(billId, getBillState(billId));
});

function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

export function billSummary(billId) {
    const bill = getBillState(billId);
    const summary = node('span', 'x-bill-summary');
    summary.dataset.billId = billId;
    summary.dataset.billStatus = bill.status;
    const amount = bill.amount === '' ? 'Amount pending' : moneyFormat.format(Number(bill.amount));
    const date = node('span', 'x-bill-date');
    if (bill.dueDate) {
        const time = node('time', '', dateFormat.format(new Date(`${bill.dueDate}T00:00:00Z`)));
        time.dateTime = bill.dueDate;
        date.append('Due ', time);
    } else {
        date.textContent = 'Due date pending';
    }
    summary.append(node('span', 'x-bill-amount', amount), date,
        node('span', 'x-bill-status', statuses[bill.status]));
    return summary;
}

function billField(label, control) {
    const field = node('label', 'x-bill-field');
    field.append(node('span', '', label), control);
    return field;
}

export function mountBillEditor(container, billId) {
    const bill = getBillState(billId);
    const form = node('form', 'x-bill-form');
    const heading = node('p', 'x-bill-editor-title', 'Bill details');

    const amount = node('input');
    amount.type = 'number';
    amount.step = '0.01';
    amount.inputMode = 'decimal';
    amount.name = 'amount';
    amount.value = bill.amount;

    const dueDate = node('input');
    dueDate.type = 'date';
    dueDate.name = 'dueDate';
    dueDate.value = bill.dueDate;

    const status = node('select');
    status.name = 'status';
    for (const [value, label] of Object.entries(statuses)) {
        const option = node('option', '', label);
        option.value = value;
        status.add(option);
    }
    status.value = bill.status;

    const save = node('button', 'x-bill-save', 'Save bill');
    save.type = 'submit';
    const feedback = node('span', 'x-bill-feedback');
    feedback.setAttribute('role', 'status');
    const fields = node('div', 'x-bill-fields');
    fields.append(billField('Amount (USD)', amount), billField('Due date', dueDate));
    form.append(fields, billField('Payment status', status), save,
        node('span', 'x-bill-privacy', 'Stays in this browser.'), feedback);

    form.addEventListener('input', () => { feedback.textContent = ''; });
    form.addEventListener('submit', event => {
        event.preventDefault();
        const state = normalizeBill({ amount: amount.value, dueDate: dueDate.value, status: status.value });
        const stored = saveBill(billId, state);
        amount.value = state.amount;
        feedback.textContent = stored ? 'Bill saved.' : 'Saved for this visit. Browser storage is unavailable.';
    });

    container.classList.add('x-bill-editor');
    container.replaceChildren(heading, form);
}
