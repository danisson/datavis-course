import { indexer } from './helper.js';

const damageRegex = /(\d+)(\+|×|-)?/u;

export const legalSets = [
  'Sun & Moon',
  'Guardians Rising',
  'Burning Shadows',
  'Shining Legends',
  'Crimson Invasion',
  'Ultra Prism',
  'Forbidden Light',
  'Celestial Storm',
  'Dragon Majesty',
  'Lost Thunder',
  'Sun & Moon Black Star Promos',
];

export const originalSets = [
  'Base',
  'Jungle',
  'Fossil',
  // 'Base Set 2',
  'Team Rocket',
  'Gym Heroes',
  'Gym Challenge',
  'Wizards Black Star Promos'
];

function cleanCard(card) {
  const {
    id, set, number,
    artist, name, hp, rarity, types, weaknesses, nationalPokedexNumber
  } = card;

  const attacks = (card.attacks || []).map((a) => {
    const matches = damageRegex.exec(a.damage);
    const attack = {};

    if (matches !== null) {
      return {
        name: a.name,
        damage: +matches[1],
        isSpecial: !!matches[2],
      };
    } else if (a.damage === '' || a.damage === '?') {
      return {
        name: a.name,
        damage: 0,
        isSpecial: true,
      };
    }
    return null;
  });

  return {
    // Basic information
    name,
    set,
    number,
    id,
    nationalPokedexNumber,
    rarity,
    imageURL: card.imageUrl,
    artist,

    // Game Information
    hp,
    attacks,
    types,
    weaknesses,
    retreatCost: card.convertedRetreatCost,
  };
}

async function getCards(setNames) {
  const set = await Promise.all(setNames.map(s => d3.json(`data/${s}.json`)));
  const cards = [].concat(...set);
  const pokemon = cards.filter(x => x.supertype === 'Pokémon').map(cleanCard);
  return pokemon;
}

const pricesPromise = d3.tsv('data/prices.tsv');
const cpPromise = d3.csv('data/cp.csv');

async function setPrices(cardsPromise) {
  const cards = await cardsPromise;
  const prices = await pricesPromise;

  for (const entry of prices) {
    const card = cards.get(`${entry.set}-${entry.num}`);
    if (card && +entry.price) card.price = +entry.price;
  }

  return cards;
}

async function setCP(cardsPromise) {
  const cards = await cardsPromise;
  const cps = await cpPromise;

  for (const entry of cps) {
    const card = cards.get(`${entry.set}-${entry.num}`);
    if (card && +entry['mean cp']) card.cp = +entry['mean cp'];
  }

  return cards;
}

const indexById = indexer('id');
export const legalCardsPromise = (
  getCards(legalSets).then(indexById)
                     .then(setPrices)
                     .then(setCP)
);
export const baseCardsPromise = getCards(originalSets).then( cards =>
  cards.filter(x => x.nationalPokedexNumber <= 151)
).then(indexById).then(setPrices);

export const types = {
  'Grass'    : '#7DB808',
  'Fire'     : '#E24242',
  'Water'    : '#5bc7e5',
  'Lightning': '#fab536',
  'Fighting' : '#ff501f',
  'Psychic'  : '#a65e9a',
  'Colorless': '#e5d6d0',
  'Darkness' : '#2c2e2b',
  'Metal'    : '#8a776e',
  'Dragon'   : '#c6a114',
  'Fairy'    : '#e03a83',
  'Favorite' : '#000'
}

export const typesColors = (x) => types[x];

export function rarityOrder(rarity) {
  switch(rarity) {
    case 'Common': return 0;
    case 'Uncommon': return 1;
    case 'Rare': return 2;
    case 'Rare Holo': return 3;
    case 'Rare Holo GX': return 4;
    case 'Rare Ultra': return 5;
    case 'Rare Secret': return 6;
    case 'Shining': return 7;
    case 'Black Star': return 8;
  }
}

export const rarityColors = (x) => d3.interpolateMagma((8-rarityOrder(x))/8)