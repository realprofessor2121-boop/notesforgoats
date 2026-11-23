export const chapterExtras = {
    '0-2': [['Broadway & the Rat Race', '#world/broadway']],
    '0-4': [['Spaces sphere', '#world/spaces']],
    '0-5': [['Lily and the NFG cast', '#characters']],
    '0-7': [['Newspaper stand', '#world/newspaper']],
    '0-8': [['Your timeline', '#dashboard/timeline']],
    '1-4': [['Gym and workout equipment', '#rooms']],
    '1-5': [['Food mood meter', '#life/food']],
    '1-7': [['Exposure triangle', '#studio/exposure']],
    '2-4': [['Label structure', '#workflows/rights']],
    '2-6': [['Meet the chasing Gatekeepers', '#dashboard/gatekeepers']],
    '3-2': [['NFG Wallet', '#life/wallet'], ['Money in and money out', '#dashboard/money']],
    '3-4': [['Registration and cue sheets', '#workflows/registration']],
    '3-5': [['Annual income and expense records', '#dashboard/money']],
    '4-1': [['See the studio colors and equipment', '#studio/layout']],
    '4-2': [['Drum pads and intervals', '#studio/instruments']],
    '4-5': [['NFG mixing plugins', '#studio/mixing']],
    '5-2': [['Song registry & DSP signups', '#workflows/registration']],
    '5-3': [['Split sheets, cue sheets and copyright', '#workflows/rights']],
    '5-6': [['Release plans and masters', '#workflows/release']],
    '6-1': [['Collect 1 and marketing campaigns', '#workflows/promotion']],
    '6-7': [['Blockchain and candlesticks', '#dashboard/markets']],
    '7-3': [['Family net worth and market references', '#dashboard']],
    '7-5': [['NFG heat maps', '#dashboard/maps']],
    '7-6': [['RIAA plaques and awards', '#workflows/sales']],
    '7-7': [['You Did It speech', '#dashboard/graduation']],
    '8-3': [['Flip calculator and risk', '#dashboard/money'], ['Planting and growing', '#life/planting']],
    '8-7': [['Boat tour', '#world/boat'], ['Elevator house blueprint', '#rooms']],
};

export async function mountExtraCharacters(container) {
    const response = await fetch('assets/expansion/characters/characters.json');
    if (!response.ok) return;
    const data = await response.json();
    const characters = data.characters || data;
    if (!characters.length) return;
    const heading = document.createElement('h2');
    heading.textContent = 'Course characters';
    const grid = document.createElement('div');
    grid.className = 'nfg-new-cast';
    for (const item of characters) {
        const card = document.createElement('article');
        const name = document.createElement('h3');
        name.textContent = item.title || item.name;
        const image = document.createElement(item.video ? 'video' : 'img');
        const poster = item.poster || item.image || item.src;
        if (item.video) {
            image.src = item.video;
            image.poster = poster;
            image.controls = true;
            image.playsInline = true;
            image.preload = 'none';
            image.setAttribute('aria-label', item.alt || name.textContent);
        } else {
            image.src = poster;
            image.alt = item.alt || name.textContent;
        }
        const credit = document.createElement('p');
        credit.textContent = item.description || item.label || '';
        card.append(image, name);
        if (credit.textContent) card.append(credit);
        if (item.model || item.glb) {
            const open = document.createElement('button');
            open.type = 'button';
            open.className = 'x-download-link';
            open.textContent = 'View in 360°';
            open.addEventListener('click', () => window.open3DViewer(item.model || item.glb, name.textContent, poster));
            card.append(open);
        }
        grid.append(card);
    }
    container.replaceChildren(heading, grid);
}
