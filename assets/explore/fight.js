const roundLength = 55;
const fighters = [{ id: 'notes', name: 'Notes' }, { id: 'ai', name: 'AI' }];
const keyboard = new Map([
    ['ArrowLeft', 'left'], ['KeyA', 'left'], ['ArrowRight', 'right'], ['KeyD', 'right'],
    ['Space', 'strike'], ['KeyJ', 'strike'], ['ShiftLeft', 'guard'], ['ShiftRight', 'guard'], ['KeyK', 'guard'],
]);
const mounted = new WeakSet();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
}

function button(className, content) {
    const node = element('button', className, content);
    node.type = 'button';
    return node;
}

function makeFighter(config, index) {
    const actor = element('div', `nfg-fight-actor nfg-fight-actor-${config.id}`);
    actor.setAttribute('aria-hidden', 'true');
    const image = element('img', 'nfg-fight-sprite');
    image.src = `assets/explore/arcade/${config.id}.webp`;
    image.addEventListener('error', () => {
        image.src = `characters/${config.id}.png`;
        actor.classList.add('nfg-fight-portrait');
    }, { once: true });
    image.alt = '';
    image.draggable = false;
    actor.append(element('span', 'nfg-fight-shadow'), image, element('span', 'nfg-fight-guard'));
    const stats = element('div', 'nfg-fight-stats');
    const caption = element('span', '', config.name);
    const healthValue = element('span', 'nfg-fight-health-value', '100');
    healthValue.setAttribute('aria-hidden', 'true');
    const health = element('div', 'nfg-fight-health');
    health.setAttribute('role', 'progressbar');
    health.setAttribute('aria-label', `${config.name} health`);
    health.setAttribute('aria-valuemin', '0');
    health.setAttribute('aria-valuemax', '100');
    const fill = element('span', 'nfg-fight-health-fill');
    health.append(fill);
    const names = element('div', 'nfg-fight-names');
    names.append(caption, healthValue);
    stats.append(names, health);
    return {
        name: config.name, player: index === 0, actor, stats, health, healthValue, fill,
        x: 0, hp: 100, shownHealth: null, readyAt: 0, stunTo: 0, guardTo: 0,
        guarding: false, moving: false, attack: null,
    };
}

export function mountFight(container) {
    if (!container || mounted.has(container)) return;
    mounted.add(container);
    container.classList.add('nfg-fight');
    const [player, rival] = fighters.map(makeFighter);
    let mode = 'ready';
    let elapsed = 0;
    let frame = 0;
    let previous = 0;
    let rivalTurn = 0;
    let queuedStrike = false;
    let latchedGuard = false;
    let hitEffect;
    const held = new Map();

    const cabinet = element('div', 'nfg-fight-cabinet');
    const header = element('div', 'nfg-fight-header');
    header.append(element('h3', '', 'Basement Bout'));
    const pause = button('nfg-fight-pause', 'Pause');
    pause.disabled = true;
    pause.addEventListener('click', () => {
        if (mode === 'playing') pauseRound();
        else if (mode === 'paused') resumeRound();
    });
    header.append(pause);

    const stage = element('div', 'nfg-fight-stage');
    stage.tabIndex = -1;
    stage.setAttribute('role', 'region');
    stage.setAttribute('aria-label', 'Basement Bout arena');
    const floor = element('div', 'nfg-fight-floor');
    floor.setAttribute('aria-hidden', 'true');
    const hud = element('div', 'nfg-fight-hud');
    const clock = element('span', 'nfg-fight-clock');
    clock.setAttribute('role', 'timer');
    hud.append(player.stats, clock, rival.stats);
    const impact = element('span', 'nfg-fight-impact');
    impact.setAttribute('aria-hidden', 'true');
    const overlay = element('div', 'nfg-fight-overlay');
    const overlayTitle = element('p', 'nfg-fight-overlay-title', 'Notes vs. AI');
    const start = button('nfg-fight-start', 'Start round');
    start.addEventListener('click', () => {
        if (mode === 'paused') resumeRound();
        else restartRound();
    });
    overlay.append(overlayTitle, start);
    stage.append(floor, player.actor, rival.actor, impact, hud, overlay);

    const controls = element('div', 'nfg-fight-controls');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Fight controls');
    const moveControls = element('div', 'nfg-fight-control-group');
    const actionControls = element('div', 'nfg-fight-control-group');
    const moveLeft = addControl(moveControls, 'left', '←', 'Move left');
    const moveRight = addControl(moveControls, 'right', '→', 'Move right');
    const strike = addControl(actionControls, 'strike', 'Strike', 'Strike');
    const guard = addControl(actionControls, 'guard', 'Guard', 'Hold guard');
    guard.setAttribute('aria-pressed', 'false');
    controls.append(moveControls, actionControls);
    const instructions = element('p', 'nfg-fight-instructions',
        'Move with ← → or A D. Strike with Space or J. Hold Shift or K to guard. Step close to land a strike.');
    const status = element('p', 'nfg-fight-status');
    status.setAttribute('role', 'status');
    cabinet.append(header, stage, controls, instructions, status);
    container.replaceChildren(cabinet);

    function addControl(group, action, label, accessibleLabel) {
        const control = button(`nfg-fight-control nfg-fight-control-${action}`, label);
        control.setAttribute('aria-label', accessibleLabel);
        control.addEventListener('pointerdown', event => {
            if (mode !== 'playing' || event.button !== 0) return;
            control.setPointerCapture?.(event.pointerId);
            engage(`pointer-${event.pointerId}`, action);
        });
        const release = event => held.delete(`pointer-${event.pointerId}`);
        control.addEventListener('pointerup', release);
        control.addEventListener('pointercancel', release);
        control.addEventListener('lostpointercapture', release);
        control.addEventListener('click', event => {
            if (event.detail !== 0 || mode !== 'playing') return;
            if (action === 'strike') queuedStrike = true;
            else if (action === 'guard') {
                latchedGuard = !latchedGuard;
                control.setAttribute('aria-pressed', String(latchedGuard));
            } else {
                movePlayer(action === 'left' ? -0.055 : 0.055);
                drawFighters();
            }
        });
        group.append(control);
        return control;
    }

    function engage(key, action) {
        if (held.has(key)) return;
        held.set(key, action);
        if (action === 'strike') queuedStrike = true;
    }

    function actionHeld(action) {
        return [...held.values()].includes(action);
    }

    function clearInput() {
        held.clear();
        queuedStrike = false;
        latchedGuard = false;
        guard.setAttribute('aria-pressed', 'false');
    }

    window.addEventListener('keydown', event => {
        if (mode !== 'playing' || !container.getClientRects().length ||
            event.target.closest?.('input, textarea, select, [contenteditable]')) return;
        if (event.code === 'Escape') {
            event.preventDefault();
            pauseRound();
            return;
        }
        const action = keyboard.get(event.code);
        if (!action || (event.code === 'Space' && event.target.closest?.('button'))) return;
        event.preventDefault();
        engage(event.code, action);
    });
    window.addEventListener('keyup', event => held.delete(event.code));
    window.addEventListener('blur', () => {
        if (mode === 'playing') pauseRound(false);
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && mode === 'playing') pauseRound(false);
    });

    function setMode(next, message = '') {
        mode = next;
        overlay.hidden = mode === 'playing';
        const enabled = mode === 'playing';
        for (const control of [moveLeft, moveRight, strike, guard]) control.disabled = !enabled;
        pause.disabled = mode === 'ready' || mode === 'finished';
        pause.textContent = mode === 'paused' ? 'Resume' : 'Pause';
        start.textContent = mode === 'paused' ? 'Resume round' : mode === 'finished' ? 'Play again' : 'Start round';
        overlayTitle.textContent = mode === 'ready' ? 'Notes vs. AI' : message;
        status.textContent = message;
    }

    function resetFighters() {
        for (const fighter of [player, rival]) {
            fighter.hp = 100;
            fighter.x = fighter.player ? 0.24 : 0.76;
            fighter.readyAt = 0;
            fighter.stunTo = 0;
            fighter.guardTo = 0;
            fighter.guarding = false;
            fighter.moving = false;
            fighter.attack = null;
        }
        player.readyAt = 0;
        rival.readyAt = 0.65;
        hitEffect = undefined;
    }

    function restartRound() {
        cancelAnimationFrame(frame);
        clearInput();
        resetFighters();
        elapsed = 0;
        rivalTurn = 0;
        drawFighters();
        setMode('playing', 'Round started.');
        stage.focus({ preventScroll: true });
        requestTick();
    }

    function pauseRound(focus = true) {
        cancelAnimationFrame(frame);
        clearInput();
        setMode('paused', 'Round paused');
        if (focus) start.focus({ preventScroll: true });
    }

    function resumeRound() {
        setMode('playing', 'Round resumed.');
        stage.focus({ preventScroll: true });
        requestTick();
    }

    function requestTick() {
        previous = performance.now();
        frame = requestAnimationFrame(tick);
    }

    function movePlayer(amount) {
        if (player.stunTo > elapsed || player.attack) return;
        player.x = clamp(player.x + amount, 0.09, rival.x - 0.095);
    }

    function startStrike(fighter) {
        if (fighter.attack || fighter.guarding || fighter.readyAt > elapsed || fighter.stunTo > elapsed) return;
        fighter.attack = {
            impactAt: elapsed + (fighter.player ? 0.10 : 0.25),
            endAt: elapsed + (fighter.player ? 0.27 : 0.45),
            resolved: false,
        };
        fighter.readyAt = elapsed + (fighter.player ? 0.43 : 0.89);
    }

    function updatePlayer(delta) {
        player.guarding = (latchedGuard || actionHeld('guard')) && player.stunTo <= elapsed && !player.attack;
        const direction = Number(actionHeld('right')) - Number(actionHeld('left'));
        const before = player.x;
        movePlayer(direction * delta * (player.guarding ? 0.13 : 0.39));
        player.moving = before !== player.x;
        if (queuedStrike) {
            startStrike(player);
            queuedStrike = false;
        }
    }

    function updateRival(delta) {
        rival.guarding = rival.guardTo > elapsed && rival.stunTo <= elapsed && !rival.attack;
        rival.moving = false;
        if (rival.stunTo > elapsed || rival.attack || rival.guarding) return;
        const distance = rival.x - player.x;
        if (distance > 0.153) {
            rival.x = Math.max(player.x + 0.146, rival.x - delta * 0.24);
            rival.moving = true;
        } else if (rival.readyAt <= elapsed) {
            rivalTurn += 1;
            if (rivalTurn % 4 === 3) {
                rival.guardTo = elapsed + 0.53;
                rival.readyAt = elapsed + 0.72;
                rival.guarding = true;
            } else {
                startStrike(rival);
            }
        }
    }

    function resolveStrike(attacker, defender) {
        const swing = attacker.attack;
        if (!swing) return;
        if (!swing.resolved && elapsed >= swing.impactAt) {
            swing.resolved = true;
            const distance = rival.x - player.x;
            if (distance <= (attacker.player ? 0.187 : 0.172)) {
                const blocked = defender.guarding;
                defender.hp = Math.max(0, defender.hp - (blocked ? 2 : attacker.player ? 16 : 12));
                if (!blocked) {
                    defender.stunTo = elapsed + 0.24;
                    defender.attack = null;
                    const shift = defender.player ? -0.048 : 0.048;
                    defender.x = clamp(defender.x + shift, 0.09, 0.91);
                }
                hitEffect = { x: (attacker.x + defender.x) / 2, blocked, endAt: elapsed + 0.19 };
            }
        }
        if (elapsed >= swing.endAt) attacker.attack = null;
    }

    function tick(now) {
        if (mode !== 'playing') return;
        if (!container.isConnected || !container.getClientRects().length) {
            pauseRound(false);
            return;
        }
        const delta = clamp((now - previous) / 1000, 0, 0.055);
        previous = now;
        elapsed += delta;
        updatePlayer(delta);
        updateRival(delta);
        resolveStrike(player, rival);
        if (rival.hp > 0) resolveStrike(rival, player);
        drawFighters();
        if (player.hp === 0 || rival.hp === 0 || elapsed >= roundLength) {
            clearInput();
            setMode('finished', player.hp === rival.hp ? 'Draw' : player.hp > rival.hp ? 'Notes wins' : 'AI wins');
            start.focus({ preventScroll: true });
        } else {
            frame = requestAnimationFrame(tick);
        }
    }

    function drawFighters() {
        for (const fighter of [player, rival]) {
            const pose = fighter.stunTo > elapsed ? 'hurt' : fighter.attack ?
                (elapsed < fighter.attack.impactAt ? 'windup' : 'strike') :
                fighter.guarding ? 'guard' : fighter.moving ? 'step' : 'idle';
            fighter.actor.style.setProperty('--nfg-fight-x', `${fighter.x * 100}%`);
            fighter.actor.dataset.pose = pose;
            if (fighter.shownHealth !== fighter.hp) {
                fighter.fill.style.setProperty('--nfg-fight-hp', `${fighter.hp}%`);
                fighter.health.setAttribute('aria-valuenow', String(fighter.hp));
                fighter.healthValue.textContent = String(fighter.hp);
                fighter.shownHealth = fighter.hp;
            }
        }
        const seconds = Math.max(0, Math.ceil(roundLength - elapsed));
        if (clock.textContent !== String(seconds)) clock.textContent = String(seconds);
        const activeImpact = hitEffect && hitEffect.endAt > elapsed;
        impact.hidden = !activeImpact;
        if (activeImpact) {
            impact.style.setProperty('--nfg-fight-x', `${hitEffect.x * 100}%`);
            impact.dataset.blocked = String(hitEffect.blocked);
        }
    }

    resetFighters();
    drawFighters();
    setMode('ready');
}
