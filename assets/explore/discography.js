import { mountArtwork } from './artwork.js';

const art = 'assets/explore/art/';
export const deyoArchive = `${art}discography-deyo-archive.webp`;
export const jukeboxArt = `${art}jukebox-nfg-course-reference.webp`;

const releases = [
    {
        id: 'this-is-me-then', title: 'This Is Me… Then', artist: 'Jennifer Lopez', year: '2002',
        cover: `${art}discography-this-is-me-then.webp`,
        credits: 'Andre Nathaniel Deyo · Songwriter on “Jenny from the Block” and “I’m Glad”',
        url: 'https://music.apple.com/us/album/this-is-me-then/190849068', link: 'Album on Apple Music',
    },
    {
        id: 'becky-from-the-block', title: 'Becky from the Block', artist: 'Becky G', year: '2013',
        cover: `${art}discography-becky-from-the-block.webp`,
        credits: 'Andre Deyo · Composer and lyricist',
        url: 'https://music.apple.com/us/song/becky-from-the-block/640226568', link: 'Single on Apple Music',
    },
    {
        id: 'mars-venus', title: 'Mars / Venus', artist: 'Koffee Brown', year: '2001',
        cover: `${art}discography-mars-venus.webp`,
        credits: 'mrDeyo · Composer, lyricist, vocal arranger, background vocals and rap on “I Got Love (Scars)”',
        url: 'https://www.qobuz.com/us-en/album/mars-venus-koffee-brown/0078221466226', link: 'Album and credits on Qobuz',
    },
];

function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

export function buildDiscography(presets) {
    const element = node('section', 'nfg-discography');
    const catalog = node('ul', 'nfg-discography-grid');
    const controllers = [];
    element.append(node('h3', '', 'Andre Deyo discography'), catalog);
    for (const release of releases) {
        const card = node('li', 'nfg-discography-card');
        const cover = node('img', 'nfg-discography-cover');
        cover.alt = '';
        cover.loading = 'lazy';
        const body = node('div', 'nfg-discography-card-body');
        const actions = node('div', 'nfg-discography-actions');
        const link = node('a', '', release.link);
        link.href = release.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const edit = node('button', 'nfg-music-button', 'Edit cover');
        edit.type = 'button';
        edit.setAttribute('aria-label', `Edit ${release.title} album cover`);
        actions.append(link, edit);
        body.append(node('h4', '', release.title), node('p', 'nfg-track-meta', `${release.artist} · ${release.year}`),
            node('p', 'nfg-discography-credit', release.credits), actions);
        card.append(cover, body);
        catalog.append(card);
        controllers.push(mountArtwork({ id: `album-${release.id}`, label: release.title, defaultSrc: release.cover,
            image: cover, button: edit, presets }));
    }
    return { element, destroy: () => controllers.forEach(controller => controller.destroy()) };
}
