import { mountArtwork } from './artwork.js';
import { buildDiscography, deyoArchive, jukeboxArt } from './discography.js';
import { mountTrackDetails } from './jukebox.js';

const soundtrack = [
    { id: 'journey', title: 'Journey', file: 'journey.m4a', day: 0, duration: 215.67 },
    { id: 'perfectly-happy', title: 'Perfectly Happy', file: 'perfectly-happy.m4a', day: 1, duration: 180.70 },
    { id: '808-daddy-king', title: '808 Daddy King', version: 'DJ Princess Pri Remix', file: '808-daddy-king.mp3', day: 2, duration: 90.72,
        credits: [{ role: 'Remix', names: 'DJ Princess Pri' }] },
    { id: 'command-bounce', title: 'Command Bounce 1.6', version: 'Not Mixed', file: 'command-bounce.m4a', day: 3, duration: 46.14 },
    { id: 'what-u-on', title: 'What U On', version: 'Bounce 7_PN 1', file: 'what-u-on.mp3', day: 4, duration: 85.52 },
    { id: 'forget-u', title: 'Forget U!!!', version: 'Track', file: 'forget-u.mp3', day: 5, duration: 207.70 },
    { id: 'we-did-it', title: 'We FxIN Did It! 2', artist: 'mrDEYO', version: 'Limited', file: 'we-did-it.mp3', day: 6, duration: 139.73 },
    { id: 'dreamer', title: 'Dreamer', file: 'dreamer.mp3', day: 7, duration: 255.72 },
    { id: 'modern-md-bounce', title: 'Modern mD bnc1', artist: 'mD Logic', file: 'modern-md-bounce.mp3', day: 8, duration: 178.68 },
    {
        id: 'jenny-natasha-demo', title: 'Jenny from the Block', version: 'Original demo',
        artist: 'Natasha Ramos', cover: deyoArchive, file: 'jenny-from-the-block-natasha-demo.mp3', duration: 202.75,
        credits: [{ role: 'Writer(s)', names: 'Andre Deyo, Troy Oliver' }, { role: 'Mixing', names: 'Guillermo Edghill Jr. (demo)' }],
    },
];

const roomArt = [
    'Old Bedroom', 'Personal Care Room', 'Game Room', 'Business Room', 'Studio',
    'Distribution Office', 'Collection & Marketing', 'Trophy Room', 'Future & Legacy',
].map((label, day) => ({ label, src: `assets/explore/music-art/room-${day}.webp` }));

const houseArt = { label: 'NFG House', src: 'assets/explore/posters/house.webp' };
const artworkPresets = [
    houseArt,
    ...roomArt,
    { label: 'Original NFG course jukebox', src: jukeboxArt },
    { label: 'Andre Deyo #DEYOLYRICS archive', src: deyoArchive },
    { label: 'Notes', src: 'characters/notes.png' },
    { label: 'Notas', src: 'characters/notas.png' },
    { label: 'Mentor', src: 'characters/mentor.png' },
    { label: 'AI', src: 'characters/ai.png' },
    { label: 'Broadway Acura MDX', src: 'assets/explore/posters/broadway-acura-mdx.webp' },
];
const formatter = new Intl.NumberFormat();
const sessionCounts = new Map();
let databasePromise;

function openStreamStore() {
    if (!databasePromise) {
        databasePromise = new Promise((resolve, reject) => {
            const request = indexedDB.open('nfg-soundtrack-library', 1);
            request.onupgradeneeded = () => {
                request.result.createObjectStore('streams', { keyPath: 'id' });
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    return databasePromise;
}

async function readCounts() {
    const db = await openStreamStore();
    return new Promise((resolve, reject) => {
        const request = db.transaction('streams').objectStore('streams').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function countStream(id) {
    const db = await openStreamStore();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('streams', 'readwrite');
        let count;
        transaction.oncomplete = () => resolve(count);
        transaction.onabort = () => reject(transaction.error);
        const store = transaction.objectStore('streams');
        const read = store.get(id);
        read.onsuccess = () => {
            count = (read.result?.count || 0) + 1;
            store.put({ id, count });
        };
    });
}

function observePlayback(audio, onStream, signal) {
    let counted = false;
    let segment;
    const heardFor = 30;

    function startSegment() {
        if (segment || counted || audio.paused || audio.seeking || audio.muted || !audio.volume) return;
        const start = audio.currentTime;
        segment = { start, position: start, advanced: 0, heard: 0, updatedAt: performance.now(), rate: audio.playbackRate };
    }

    function samplePlayback(ended = false) {
        if (!segment || counted) return;
        const now = performance.now();
        const elapsed = (now - segment.updatedAt) / 1000;
        const advance = audio.currentTime - segment.position;
        if (advance < -.02 || advance > elapsed * segment.rate + .5) {
            segment = undefined;
            if (!ended) startSegment();
            return;
        }
        // Buffering and playback-rate changes must not add time that was never heard.
        const played = Math.max(advance, 0);
        segment.advanced += played;
        segment.heard += played / segment.rate;
        segment.position = audio.currentTime;
        segment.updatedAt = now;
        const shortTrack = ended && audio.duration > 0 && audio.duration < heardFor
            && segment.start <= .25 && segment.advanced >= audio.duration - .35;
        if (segment.heard >= heardFor || shortTrack) {
            counted = true;
            onStream();
        }
    }

    function breakSegment() {
        segment = undefined;
    }

    function finishSegment() {
        samplePlayback();
        breakSegment();
    }

    audio.addEventListener('playing', startSegment, { signal });
    audio.addEventListener('timeupdate', () => samplePlayback(), { signal });
    audio.addEventListener('seeking', breakSegment, { signal });
    audio.addEventListener('seeked', () => {
        if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) startSegment();
    }, { signal });
    audio.addEventListener('waiting', finishSegment, { signal });
    audio.addEventListener('pause', () => {
        if (!audio.ended) finishSegment();
    }, { signal });
    audio.addEventListener('ratechange', () => {
        finishSegment();
        startSegment();
    }, { signal });
    audio.addEventListener('volumechange', () => {
        if (audio.muted || !audio.volume) finishSegment();
        else startSegment();
    }, { signal });
    audio.addEventListener('ended', () => {
        samplePlayback(true);
        breakSegment();
        counted = false;
    }, { signal });
}

function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function action(className, label) {
    const button = node('button', className, label);
    button.type = 'button';
    return button;
}

function visibleTime(duration) {
    const whole = Math.floor(duration);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function trackMeta(track) {
    const day = track.day === undefined ? '' : `Day ${track.day}`;
    return [day, track.artist, track.version].filter(Boolean).join(' · ');
}

function showPlayButton(button, track, playing) {
    button.textContent = playing ? 'Pause' : 'Play';
    button.setAttribute('aria-label', `${button.textContent} ${track.title}`);
}

export function mountMusic(container) {
    const root = node('div', 'nfg-music');
    const player = node('section', 'nfg-listening');
    const playerArt = node('div', 'nfg-listening-art');
    const selectedImage = node('img');
    selectedImage.alt = '';
    playerArt.append(selectedImage);
    const playerBody = node('div', 'nfg-listening-body');
    const selectedTitle = node('h3', 'nfg-listening-title');
    const selectedMeta = node('p', 'nfg-listening-meta');
    const selectedCount = node('p', 'nfg-listening-count');
    selectedCount.setAttribute('aria-live', 'polite');
    const threshold = node('p', 'nfg-listening-rule', 'A stream counts after 30 seconds of listening.');
    const audioSlot = node('div', 'nfg-listening-player');
    const message = node('p', 'nfg-music-feedback');
    message.setAttribute('role', 'status');
    playerBody.append(node('p', 'nfg-listening-label', 'NFG Jukebox'), selectedTitle, selectedMeta,
        audioSlot, selectedCount, threshold, message);
    const detail = mountTrackDetails();
    player.append(playerArt, playerBody, detail.element);

    const catalog = node('section', 'nfg-catalog');
    const heading = node('div', 'nfg-catalog-head');
    const jukebox = node('img', 'nfg-catalog-jukebox');
    jukebox.src = jukeboxArt;
    jukebox.alt = 'Jukebox from the original NFG Orange room';
    const caption = node('div');
    caption.append(node('h3', '', 'Track library'), node('p', '', 'Streams on this browser'));
    const tracks = node('ul', 'nfg-track-list');
    heading.append(jukebox, caption);
    catalog.append(heading, tracks);
    const discography = buildDiscography(artworkPresets);
    root.append(player, catalog, discography.element);
    container.replaceChildren(root);

    const cards = new Map();
    const counts = new Map(sessionCounts);
    const subscriptions = new AbortController();
    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('nfg-soundtrack-streams') : null;
    let current;
    let audio;
    let audioEvents;
    let watchArtwork;

    function refreshCount(id, count) {
        const label = `${formatter.format(count)} ${count === 1 ? 'stream' : 'streams'}`;
        const card = cards.get(id);
        if (card) card.count.textContent = label;
        if (current?.id === id) selectedCount.textContent = `${label} on this browser`;
    }

    function receiveCount(id, count) {
        counts.set(id, Math.max(counts.get(id) || 0, count));
        refreshCount(id, counts.get(id));
    }

    channel?.addEventListener('message', ({ data }) => {
        if (data && typeof data.id === 'string' && Number.isSafeInteger(data.count)) receiveCount(data.id, data.count);
    }, { signal: subscriptions.signal });

    async function addStream(id) {
        try {
            const count = await countStream(id);
            if (subscriptions.signal.aborted) return;
            receiveCount(id, count);
            channel?.postMessage({ id, count });
        } catch {
            const count = (counts.get(id) || 0) + 1;
            sessionCounts.set(id, count);
            if (subscriptions.signal.aborted) return;
            receiveCount(id, count);
            if (current?.id === id) message.textContent = 'Stream counted for this visit. Browser storage is unavailable.';
        }
    }

    function releaseAudio() {
        watchArtwork?.disconnect();
        audioEvents?.abort();
        if (!audio) return;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        audio = undefined;
    }

    function playAudio(audioElement) {
        audioElement.play().catch(error => {
            if (audio === audioElement && error.name !== 'AbortError') message.textContent = 'This recording could not be played.';
        });
    }

    function selectTrack(track, shouldPlay = false) {
        if (current?.id === track.id) {
            if (shouldPlay) {
                if (audio.paused) playAudio(audio);
                else audio.pause();
            }
            return;
        }
        const oldCard = current && cards.get(current.id);
        if (oldCard) {
            oldCard.row.removeAttribute('data-active');
            showPlayButton(oldCard.play, current, false);
        }
        releaseAudio();
        current = track;
        const card = cards.get(track.id);
        card.row.dataset.active = '';
        selectedTitle.textContent = track.title;
        selectedMeta.textContent = trackMeta(track);
        refreshCount(track.id, counts.get(track.id) || 0);
        message.textContent = '';
        const syncArtwork = () => { selectedImage.src = card.image.src; };
        syncArtwork();
        watchArtwork = new MutationObserver(syncArtwork);
        watchArtwork.observe(card.image, { attributes: true, attributeFilter: ['src'] });

        audio = node('audio');
        audio.controls = true;
        audio.preload = 'metadata';
        audio.setAttribute('aria-label', `Audio player for ${track.title}`);
        audioEvents = new AbortController();
        const signal = audioEvents.signal;
        audio.addEventListener('play', () => {
            showPlayButton(card.play, track, true);
            message.textContent = '';
        }, { signal });
        audio.addEventListener('pause', () => showPlayButton(card.play, track, false), { signal });
        audio.addEventListener('ended', () => showPlayButton(card.play, track, false), { signal });
        audio.addEventListener('error', () => {
            showPlayButton(card.play, track, false);
            message.textContent = 'This recording could not be loaded.';
        }, { signal });
        audio.addEventListener('loadedmetadata', () => {
            if (Number.isFinite(audio.duration)) card.duration.textContent = visibleTime(audio.duration);
        }, { signal });
        observePlayback(audio, () => addStream(track.id), signal);
        audio.src = `assets/explore/audio/${track.file}`;
        audioSlot.replaceChildren(audio);
        detail.show(track, audio, signal);
        if (shouldPlay) playAudio(audio);
    }

    function appendTrack(track) {
        const row = node('li', 'nfg-track');
        const cover = node('div', 'nfg-track-cover');
        const image = node('img');
        const defaultSrc = track.cover || roomArt[track.day].src;
        image.src = defaultSrc;
        image.alt = '';
        image.loading = 'lazy';
        cover.append(image);
        const details = node('div', 'nfg-track-details');
        const meta = node('p', 'nfg-track-meta', trackMeta(track));
        const count = node('p', 'nfg-track-count');
        const duration = node('span', 'nfg-track-duration', visibleTime(track.duration));
        const stats = node('div', 'nfg-track-stats');
        stats.append(count, duration);
        details.append(node('h4', '', track.title), meta, stats);
        const controls = node('div', 'nfg-track-actions');
        const play = action('nfg-music-button nfg-track-play', 'Play');
        const edit = action('nfg-music-button nfg-track-edit', 'Edit cover');
        showPlayButton(play, track, false);
        edit.setAttribute('aria-label', `Edit cover for ${track.title}`);
        const order = node('a', 'nfg-music-button nfg-track-order', 'Request order');
        order.href = '#order/' + encodeURIComponent(track.title + ' · Music');
        controls.append(play, edit, order);
        play.addEventListener('click', () => selectTrack(track, true));
        row.append(cover, details, controls);
        tracks.append(row);
        const artwork = mountArtwork({ id: `music-${track.id}`, label: track.title, defaultSrc, image, button: edit, presets: artworkPresets });
        cards.set(track.id, { row, image, count, duration, play, artwork });
        refreshCount(track.id, counts.get(track.id) || 0);
    }

    soundtrack.forEach(appendTrack);
    selectTrack(soundtrack[0]);

    readCounts().then(items => {
        if (!subscriptions.signal.aborted) items.forEach(({ id, count }) => receiveCount(id, count));
    }).catch(() => {});

    return {
        destroy() {
            subscriptions.abort();
            channel?.close();
            releaseAudio();
            for (const card of cards.values()) card.artwork.destroy();
            discography.destroy();
            root.remove();
        },
    };
}
