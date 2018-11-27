const damageRegex = /(\d+)(\+|×|-)?/u;

const legalSets = [
  'Sun & Moon.json',
  'Guardians Rising.json',
  'Burning Shadows.json',
  'Shining Legends.json',
  'Crimson Invasion.json',
  'Ultra Prism.json',
  'Forbidden Light.json',
  'Celestial Storm.json',
  'Dragon Majesty.json',
  'Lost Thunder.json',
  'Sun & Moon Black Star Promos.json',
];

function cleanCard(card) {
  const {
    id, set, artist, name, hp, rarity, types, weaknesses, nationalPokedexNumber
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

const cleanedLegalCards = (
  Promise.all(legalSets.map(s => d3.json(`data/${s}`)))
         .then(d => [].concat(...d))
         .then(d => d.filter(x => x.supertype === 'Pokémon').map(cleanCard))
);

const prices = d3.tsv('data/prices.tsv');

// function Type(name, color) {
//   return { name, color }
// }


export const legalCardsPromise = Promise.all([cleanedLegalCards,prices]).then(d => {
  const [ cards, prices ] = d;
  const indexedCards = new Map(cards);
  for (const entry of prices) {
    const card = indexedCards.get(`${entry.set}-${entry.num}`);
    if (card) {
      card.price = +entry.price;
    }
  }

  return indexedCards;
});

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
}