import {
  baseCardsPromise,
  legalCardsPromise,
  types,
  typesColors
} from './cards.js';
import {  pokedexPromise } from './pokedex.js';
import {
  makePokeList,
  makePokeItem,
  createPokémonIcon,
} from './icons.js';
import { groupBy, shuffleArray } from './helper.js';


function reduceAddAvg(attr) {
  return function(p,v) {
    ++p.count
    p.sum += v[attr];
    p.avg = p.sum/p.count;
    return p;
  };
}
function reduceRemoveAvg(attr) {
  return function(p,v) {
    --p.count
    p.sum -= v[attr];
    if (p.count == 0) {
      p.avg = -1;
    } else {
      p.avg = p.sum/p.count;
    }
    return p;
  };
}
function reduceInitAvg() {
  const obj = {count:0, sum:0, avg:0};
  obj.valueOf = function() {
    return this.avg;
  };
  return obj;
}

const currencyFormatter = d3.format('.2f');
const spreadGroup = x => [x.key, x.value];


let favoriteFirstGen = '1';
const firstGenSelector = document.querySelector('#gen1-favorite');

(async () => {
  const cards = await baseCardsPromise;
  const pokedex = await pokedexPromise;

  const gen1Ranks = (() => {
    const firstGen = [...pokedex.entries()].filter(x => x[1].generation == 1);
    const sorted = firstGen.sort(
      (a,b) => a[1].generalRanking-b[1].generalRanking
    );
    return new Map(sorted.map(([n,], i) => [n,i+1]));
  })();

  const cfCards = crossfilter([...cards.values()]);
  const dimensions = {};
  const groups = {};
  const maps = {};
  const lists = {};
  const charts = {};
  window.cards = cards;
  window.pokedex = pokedex;
  window.groups = groups;
  window.dimensions = dimensions;
  window.maps = maps;


  dimensions.rarity = cfCards.dimension(x => x.rarity || 'Black Star');
  dimensions.price = cfCards.dimension(x => x.price);
  dimensions.type = cfCards.dimension(x => x.types, true);
  dimensions.pokedexNumber = cfCards.dimension(x => x.nationalPokedexNumber);
  dimensions.rankingAndPrice = cfCards.dimension(x =>[
    x.price,
    gen1Ranks.get(x.nationalPokedexNumber),
    x.id,
    x.types[0],
    x.nationalPokedexNumber
  ]);

  dimensions.rankingAndDex = cfCards.dimension(x =>[
    x.nationalPokedexNumber,
    gen1Ranks.get(x.nationalPokedexNumber)
  ]);

  groups.priceByDex = dimensions.pokedexNumber.group().reduce(
    reduceAddAvg('price'), reduceRemoveAvg('price'), reduceInitAvg
  );

  groups.rankingAndDex = dimensions.rankingAndDex.group().reduceCount();
  groups.rankingAndPrice = dimensions.rankingAndPrice.group()
                                                     .reduceSum(x=>x.price);
  groups.type = dimensions.type.group().reduceCount();
  groups.pokedexNumber = dimensions.pokedexNumber.group().reduceCount();

  maps.pricesByDex = new Map(groups.priceByDex.all().map(spreadGroup));
  maps.cards = new Map(groups.pokedexNumber.all().map(spreadGroup));
  maps.cardsByDex = groupBy(cards.values(), 'nationalPokedexNumber');

  cfCards.onChange(() => { for (let key in lists) lists[key]();});

  function updateFirstGenFavorite() {
    document.querySelectorAll('.gen1f-icon').forEach(x => {
      const icon = createPokémonIcon(favoriteFirstGen);
      x.childNodes[0].replaceWith(icon);
    });

    document.querySelectorAll('.gen1f-name').forEach(x => {
      x.textContent = pokedex.get(+favoriteFirstGen).name;
    });

    document.querySelectorAll('.gen1f-cards').forEach(x => {
      const cards = maps.cards.get(+favoriteFirstGen);
      if (cards) {
          x.textContent = cards > 1 ? `${cards} cartas` : `${cards} carta`;
      } else {
        x.textContent = 'nenhuma carta';
      }
    });

    document.querySelectorAll('.gen1f-cards-count').forEach(x => {
      const cards = maps.cards.get(+favoriteFirstGen);
      if (cards) {
          x.textContent = cards > 5 ? 'algumas delas' : 'elas';
      } else {
        x.textContent = '';
      }
    });

    document.querySelectorAll('span.gen1f-price').forEach(x => {
      if (maps.pricesByDex.get(+favoriteFirstGen)) {
          x.textContent = currencyFormatter(
            maps.pricesByDex.get(+favoriteFirstGen).avg
          ) + ' dólares';
      } else {
        x.textContent = 'sem preço registrado';
      }
    });

    document.querySelectorAll('li.gen1f-price').forEach(x => {
      const favorite = pokedex.get(+favoriteFirstGen);
      const price = maps.pricesByDex.get(+favoriteFirstGen).avg;
      const li = makePokeItem(
        [+favoriteFirstGen, undefined, favorite.name],
        `${favorite.name} ${currencyFormatter(price)}\$`
      );
      x.innerHTML = li.innerHTML;
    })

    {
      let div = document.querySelector('#gen1f-sampled-cards');
      div.innerHTML = '';
      let cards = shuffleArray(maps.cardsByDex.get(+favoriteFirstGen));
      for (let card of cards.slice(0,5)) {
        let img = document.createElement('img');
        img.src = card.imageURL;
        div.appendChild(img);
      }
    }

    charts['gen1-pop-by-price'].render();
  }

  for (let pokemon of pokedex.values()) {
    if (pokemon.generation != 1) continue;
    const option = document.createElement('option');
    option.value = pokemon.pokedexNumber;
    option.appendChild(document.createTextNode(pokemon.name));
    firstGenSelector.childNodes[1].appendChild(option);
  }
  firstGenSelector.childNodes[1].onchange = function(e) {
    favoriteFirstGen = e.target.value;
    updateFirstGenFavorite();
  }

  let chart;

  {
    charts['gen1-types'] = dc.barChart('#gen1-types');
    chart = charts['gen1-types'];
    chart.height(550)
         .x(d3.scaleBand())
         .xUnits(dc.units.ordinal)
         .yAxisLabel('Quantidade de Cartas')
         .colors(typesColors)
         .colorAccessor(d => d.key)
         .brushOn(true)
         .dimension(dimensions.type)
         .group(groups.type)
         .controlsUseVisibility(true)
         .addFilterHandler((filters, filter) => {
           filters.push(filter),filters;
           return filters;
         });
  }

  {
    const yDomain = [
      dimensions.price.bottom(1)[0].price,
      dimensions.price.top(1)[0].price
    ];
    const yScale = d3.scaleLog().domain(yDomain).nice();

    const yTicks = [
      0.01, 0.02, 0.05,  0.10,  0.20,  0.30,  0.50,
      1.00, 2.00, 5.00, 10.00, 20.00, 30.00, 50.00,
    ].map(yScale);

    groups.logPriceByRarity = dimensions.rarity.group().reduce(
      (p,v) => {
        if (!isNaN(v.price)) p.push(yScale(v.price));
        return p;
      },
      (p,v) => {
        if (!isNaN(v.price)) p.splice(p.indexOf(yScale(v.price)), 1)
        return p;
      },
      () => []
    );

    charts['gen1-prices-by-rarity'] = dc.boxPlot('#gen1-prices-by-rarity');
    chart = charts['gen1-prices-by-rarity'];
    chart.height(550)
         .dimension(dimensions.rarity)
         .group(groups.logPriceByRarity)
         .y(d3.scaleLinear().domain([yScale(0.009),yScale(50)]))
         .tickFormat(x => {
           x = yScale.invert(x)
           if (x >= 1) return `${currencyFormatter(x)}\$`
           else return `${Math.round(x*100)}¢`
          });
    chart.yAxis().tickValues(yTicks)
         .tickFormat(x => {
           x = yScale.invert(x)
           if (x >= 1) return `${currencyFormatter(x)}\$`
           else return `${Math.round(x*100)}¢`
          });
    chart.margins().left = 40;
    chart.ordering(x => {
      switch(x.key) {
        case 'Common': return 0;
        case 'Uncommon': return 1;
        case 'Rare': return 2;
        case 'Black Star': return 3;
      }
    });
    const tooltip = d3.tip().html(d => {
      return d.key;
    });
    chart.on('pretransition.add-tip', (chart, filter) => {
      chart.selectAll('circle.outlier')
          .call(tooltip)
          .on('mouseover', tooltip.show)
          .on('mouseout', tooltip.hide);
    });
  }

  {
    const xDomain = d3.extent(groups.rankingAndPrice.all().map(x=>x.key[0]));
    const yDomain = d3.extent(groups.rankingAndPrice.all().map(x=>x.key[1]));
    yDomain[0] -= 1;
    yDomain[1] += 1;
    yDomain.reverse();

    xDomain[0] = 0.01;
    xDomain[1] = 50;

    const xTicks = [
      0.01, 0.02, 0.05,  0.10,  0.20,  0.30,  0.50,
      1.00, 2.00, 5.00, 10.00, 20.00, 30.00, 50.00,
    ]

    charts['gen1-pop-by-price'] = dc.scatterPlot('#gen1-pop-by-price');
    chart = charts['gen1-pop-by-price'];
    chart.height(550)
         .colors(typesColors)
         .colorAccessor(d => {
           if (d.key[4] == +favoriteFirstGen) {return 'Favorite';}
           else return d.key[3];
         })
         .y(d3.scaleLinear().domain(yDomain))
         .x(d3.scaleLog().domain(xDomain))
         .brushOn(false)
         .title(() => undefined)
         .dimension(dimensions.rankingAndPrice)
         .group(groups.rankingAndPrice)
         .xAxisLabel('Preço')
         .symbolSize(6);
    chart.yAxis().tickFormat(x => `${x==0?1:x}º`);
    chart.xAxis().tickValues(xTicks)
         .tickFormat(x => {
           if (x >= 1) return `${currencyFormatter(x)}\$`
           else return `${Math.round(x*100)}¢`
          });

    const tooltip = d3.tip().html(d => {
      const [price, rank, id] = d.key;
      const card = cards.get(id);
      const e = document.createElement('div');
      e.appendChild(
        createPokémonIcon(card.nationalPokedexNumber, card.types[0])
      );
      e.appendChild(document.createElement('br'));
      e.appendChild(document.createTextNode(card.name));
      const setNode = document.createElement('div');
      setNode.style.fontSize = '0.5rem';
      setNode.innerHTML = `${card.set} - ${card.number}`;
      e.appendChild(setNode);
      e.appendChild(document.createTextNode(`Preço: ${price}\$`));
      e.appendChild(document.createElement('br'));
      e.appendChild(document.createTextNode(`Rank: ${rank}`));

      return `<div class='price-tool'>${e.innerHTML}</span>`;
    });
    chart.on('pretransition.add-tip', (chart, filter) => {
      chart.selectAll('path.symbol')
          .call(tooltip)
          .on('mouseover', tooltip.show)
          .on('mouseout', tooltip.hide);
    });
  }

  {
    charts['gen1-pop-by-cards'] = dc.rowChart('#gen1-pop-by-cards');
    chart = charts['gen1-pop-by-cards'];
    chart.height(550)
         .title(() => undefined)
         .dimension(dimensions.rankingAndDex)
         .group(groups.rankingAndDex)
         .data(g => g.all().filter(a => a.value > 0).sort((a,b) => a.key[1]-b.key[1]).slice(0,10))
         .othersGrouper(false)
         .ordering(d => d.key[1])
         .label(d => `${d.key[1]}º ${pokedex.get(d.key[0]).name}`)
         .colors(['#003153']);

    const tooltip = d3.tip().html(d => {
      const [dex, rank] = d.key;
      const pokemon = pokedex.get(dex);
      const e = document.createElement('div');
      e.appendChild(createPokémonIcon(dex));
      e.appendChild(document.createElement('br'));
      e.appendChild(document.createTextNode(pokemon.name));
      const setNode = document.createElement('div');
      setNode.style.fontSize = '0.5rem';
      setNode.innerHTML = `${d.value} cartas`;
      e.appendChild(setNode);

      return `<div class='pokemon-tool'>${e.innerHTML}</span>`;
    });
    chart.on('pretransition.add-tip', (chart, filter) => {
      chart.svg()
          .append('text')
          .attr('class', 'x-axis-label')
          .attr('text-anchor', 'middle')
          .attr('x', chart.width()/2)
          .attr('y', chart.height()-3.5)
          .text('Cartas');
      chart.selectAll('g.row')
          .call(tooltip)
          .on('mouseover', tooltip.show)
          .on('mouseout', tooltip.hide);
    });
  }

  lists.pricesByDexNumber = () => makePokeList(
    '#gen1-prices-by-dexnumber',
    groups.priceByDex.top(10).filter(o => o.value >= 0),
    (o) => [
      [o.key, undefined, pokedex.get(o.key).name],
      `${pokedex.get(o.key).name} ${currencyFormatter(o.value.avg)}\$`
    ]
  );

  lists.mostRepresented = () => makePokeList(
    '#gen1-most-represented',
    groups.pokedexNumber.top(10).filter(o => o.value > 0),
    (o) => [
      [o.key, undefined, pokedex.get(o.key).name],
      `${pokedex.get(o.key).name} ${o.value} cartas`
    ]
  );

  lists.mostExpensive = () => {
    let div = document.querySelector('#gen1-expensive-cards');
    div.innerHTML = '';
    let cards = dimensions.price.top(5);
    for (let card of cards) {
      let img = document.createElement('img');
      img.src = card.imageURL;
      div.appendChild(img);
    }
  }

  for (let key in lists) lists[key]();


  updateFirstGenFavorite();
  dc.renderAll();
})();
