
/* NFG Store Upgrade: Room-colored store, product filters,
   3D viewer and Request Order functionality.
   Store-only version. Loaded last by index.html. */

(function () {
  'use strict';

  var ITEMS = [
    {"id":"0001","n":"Wooden bed","c":"Furniture","r":"Bedroom 1 · Black Room","rk":"black","d":"Wooden bed frame with a mattress, the centerpiece of the Black Room bedroom."},
    {"id":"0002","n":"Wooden bedside cabinet","c":"Furniture","r":"Bedroom 1 · Black Room","rk":"black","d":"Wooden bedside cabinet that sits next to the bed."},
    {"id":"0003","n":"Bedside lamp","c":"Lighting","r":"Bedroom 1 · Black Room","rk":"black","d":"Bedside lamp for soft light beside the bed."},
    {"id":"0004","n":"Wooden wardrobe","c":"Furniture","r":"Bedroom 1 · Black Room","rk":"black","d":"Tall wooden wardrobe for the Black Room bedroom."},
    {"id":"0005","n":"Wooden chair","c":"Furniture","r":"Bedroom 1 · Black Room","rk":"black","d":"Simple wooden chair for the bedroom corner."},
    {"id":"0006","n":"Basketball","c":"Sports","r":"Bedroom 1 · Black Room","rk":"black","d":"Basketball model from the Black Room."},

    {"id":"0007","n":"Upholstered bed","c":"Furniture","r":"Bedroom 2 · Basement","rk":"basement","d":"Upholstered bed with a padded headboard, mattress, bedding and pillows."},
    {"id":"0008","n":"Writing desk","c":"Furniture","r":"Bedroom 2 · Basement","rk":"basement","d":"Writing desk with a fitted side cabinet and a light finish."},
    {"id":"0009","n":"White wardrobe","c":"Furniture","r":"Bedroom 2 · Basement","rk":"basement","d":"White wardrobe with tall storage for Bedroom 2."},
    {"id":"0010","n":"Accent armchair","c":"Furniture","r":"Bedroom 2 · Basement","rk":"basement","d":"Sculpted accent chair with an upholstered seat and slender legs."},
    {"id":"0011","n":"Curtain · variant 1","c":"Decor","r":"Bedroom 2 · Basement","rk":"basement","d":"Window curtain (variant 1) from the Basement bedroom."},
    {"id":"0013","n":"Tall decorative vase","c":"Decor","r":"Bedroom 2 · Basement","rk":"basement","d":"Tall decorative vase for shelves and corners."},
    {"id":"0014","n":"Low decorative vase","c":"Decor","r":"Bedroom 2 · Basement","rk":"basement","d":"Low decorative vase for tables and window sills."},

    {"id":"0015","n":"Dining table","c":"Furniture","r":"Kitchen · Red Room","rk":"red","d":"Rectangular dining table with a light top and two open frame legs."},
    {"id":"0020","n":"Dining chair · position 5","c":"Furniture","r":"Kitchen · Red Room","rk":"red","d":"Dining chair at position 5 of the Red Room kitchen table."},
    {"id":"0022","n":"Work table","c":"Furniture","r":"Kitchen · Red Room","rk":"red","d":"Work table for the Red Room kitchen."},
    {"id":"0023","n":"Sink basin","c":"Kitchen Equipment","r":"Kitchen · Red Room","rk":"red","d":"Kitchen sink basin (basin only, fixtures are not included)."},
    {"id":"0024","n":"Appliance block","c":"Kitchen Equipment","r":"Kitchen · Red Room","rk":"red","d":"Generic kitchen appliance block that stands in for the appliances."},

    {"id":"0025","n":"Round coffee table","c":"Furniture","r":"Orange Room","rk":"orange","d":"Round coffee table with a ribbed cylindrical base."},
    {"id":"0026","n":"Arcade cabinet","c":"Entertainment","r":"Orange Room","rk":"orange","d":"Arcade cabinet from the Orange Room."},

    {"id":"0027","n":"Studio headphones","c":"Audio Equipment","r":"Studio · Green Room","rk":"green","d":"Studio headphones for monitoring and mixing in the Green Room."},
    {"id":"0028","n":"Apple MacBook Pro model","c":"Computers","r":"Studio · Green Room","rk":"green","d":"Laptop model with an open screen, keyboard and detailed outer shell."},
    {"id":"0029","n":"Studio microphone assembly","c":"Audio Equipment","r":"Studio · Green Room","rk":"green","d":"Studio microphone with a shock mount and stand."},
    {"id":"0030","n":"Yamaha HS5 monitor · left","c":"Audio Equipment","r":"Studio · Green Room","rk":"green","d":"Studio monitor with a black cabinet and white woofer."},
    {"id":"0031","n":"Yamaha HS5 monitor · right","c":"Audio Equipment","r":"Studio · Green Room","rk":"green","d":"Studio monitor with a black cabinet and white woofer."},
    {"id":"0032","n":"Studio task chair · 1","c":"Furniture","r":"Studio · Green Room","rk":"green","d":"Padded studio task chair with armrests and a caster base."},
    {"id":"0034","n":"Upholstered sofa","c":"Furniture","r":"Studio · Green Room","rk":"green","d":"Upholstered sofa with three back cushions and matching side pillows."},
    {"id":"0035","n":"Keyboard controller","c":"Musical Instruments","r":"Studio · Green Room","rk":"green","d":"Keyboard controller for writing and playing parts in the studio."}
  ];

  /* ROOM COLORS */
  var ROOM = {
    black: '#000000',
    red: '#d62820',
    orange: '#ff9500',
    yellow: '#ffcc00',
    green: '#2fb457',
    basement: '#3b3b45'
  };

  var LABEL = {
    black: 'Black Room',
    red: 'Red Room',
    orange: 'Orange Room',
    yellow: 'Yellow Room',
    green: 'Green Room',
    basement: 'Basement'
  };

  var $ = function (s, r) {
    return (r || document).querySelector(s);
  };

  var $$ = function (s, r) {
    return [].slice.call((r || document).querySelectorAll(s));
  };

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c];
    });
  }

  /* ---------- STORE PRODUCT CARDS ---------- */

  function card(i) {
    return '<div class="product-card nfg-room-card" data-r="' + i.rk +
      '" style="--room:' + ROOM[i.rk] + '">' +

      '<div class="product-img-wrapper">' +
      '<img src="assets/Store%20Models/NFG-I' + i.id +
      '.png" alt="' + esc(i.n) +
      '" loading="lazy" onerror="this.onerror=null;this.src=\'logo.png.webp\'">' +
      '</div>' +

      '<div class="product-info">' +
      '<span class="product-category">' +
      esc(i.c) + ' · ' + esc(i.r) +
      '</span>' +

      '<h3>' + esc(i.n) + '</h3>' +
      '<p>' + esc(i.d) + '</p>' +

      '<div class="product-actions">' +
      '<button class="btn-3d" data-m="' + i.id + '">View in 3D</button>' +
      '<button class="btn-buy-store" data-o="' + i.id + '">Request order</button>' +
      '</div>' +

      '</div>' +
      '</div>';
  }

  /* ---------- STORE AND ROOM FILTERS ---------- */

  function store() {
    var g = $('#storeGrid');

    if (!g || !ITEMS.length) return;

    var rooms = [];

    ITEMS.forEach(function (i) {
      if (rooms.indexOf(i.rk) < 0) {
        rooms.push(i.rk);
      }
    });

    var bar = $('#nfgRoomBar');

    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'nfgRoomBar';
      bar.className = 'nfg-roombar';
      g.parentNode.insertBefore(bar, g);
    }

    bar.innerHTML =
      '<button class="on" data-r="all">All rooms</button>' +
      rooms.map(function (r) {
        return '<button data-r="' + r +
          '" style="--room:' + ROOM[r] + '">' +
          LABEL[r] +
          '</button>';
      }).join('');

    /* Room filtering */

    bar.onclick = function (e) {
      var b = e.target.closest('button');

      if (!b) return;

      $$('button', bar).forEach(function (x) {
        x.classList.toggle('on', x === b);
      });

      $$('.nfg-room-card', g).forEach(function (c) {
        c.hidden =
          b.dataset.r !== 'all' &&
          c.dataset.r !== b.dataset.r;
      });
    };

    /* Display products */

    g.innerHTML = ITEMS.map(card).join('');

    /* Product actions */

    g.onclick = function (e) {
      var b = e.target.closest('[data-m],[data-o]');

      if (!b) return;

      var id = b.dataset.m || b.dataset.o;

      var it = ITEMS.filter(function (x) {
        return x.id === id;
      })[0];

      if (!it) return;

      var img = 'assets/Store%20Models/NFG-I' + id + '.png';

      if (b.dataset.m) {
        if (typeof window.open3DViewer === 'function') {
          window.open3DViewer(
            'assets/Store%20Models/NFG-I' + id + '.glb',
            it.n,
            img
          );
        }
      } else {
        if (typeof window.openPayment === 'function') {
          window.openPayment(
            it.n + ' (NFG-I' + id + ')'
          );
        }
      }
    };
  }

  /* ---------- BOOT ---------- */

  /* Run after index.html's own populateStore. */

  if (document.readyState === 'complete') {
    store();
  } else {
    document.addEventListener('DOMContentLoaded', store);
  }

})();
