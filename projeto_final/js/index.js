import {
  baseCardsPromise,
  legalCardsPromise,
  types
} from './cards.js';

import { pokedexPromise } from './pokedex.js'

function createSVGIcon(x,y) {
  let height = 3054;
  let width = 1314;
  let left = -x;
  let right = width-left-40;
  let top = -y;
  let bottom = height-top-30;

  let image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  image.setAttribute('width', 1314);
  image.setAttribute('height', 3054);
  image.setAttribute('x',-left);
  image.setAttribute('y',-top);
  image.setAttribute('href', './third-party/img/pokesprite.png');
  image.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`
  return image;
}

function createPokémonIcon(dexNumber, type) {
  let dexn = String(dexNumber).padStart(3,'0');
  let span = document.createElement('span');
  span.className = `spriteHolder pkspr pkmn-${dexn}`;
  span.style.backgroundColor = type ? types[type] : '#fff';

  if (dexNumber > 0) {
    PkSpr.decorate(span);
    span.children[0].className = 'sprite';
  }
  return span;
}

(async () => {
  const list = document.querySelectorAll('ol#list')[0];
  let cards = await baseCardsPromise;
  let pokedex = await pokedexPromise;
  
  let cfCards = crossfilter([...cards.values()]);
  let dimensions = {};
  let groups = {};
  
  
  // dimensions.price = cfCards.dimension(x => x.price);
  dimensions.type = cfCards.dimension(x => x.types, true);
  dimensions.pokedexNumber = cfCards.dimension(x => x.nationalPokedexNumber);
  
  groups.pokedexNumber = dimensions.pokedexNumber.group();
  groups.type = dimensions.type.group();

  let fragments = document.createDocumentFragment();
  groups.pokedexNumber.top(10).forEach(o => {
    let e = document.createElement('li');
    e.appendChild(createPokémonIcon(o.key));
    e.appendChild(document.createTextNode(`${o.value} cartas`));
    fragments.appendChild(e);
  })
  list.appendChild(fragments);
  
  window.groups = groups;
  window.dimensions = dimensions;
  window.cfCards = cfCards;
  window.cards = cards;
  window.pokedex = pokedex;
})();