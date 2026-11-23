// This catalog includes links to separately hosted games. The bundled arcade has its own entry under arcade/.
import { mountArtwork, nfgArtworkPresets } from "./artwork.js";

const games = [
    {
        id: "spaces",
        title: "Spaces Playable",
        description: "Explore the NFT spaces in an interactive journey.",
        url: "https://spaces-playable.mrdeyomusic.chatgpt.site/",
    },
    {
        id: "gatekeepers",
        title: "NFG Gatekeepers",
        description: "Collect rooms and master the knowledge in the NFG house.",
        url: "https://nfg-gatekeepers.mrdeyomusic.chatgpt.site",
    },
    {
        id: "santa",
        title: "Helping Santa",
        description: "Deliver NFG gifts to every house in this festive run.",
        url: "https://nfg-helping-santa.mrdeyomusic.chatgpt.site",
    },
    {
        id: "money-talk",
        title: "Money Talk",
        description: "Practice the language of money.",
        url: "https://nfg-money-talk.mrdeyomusic.chatgpt.site",
    },
    {
        id: "down",
        title: "Down Game",
        description: "Test your reflexes and see how long you can keep going down.",
        url: "https://nfg-down-game.mrdeyomusic.chatgpt.site/",
    },
    {
        id: "yore",
        title: "Yore Game",
        description: "Pick the right word to practice grammar and win.",
        url: "https://nfg-yore-game.mrdeyomusic.chatgpt.site/",
    },
    {
        id: "money-talk-coins",
        title: "Money Talk Coins",
        description: "Hear money in your language or practice English alongside it.",
        url: "https://money-talk-coins.mrdeyomusic.chatgpt.site/",
    },
];

const mounts = new WeakMap();
const coverSource = game => `assets/explore/art/game-${game.id}.webp`;
const presets = [
    ...games.map(game => ({ label: game.title, src: coverSource(game) })),
    ...nfgArtworkPresets,
];

export function mountGames(container) {
    mounts.get(container)?.forEach(editor => editor.destroy());
    container.classList.add("nfg-game-grid");
    const content = document.createDocumentFragment();
    const editors = [];

    for (const game of games) {
        const card = document.createElement("article");
        card.className = "nfg-game-card";
        card.innerHTML = `
            <div class="nfg-game-image"><img alt="" loading="lazy" decoding="async"></div>
            <div class="nfg-game-info">
                <h3></h3>
                <p></p>
                <div class="nfg-game-actions">
                    <a target="_blank" rel="noopener noreferrer" class="nfg-game-play">Play now</a>
                    <button type="button" class="nfg-game-edit">Change cover</button>
                </div>
            </div>
        `;
        const image = card.querySelector("img");
        const edit = card.querySelector("button");
        const play = card.querySelector("a");
        card.querySelector("h3").textContent = game.title;
        card.querySelector("p").textContent = game.description;
        play.href = game.url;
        play.setAttribute("aria-label", `Play ${game.title} in a new tab`);
        edit.setAttribute("aria-label", `Change cover for ${game.title}`);
        editors.push(mountArtwork({
            id: `game-${game.id}`, label: game.title, defaultSrc: coverSource(game),
            image, button: edit, presets,
        }));
        content.append(card);
    }

    container.replaceChildren(content);
    mounts.set(container, editors);
}
