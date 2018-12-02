const damageRegex = /(\d+)(\+|×|-)?/u;

const legalSets = [
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

const originalSets = [
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
    } else if (a.damage === '') {
      return {
        name: a.name,
        damage: 0,
        isSpecial: true,
      };
    }
    return null;
  });

  return [id,{
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
  }];
}

function loadAndCleanSet(set) {
  return Promise.all(set.map(s => d3.json(`data/${s}.json`)))
         .then(d => [].concat(...d))
         .then(d => d.filter(x => x.supertype === 'Pokémon').map(cleanCard));
}

const prices = d3.tsv('data/prices.tsv');
function setPricesAndIndex(cleanedCards) {
  return Promise.all([cleanedCards,prices]).then(d => {
    const [ cards, prices ] = d;
    const indexedCards = new Map(cards);
    for (const entry of prices) {
      const card = indexedCards.get(`${entry.set}-${entry.num}`);
      if (card && +entry.price) {
        card.price = +entry.price;
      }
    }
    return indexedCards;
  });
}

export const legalCardsPromise = setPricesAndIndex(loadAndCleanSet(legalSets));
export const baseCardsPromise = setPricesAndIndex(
  loadAndCleanSet(originalSets).then( cards =>
    cards.filter(x => x[1].nationalPokedexNumber <= 151)
  )
);

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
