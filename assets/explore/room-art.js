/* =====================================================================
   NFG ROOM ART  —  custom thumbnails for the "The collection" room cards
   =====================================================================

   WHAT THIS FILE DOES
   -------------------
   On the "Explore 360°" page, the cards in "The collection" (Old Bedroom,
   Personal Care Room, Game Room ...) are built by JavaScript, so their
   pictures are NOT written in index.html.

   This script waits for those cards to appear, finds each room card by its
   TITLE, and replaces the card's picture with your own image from:

       assets/explore/music-art/room-0.webp  ...  room-8.webp

   WHERE TO PUT THIS FILE
   ----------------------
   Save as:   assets/explore/room-art.js

   HOW TO ACTIVATE IT  (add ONE line at the bottom of index.html,
   right after the two existing <script type="module"> lines):

       <script src="assets/explore/room-art.js" defer></script>

   HOW TO CHANGE THINGS LATER
   --------------------------
   - Different image folder?   -> edit IMAGE_FOLDER below.
   - Different file name?      -> edit the `file` value in ROOMS below.
   - A card title is spelled
     differently on the site?  -> add that spelling to the `names` list.
   ===================================================================== */

(function () {
  'use strict';

  /* -------------------------------------------------------------------
     1) SETTINGS
     ------------------------------------------------------------------- */

  // Folder that holds the room images.
  // This path is relative to index.html and MUST end with a "/".
  const IMAGE_FOLDER = 'assets/explore/music-art/';

  // The id of the element that explore.js fills with the cards.
  // (In index.html:  <div id="x-results"></div>)
  const RESULTS_ID = 'x-results';

  /* -------------------------------------------------------------------
     2) ROOM LIST  (card title  ->  image file)

     file   : image inside IMAGE_FOLDER
     names  : every title this room may have on the card.
              Matching ignores capital letters and punctuation, and
              treats "&" and "and" as the same word, so
              "Collection & Marketing Room" == "collection and marketing room".
              The match must be the WHOLE title (so "Studio" will not
              accidentally match "Studio Monitor").
     ------------------------------------------------------------------- */
  const ROOMS = [
    { file: 'room-0.webp', names: ['Old Bedroom'] },
    { file: 'room-1.webp', names: ['Personal Care Room'] },
    { file: 'room-2.webp', names: ['Game Room'] },
    { file: 'room-3.webp', names: ['Business Room'] },
    { file: 'room-4.webp', names: ['Studio'] },
    // The card says "Distribution Office"; "Distribution Room" is a backup spelling.
    { file: 'room-5.webp', names: ['Distribution Office', 'Distribution Room'] },
    { file: 'room-6.webp', names: ['Collection & Marketing Room'] },
    { file: 'room-7.webp', names: ['Trophy Room', 'Trophies Room'] },
    { file: 'room-8.webp', names: ['Future & Legacy Room', 'Future & Legacy'] },
  ];

  /* -------------------------------------------------------------------
     3) HELPERS
     ------------------------------------------------------------------- */

  // Turns any title into a simple comparable form:
  //   "Collection & Marketing Room"  ->  "collection and marketing room"
  function normalize(text) {
    return String(text)
      .toLowerCase()
      .replace(/&/g, ' and ')      // "&" and "and" count as the same word
      .replace(/[^a-z0-9]+/g, ' ') // remove punctuation / extra spaces
      .trim();
  }

  // Fast lookup table:  normalized title  ->  image file name
  const FILE_BY_TITLE = new Map();
  ROOMS.forEach(function (room) {
    room.names.forEach(function (name) {
      FILE_BY_TITLE.set(normalize(name), room.file);
    });
  });

  // If a custom image is missing (wrong name / not uploaded yet), put the
  // ORIGINAL picture back so the card never shows a broken image.
  function handleImageError(event) {
    const img = event.target;
    const current = img.getAttribute('src') || '';

    // Only react when OUR image failed (not the original one).
    if (current.indexOf(IMAGE_FOLDER) !== 0) return;

    img.dataset.roomArtFailed = '1'; // remember, so we never retry in a loop
    img.setAttribute('src', img.dataset.roomArtOriginal || '');
    console.warn('[room-art] Image not found, original restored:', current);
  }

  // Swaps ONE <img> to the new picture.
  function swapImage(img, url) {
    // A previous attempt failed -> leave the original picture alone.
    if (img.dataset.roomArtFailed) return;

    // Already using the new picture -> nothing to do.
    // (This check also stops an endless loop with the MutationObserver below.)
    if (img.getAttribute('src') === url) return;

    // Remember the original picture once, so it can be restored on error.
    if (!img.dataset.roomArtOriginal) {
      img.dataset.roomArtOriginal = img.getAttribute('src') || '';
    }

    // Add the error listener only once per image.
    if (!img.dataset.roomArtBound) {
      img.dataset.roomArtBound = '1';
      img.addEventListener('error', handleImageError);
    }

    // A leftover "srcset" (or <picture><source>) would override "src",
    // so clear them before setting the new picture.
    img.removeAttribute('srcset');
    const picture = img.closest('picture');
    if (picture) {
      picture.querySelectorAll('source').forEach(function (source) {
        source.removeAttribute('srcset');
      });
    }

    img.setAttribute('src', url);
  }

  /* -------------------------------------------------------------------
     4) MAIN JOB: find every room card and swap its picture
     ------------------------------------------------------------------- */
  function applyRoomArt() {
    const root = document.getElementById(RESULTS_ID);
    if (!root) return;

    // Step A — find the TITLE element of every room card.
    // A "title element" is an element with no child elements whose text
    // is exactly one of the room names above.
    const titles = [];
    root.querySelectorAll('*').forEach(function (el) {
      if (el.children.length > 0) return; // only look at the innermost elements
      const file = FILE_BY_TITLE.get(normalize(el.textContent));
      if (file) titles.push({ el: el, file: file });
    });

    // Step B — for each title, find the picture that belongs to the same card.
    titles.forEach(function (title) {
      // Walk UP from the title until we reach an element that contains an
      // <img>. The first one we meet is the card itself.
      let card = title.el;
      let img = null;
      while (card && card !== root) {
        img = card.querySelector('img');
        if (img) break;
        card = card.parentElement;
      }
      if (!img) return; // this card has no <img> (nothing to swap)

      // Safety check: the card must contain exactly ONE room title.
      // If it contains more, we climbed too far (into the whole grid)
      // and the picture could belong to a different card -> skip it.
      const titlesInsideCard = titles.filter(function (t) {
        return card.contains(t.el);
      }).length;
      if (titlesInsideCard !== 1) return;

      swapImage(img, IMAGE_FOLDER + title.file);
    });
  }

  /* -------------------------------------------------------------------
     5) KEEP IT WORKING WHEN THE CARDS CHANGE
     The cards are rebuilt whenever the visitor clicks a filter
     ("All models", "House & rooms", ...) or switches tabs. A
     MutationObserver watches for that and re-applies the images.
     ------------------------------------------------------------------- */
  let scheduled = false;

  // Run applyRoomArt at most once per frame, even if many changes arrive.
  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      applyRoomArt();
    });
  }

  function start() {
    const root = document.getElementById(RESULTS_ID);
    if (!root) {
      console.warn('[room-art] #' + RESULTS_ID + ' not found - script is idle.');
      return;
    }

    new MutationObserver(scheduleApply).observe(root, {
      childList: true,                    // cards added / removed
      subtree: true,                      // ...anywhere inside the grid
      attributes: true,                   // also catch late "src" changes
      attributeFilter: ['src', 'srcset'], // (e.g. lazy-loading code)
    });

    applyRoomArt(); // first run, in case the cards are already on the page
  }

  // Start as soon as the page structure is ready.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
