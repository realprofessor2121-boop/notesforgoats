import { days } from "./lessons.js";
import { extraPhotos } from "./photos.js";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ACCEPTED_UPLOADS = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const PRESETS_PER_PAGE = 12;
const STORE = "covers";

let database;
let nextDialogId = 0;

export const nfgArtworkPresets = [
    ...["Notes", "Notas", "Mentor", "AI"].map(label => ({
        label,
        src: `characters/${label.toLowerCase()}.png`,
    })),
    ...days.flatMap(day => day.lessons.map(lesson => ({
        label: `Day ${day.day} · ${lesson.title}`,
        src: lesson.image,
    }))),
    ...Object.values(extraPhotos).flat().map(item => ({ label: item.title, src: item.image })),
];

function openDatabase() {
    database ??= new Promise((resolve, reject) => {
        const request = indexedDB.open("nfg-artwork", 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return database;
}

async function withCoverStore(mode, operation) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = operation(transaction.objectStore(STORE));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onabort = () => reject(transaction.error ?? request.error);
    });
}

async function prepareUpload(file) {
    if (!ACCEPTED_UPLOADS.includes(file.type)) {
        throw new Error("Choose a JPEG, PNG, WebP or AVIF image.");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error("Choose an image under 15 MB.");
    }

    const image = await createImageBitmap(file).catch(() => {
        throw new Error("This image could not be opened.");
    });
    try {
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        return await new Promise((resolve, reject) => {
            canvas.toBlob(
                blob => blob ? resolve(blob) : reject(new Error("This image could not be prepared.")),
                "image/webp", 0.86,
            );
        });
    } finally {
        image.close();
    }
}

function openEditor({ label, image, button, presets, save }) {
    const titleId = `nfg-cover-title-${++nextDialogId}`;
    const dialog = document.createElement("dialog");
    dialog.className = "nfg-artwork-dialog";
    dialog.setAttribute("aria-labelledby", titleId);
    dialog.innerHTML = `
        <div class="nfg-artwork-shell">
            <header class="nfg-artwork-header">
                <h2></h2>
                <button type="button" class="nfg-artwork-close" aria-label="Close cover editor">×</button>
            </header>
            <div class="nfg-artwork-controls">
                <img class="nfg-artwork-preview" alt="">
                <div class="nfg-artwork-options">
                    <label class="nfg-artwork-upload">
                        Upload an image
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif">
                    </label>
                    <button type="button" class="nfg-artwork-reset">Use default</button>
                    <p>Cover changes are saved in this browser.</p>
                </div>
            </div>
            <label class="nfg-artwork-search">
                Find NFG artwork
                <input type="search" placeholder="Search by lesson, character or game">
            </label>
            <div class="nfg-artwork-presets"></div>
            <div class="nfg-artwork-pager">
                <button type="button" data-page="-1">Previous</button>
                <span aria-live="polite"></span>
                <button type="button" data-page="1">Next</button>
            </div>
            <p class="nfg-artwork-status" role="status"></p>
        </div>
    `;
    const heading = dialog.querySelector("h2");
    heading.id = titleId;
    heading.textContent = `Change cover for ${label}`;
    dialog.querySelector(".nfg-artwork-preview").src = image.src;
    const close = dialog.querySelector(".nfg-artwork-close");
    const filter = dialog.querySelector('input[type="search"]');
    const upload = dialog.querySelector('input[type="file"]');
    const reset = dialog.querySelector(".nfg-artwork-reset");
    const grid = dialog.querySelector(".nfg-artwork-presets");
    const status = dialog.querySelector(".nfg-artwork-status");
    const pager = dialog.querySelector(".nfg-artwork-pager");
    const previous = pager.querySelector('[data-page="-1"]');
    const next = pager.querySelector('[data-page="1"]');

    let page = 0;
    let busy = false;

    function draw() {
        const query = filter.value.trim().toLowerCase();
        const matches = presets.filter(item => item.label.toLowerCase().includes(query));
        const count = Math.ceil(matches.length / PRESETS_PER_PAGE);
        const begin = page * PRESETS_PER_PAGE;

        grid.replaceChildren();
        for (const item of matches.slice(begin, begin + PRESETS_PER_PAGE)) {
            const choice = document.createElement("button");
            choice.type = "button";
            const cover = document.createElement("img");
            cover.src = item.src;
            cover.alt = "";
            cover.loading = "lazy";
            const title = document.createElement("span");
            title.textContent = item.label;
            choice.append(cover, title);
            choice.addEventListener("click", () => commit(() => ({ kind: "preset", src: item.src })));
            grid.append(choice);
        }

        pager.hidden = count < 2;
        previous.disabled = page === 0;
        next.disabled = page + 1 >= count;
        pager.querySelector("span").textContent = `${page + 1} of ${count}`;
        status.textContent = matches.length ? "" : "No artwork matches this search.";
    }

    async function commit(prepare) {
        if (busy) return;
        busy = true;
        status.textContent = "Saving cover…";
        dialog.setAttribute("aria-busy", "true");
        try {
            const override = await prepare();
            try {
                await save(override);
            } catch {
                throw new Error("This browser could not save the cover.");
            }
            dialog.close();
        } catch (error) {
            status.textContent = error.message;
        } finally {
            busy = false;
            dialog.removeAttribute("aria-busy");
        }
    }

    filter.addEventListener("input", () => {
        page = 0;
        draw();
    });
    for (const control of [previous, next]) {
        control.addEventListener("click", () => {
            page += Number(control.dataset.page);
            draw();
        });
    }
    upload.addEventListener("change", () => {
        const file = upload.files[0];
        if (file) {
            commit(async () => ({ kind: "upload", blob: await prepareUpload(file) }));
        }
        upload.value = "";
    });
    reset.addEventListener("click", () => commit(() => null));
    close.addEventListener("click", () => {
        if (!busy) dialog.close();
    });
    dialog.addEventListener("cancel", event => {
        if (busy) event.preventDefault();
    });
    dialog.addEventListener("close", () => {
        dialog.remove();
        if (button.isConnected) button.focus();
    }, { once: true });

    document.body.append(dialog);
    draw();
    dialog.showModal();
}

export function mountArtwork({
    id, label, defaultSrc, image, button, presets = nfgArtworkPresets,
}) {
    const options = [...new Map(presets.filter(item => item.src && item.label)
        .map(item => [item.src, item])).values()];
    let objectUrl;
    let destroyed = false;
    let version = 0;

    function display(override) {
        if (destroyed) return;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = override?.kind === "upload" && override.blob instanceof Blob
            ? URL.createObjectURL(override.blob) : undefined;
        image.src = objectUrl || (override?.kind === "preset" ? override.src : defaultSrc);
    }

    async function refresh() {
        const requestVersion = ++version;
        try {
            const override = await withCoverStore("readonly", store => store.get(id));
            if (requestVersion === version) display(override);
        } catch {
            if (requestVersion === version) display(null);
        }
    }

    async function save(override) {
        const requestVersion = ++version;
        await withCoverStore("readwrite", store =>
            override ? store.put(override, id) : store.delete(id));
        if (requestVersion === version) display(override);
    }

    function edit() {
        openEditor({ label, image, button, presets: options, save });
    }

    function useDefaultIfUnavailable() {
        if (image.src !== new URL(defaultSrc, document.baseURI).href) display(null);
    }

    display(null);
    refresh();
    image.addEventListener("error", useDefaultIfUnavailable);
    button.addEventListener("click", edit);

    return {
        refresh,
        destroy() {
            destroyed = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            image.removeEventListener("error", useDefaultIfUnavailable);
            button.removeEventListener("click", edit);
        },
    };
}
