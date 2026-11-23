const features = {
    tour: [() => import('./tour.js'), 'mountTour'],
    fight: [() => import('./fight.js'), 'mountFight'],
    planner: [() => import('./planner.js'), 'mountPlanner'],
    profile: [() => import('./profile.js'), 'mountProfile'],
    mechanical: [() => import('./royalties.js'), 'mountRoyalties'],
    sessions: [() => import('./sessions.js'), 'mountSessions'],
    rooms: [() => import('../expansion/rooms.js'), 'mountRooms'],
    life: [() => import('../expansion/life.js'), 'mountLife'],
    world: [() => import('../expansion/world.js'), 'mountWorld'],
    studio: [() => import('../expansion/studio.js'), 'mountStudio'],
    dashboard: [() => import('../expansion/dashboard.js'), 'mountDashboard'],
    workflows: [() => import('../expansion/workflows.js'), 'mountWorkflows'],
    community: [() => import('../expansion/community.js'), 'mountCommunity'],
    characters: [() => import('../expansion/lesson-extras.js'), 'mountExtraCharacters', 'additional-characters'],
    games: [() => import('./games.js'), 'mountGames'],
    'enjoy-music': [() => import('./music.js'), 'mountMusic', 'music'],
};
const loaded = new Set();
let currentForm;
let mountedFormRoute;
const arcade = document.getElementById('x-arcade-frame');

function showArcade(isActive) {
    if (!isActive) {
        if (arcade.firstChild) arcade.replaceChildren();
        return;
    }
    if (arcade.firstChild) return;
    const cabinet = document.createElement('iframe');
    cabinet.title = 'NFG Gatekeepers arcade with Notes';
    cabinet.src = 'arcade/index.html';
    arcade.append(cabinet);
}

async function mountPage() {
    const [route, ...parts] = location.hash.slice(1).split('/');
    showArcade(route === 'arcade');
    if (route === 'order' || route === 'signup') {
        const hash = location.hash;
        if (mountedFormRoute === hash) return;
        currentForm?.();
        currentForm = undefined;
        mountedFormRoute = hash;
        const container = document.getElementById('nfg-' + route);
        try {
            const module = await import('./forms.js');
            if (location.hash !== hash) {
                mountedFormRoute = undefined;
                return;
            }
            const item = decodeURIComponent(parts.join('/'));
            const result = module.mountNfgForm(container, { kind: route, item });
            currentForm = typeof result === 'function' ? result : result?.destroy?.bind(result);
        } catch (error) {
            mountedFormRoute = undefined;
            console.error('Could not open the NFG form', error);
            container.textContent = 'This form could not load. Refresh the page to try again.';
        }
        return;
    }
    if (currentForm) {
        currentForm();
        currentForm = undefined;
        mountedFormRoute = undefined;
    }
    if (!Object.hasOwn(features, route) || loaded.has(route)) return;
    const [load, mount, key = route] = features[route];
    const container = document.getElementById('nfg-' + key);
    loaded.add(route);
    try {
        const feature = await load();
        await feature[mount](container);
    } catch (error) {
        loaded.delete(route);
        console.error(`Could not load the NFG ${key} page`, error);
        container.textContent = 'This section could not load. Refresh the page to try again.';
    }
}

window.addEventListener('hashchange', mountPage);
mountPage();
