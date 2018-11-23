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
    id, name, hp, rarity, types, weaknesses,
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
    rarity,
    imageURL: card.imageUrl,

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

function Type(name, color) {
  return { name, color }
}


export const legalCards = Promise.all([cleanedLegalCards,prices]).then(d => {
  const [ cards, prices ] = d;
  const indexedCards = new Map(cards)
  for (const entry of prices) {
    const card = indexedCards.get(`${entry.set}-${entry.num}`);
    if (card) {
      card.price = +entry.price;
    }
  }

  return indexedCards;
});

export const types = [
  new Type('Grass'    , '#7DB808'),
  new Type('Fire'     , '#E24242'),
  new Type('Water'    , '#5bc7e5'),
  new Type('Lightning', '#fab536'),
  new Type('Fighting' , '#ff501f'),
  new Type('Psychic'  , '#a65e9a'),
  new Type('Colorless', '#e5d6d0'),
  new Type('Darkness' , '#2c2e2b'),
  new Type('Metal'    , '#8a776e'),
  new Type('Dragon'   , '#c6a114'),
  new Type('Fairy'    , '#e03a83'),
]