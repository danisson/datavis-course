import {
  originalSets,
  legalSets,
  baseCardsPromise,
  legalCardsPromise,
  types,
  typesColors,
  rarityOrder,
  rarityColors
} from './cards.js';
import {  pokedexPromise } from './pokedex.js';
import {
  makePokeList,
  makePokeItem,
  createPokémonIcon,
} from './icons.js';
import {
  avgReducer, currencyFormatter, groupBy, shuffleArray, Filterable
} from './helper.js';

dc.config.defaultColors(d3.schemeAccent);

const spreadGroup = x => [x.key, x.value];

{
  const items = document.querySelector('nav#main-nav').querySelectorAll('li');
  const sections = document.querySelectorAll('#intro,#gen1,#legal');
  const sectionClasses = 'has-text-justified section content';
  for (let item of items) {
    item.onclick = function (e) {
      items.forEach(i => i.className = '');
      sections.forEach(s => s.className = sectionClasses);
      const selectSection = document.querySelector(`#${this.dataset.section}`);
      this.className = 'is-active';
      selectSection.className += ' active';
      if (selectSection.id != 'intro')
        dc.renderAll(selectSection.id);
    };
  }
}


(async () => {
  const priceTicks = [
    0.01, 0.02, 0.05,  0.10,  0.20,  0.30,  0.50,
    1.00, 2.00, 5.00, 10.00, 20.00, 30.00, 50.00,
  ];
  const cards = await baseCardsPromise;
  const pokedex = await pokedexPromise;

  let favoriteFirstGen = '1';
  const firstGenSelector = document.querySelector('#gen1-favorite');

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
  window.dimensions = dimensions;
  window.groups = groups;
  window.maps = maps;
  window.lists = lists;
  window.charts = charts;

  dimensions.rarity = cfCards.dimension(x => x.rarity || 'Black Star');
  dimensions.price = cfCards.dimension(x => x.price || 0);
  dimensions.type = cfCards.dimension(x => x.types, true);
  dimensions.pokedexNumber = cfCards.dimension(x => x.nationalPokedexNumber);
  dimensions.artist = cfCards.dimension(x => x.artist);
  dimensions.cardsBySet = cfCards.dimension(x => x.set);
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

  groups.priceByDex = dimensions.pokedexNumber.group()
                                              .reduce(...avgReducer('price'));

  groups.rankingAndDex = dimensions.rankingAndDex.group().reduceCount();
  groups.rankingAndPrice = dimensions.rankingAndPrice.group()
                                                     .reduceSum(x=>x.price);
  groups.type = dimensions.type.group().reduceCount();
  groups.pokedexNumber = dimensions.pokedexNumber.group().reduceCount();
  groups.cardsBySet = dimensions.cardsBySet.group().reduceCount();;

  maps.pricesByDex = new Filterable(
    () => new Map(groups.priceByDex.all().map(spreadGroup))
  );
  maps.cards = new Filterable(
    () => new Map(groups.pokedexNumber.all().map(spreadGroup))
  );
  maps.cardsByDex = new Filterable(
    () => groupBy(cfCards.allFiltered(), 'nationalPokedexNumber')
  );

  maps.cardsByArtist = new Filterable(
    () => groupBy(cfCards.allFiltered(), 'artist')
  );

  cfCards.onChange(() => {
    for (let key in maps) maps[key].refresh();
    for (let key in lists) lists[key]();
  });

  function updateFirstGenFavorite() {
    document.querySelectorAll('.gen1f-icon').forEach(x => {
      const icon = createPokémonIcon(favoriteFirstGen);
      x.childNodes[0].replaceWith(icon);
    });

    document.querySelectorAll('.gen1f-name').forEach(x => {
      x.textContent = pokedex.get(+favoriteFirstGen).name;
    });

    document.querySelectorAll('.gen1f-cards').forEach(x => {
      const cards = maps.cards.value.get(+favoriteFirstGen);
      if (cards) {
          x.textContent = cards > 1 ? `${cards} cartas` : `${cards} carta`;
      } else {
        x.textContent = 'nenhuma carta no filtro atual';
      }
    });

    document.querySelectorAll('.gen1f-cards-count').forEach(x => {
      const cards = maps.cards.value.get(+favoriteFirstGen);
      if (cards) {
          x.textContent  = 'Vamos ver '
          x.textContent += cards > 5 ? 'algumas delas' : 'elas';
          x.textContent += ' aqui:';
      } else {
        x.textContent = '';
      }
    });

    document.querySelectorAll('li.gen1f-price').forEach(x => {
      const favorite = pokedex.get(+favoriteFirstGen);
      const price = maps.pricesByDex.value.get(+favoriteFirstGen).avg;
      let priceText;
      if (price >= 0)
        priceText = currencyFormatter(price)+'$';
      else
        priceText = '[nenhuma carta no filtro atual]';
      const li = makePokeItem(
        [+favoriteFirstGen, undefined, favorite.name],
        `${favorite.name} ${priceText}`
      );
      x.innerHTML = li.innerHTML;
    })

    {
      let div = document.querySelector('#gen1f-sampled-cards');
      div.innerHTML = '';
      let cards = shuffleArray(
        maps.cardsByDex.value.get(+favoriteFirstGen) || []
      );
      for (let card of cards.slice(0,5)) {
        let img = document.createElement('img');
        img.src = card.imageURL;
        img.title = (
          `${card.name} (${card.set}) ${currencyFormatter(card.price)}\$`
        );
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
    charts['gen1-types'] = dc.barChart('#gen1-types','gen1');
    chart = charts['gen1-types'];
    chart.height(550)
         .x(d3.scaleBand())
         .xUnits(dc.units.ordinal)
         .yAxisLabel('Quantidade de Cartas')
         .elasticY(true)
         .ordering(x => -x.value)
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
      dimensions.price.bottom(1)[0].price || 0.01,
      dimensions.price.top(1)[0].price
    ];
    const yScale = d3.scaleLog().domain(yDomain).nice();

    const yTicks = priceTicks.map(yScale);

    groups.logPriceByRarity = dimensions.rarity.group().reduce(
      (p,v) => {
        if (v.price && !isNaN(v.price)) p.push(yScale(v.price));
        return p;
      },
      (p,v) => {
        if (v.price && !isNaN(v.price)) p.splice(p.indexOf(yScale(v.price)), 1)
        return p;
      },
      () => []
    );

    charts['gen1-prices-by-rarity'] = dc.boxPlot('#gen1-prices-by-rarity','gen1');
    chart = charts['gen1-prices-by-rarity'];
    chart.height(550)
         .boldOutlier(true)
         .colors(rarityColors)
         .colorAccessor(x => x.key)
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
    chart.ordering(x => rarityOrder(x.key));
    chart.on('pretransition.add-tip', (chart, filter) => {
      chart.selectAll('circle.outlierBold')
           .selectAll('title').remove();
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

    const xTicks = priceTicks;

    charts['gen1-pop-by-price'] = dc.scatterPlot('#gen1-pop-by-price','gen1');
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
         .data(g => g.all().filter(x => !isNaN(x.value)))
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
      e.appendChild(document.createTextNode(
        `Preço: ${currencyFormatter(price)}\$`
      ));
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
    charts['gen1-pop-by-cards'] = dc.rowChart('#gen1-pop-by-cards','gen1');
    chart = charts['gen1-pop-by-cards'];
    chart.height(550)
         .title(() => undefined)
         .dimension(dimensions.rankingAndDex)
         .group(groups.rankingAndDex)
         .data(g => g.all().filter(a => a.value > 0).sort((a,b) => a.key[1]-b.key[1]).slice(0,10))
         .othersGrouper(false)
         .ordering(d => d.key[1])
         .label(d => `${d.key[1]}º ${pokedex.get(d.key[0]).name}`)
         .elasticX(true)
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

    let firstTime = true;

    chart.on('pretransition.add-tip', (chart, filter) => {
      if (firstTime) {
        firstTime = false;
        chart.svg()
            .append('text')
            .attr('class', 'x-axis-label')
            .attr('text-anchor', 'middle')
            .attr('x', chart.width()/2)
            .attr('y', chart.height()-3.5)
            .text('Cartas');
      }
      chart.selectAll('g.row')
          .call(tooltip)
          .on('mouseover', tooltip.show)
          .on('mouseout', tooltip.hide);
    });
  }

  {
    const yDomain = [
      dimensions.price.bottom(1)[0].price || 0.01,
      dimensions.price.top(1)[0].price
    ];
    const yScale = d3.scaleLog().domain(yDomain).nice();

    const yTicks = priceTicks.map(yScale);

    groups.logPriceByArtist = dimensions.artist.group().reduce(
      (p,v) => {
        if (v.price && !isNaN(v.price)) p.push(yScale(v.price));
        return p;
      },
      (p,v) => {
        if (v.price && !isNaN(v.price)) p.splice(p.indexOf(yScale(v.price)), 1)
        return p;
      },
      () => []
    );

    charts['gen1-price-by-artist'] = dc.boxPlot('#gen1-price-by-artist','gen1');
    chart = charts['gen1-price-by-artist'];
    chart.height(550)
         .boldOutlier(true)
         .elasticX(true)
         .dimension(dimensions.artist)
         .group(groups.logPriceByArtist)
         .data(g =>
             g.all().map(d => (d.map = a => a.call(d, d), d))
                    .filter(d => d.value.length > 0)
                    .sort((a,b) => b.value.length-a.value.length)
                    .slice(0,6)
         )
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

    chart.xAxis().tickFormat(a =>{
      let cards = maps.cardsByArtist.value.get(a);
      return `${a} - ${cards.length}`;
    });
    chart.margins().left = 50;
    chart.ordering(x => -x.value.length);
    chart.on('pretransition.add-tip', (chart, filter) => {
      chart.selectAll('circle.outlierBold')
           .selectAll('title').remove();
    });
  }

  {
    charts['gen1-pie'] = dc.pieChart('#gen1-pie','gen1');
    chart = charts['gen1-pie'];
    chart.height(550)
         .innerRadius(50)
         .dimension(dimensions.cardsBySet)
         .group(groups.cardsBySet)
         .legend(dc.legend())
         .ordering(x => originalSets.indexOf(x.key));
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
      img.title = (
        `${card.name} (${card.set}) ${currencyFormatter(card.price)}\$`
      );
      div.appendChild(img);
    }
  }

  lists.mostExpensiveRest = () => makePokeList(
    '#gen1-expensive-cards-rest',
    dimensions.price.top(15).slice(5).filter(o => o.price > 0),
    (o) => [
      [o.nationalPokedexNumber, o.types[0], o.name],
      `${o.name} <span class="small">(${o.set})</span> ${currencyFormatter(o.price)}\$`
    ]
  );

  lists.favorites = updateFirstGenFavorite

  for (let key in lists) lists[key]();
})();

(async () => {

  const priceTicks = [
      0.01,   0.02,   0.05,   0.10,  0.20,  0.30,  0.50,
      1.00,   2.00,   5.00,  10.00, 20.00, 30.00, 50.00,
    100.00, 150.00, 200.00
  ];

  const cards = await legalCardsPromise;
  const pokedex = await pokedexPromise;
  const cfCards = crossfilter([...cards.values()]);

  const allPokemon = (
    [...cards.values()].map(x => x.nationalPokedexNumber)
                       .sort((a,b) => a-b)
                       .filter((x,i,a) => i === 0 || a[i-1] != x)
  );

  window.cards = cards;
  window.pokedex = pokedex;

  let favoriteNumber = '1';
  const favoriteSelector = document.querySelector('#legal-favorite');
  for (let pkmnNumber of allPokemon) {
    const pokemon = pokedex.get(pkmnNumber);
    const option = document.createElement('option');
    option.value = pkmnNumber;
    option.appendChild(document.createTextNode(pokemon.name));
    favoriteSelector.childNodes[1].appendChild(option);
  }
  favoriteSelector.childNodes[1].onchange = function(e) {
    favoriteNumber = e.target.value;
    updateFavorite();
  }

  const dimensions = {};
  const groups = {};
  const maps = {};
  const lists = {};
  const charts = {};
  window.dimensions = dimensions;
  window.groups = groups;
  window.maps = maps;
  window.lists = lists;
  window.charts = charts;

  dimensions.rarity = cfCards.dimension(x => x.rarity || 'Black Star');
  dimensions.price = cfCards.dimension(x => x.price);
  dimensions.type = cfCards.dimension(x => x.types, true);
  dimensions.pokedexNumber = cfCards.dimension(x => x.nationalPokedexNumber);
  dimensions.artist = cfCards.dimension(x => x.artist);
  dimensions.cp = cfCards.dimension(x => x.cp || 0);
  dimensions.cardsBySet = cfCards.dimension(x => x.set);
  dimensions.cardsByGeneration = cfCards.dimension(x => 
    `Geração ${pokedex.get(x.nationalPokedexNumber).generation}`
  );
  dimensions.cpAndPrice = cfCards.dimension(x => [
    x.price,
    x.cp,
    x.id,
    x.types[0],
    x.nationalPokedexNumber
  ]);

  groups.priceByDex = dimensions.pokedexNumber.group()
                                              .reduce(...avgReducer('price'));

  groups.type = dimensions.type.group().reduceCount();
  groups.pokedexNumber = dimensions.pokedexNumber.group().reduceCount();
  groups.cpAndPrice = dimensions.cpAndPrice.group().reduceSum(x => x.price);
  groups.cardsBySet = dimensions.cardsBySet.group();
  groups.cardsByGeneration = dimensions.cardsByGeneration.group();

  maps.pricesByDex = new Filterable(
    () => new Map(groups.priceByDex.all().map(spreadGroup))
  );
  maps.cards = new Filterable(
    () => new Map(groups.pokedexNumber.all().map(spreadGroup))
  );
  maps.cardsByDex = new Filterable(
    () => groupBy(cfCards.allFiltered(), 'nationalPokedexNumber')
  );

  maps.cardsByArtist = new Filterable(
    () => groupBy(cfCards.allFiltered(), 'artist')
  );

  cfCards.onChange(() => {
    for (let key in maps) maps[key].refresh();
    for (let key in lists) lists[key]();
  });

  function updateFavorite() {
    document.querySelectorAll('.legalf-icon').forEach(x => {
      const icon = createPokémonIcon(favoriteNumber);
      x.childNodes[0].replaceWith(icon);
    });

    document.querySelectorAll('.legalf-name').forEach(x => {
      x.textContent = pokedex.get(+favoriteNumber).name;
    });

    document.querySelectorAll('.legalf-cards').forEach(x => {
      const cards = maps.cards.value.get(+favoriteNumber);
      if (cards) {
          x.textContent = cards > 1 ? `${cards} cartas` : `${cards} carta`;
      } else {
        x.textContent = 'nenhuma carta no filtro atual';
      }
    });

    document.querySelectorAll('.legalf-cards-count').forEach(x => {
      const cards = maps.cards.value.get(+favoriteNumber);
      if (cards) {
          x.textContent  = 'Vamos ver '
          x.textContent += cards > 5 ? 'algumas delas' : 'elas';
          x.textContent += ' aqui:';
      } else {
        x.textContent = '';
      }
    });

    document.querySelectorAll('li.legalf-price').forEach(x => {
      const favorite = pokedex.get(+favoriteNumber);
      const price = maps.pricesByDex.value.get(+favoriteNumber).avg;
      let priceText;
      if (price >= 0)
        priceText = currencyFormatter(price)+'$';
      else
        priceText = '[nenhuma carta no filtro atual]';
      const li = makePokeItem(
        [+favoriteNumber, undefined, favorite.name],
        `${favorite.name} ${priceText}`
      );
      x.innerHTML = li.innerHTML;
    })

    {
      let div = document.querySelector('#legalf-sampled-cards');
      div.innerHTML = '';
      let cards = shuffleArray(
        maps.cardsByDex.value.get(+favoriteNumber) || []
      );
      for (let card of cards.slice(0,5)) {
        let img = document.createElement('img');
        img.src = card.imageURL;
        img.title = (
          `${card.name} (${card.set}) ${currencyFormatter(card.price)}\$`
        );
        div.appendChild(img);
      }
    }
  }

  let chart;

  {
    charts['legal-types'] = dc.barChart('#legal-types','legal');
    chart = charts['legal-types'];
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

    const yTicks = priceTicks.map(yScale);

    groups.logPriceByRarity = dimensions.rarity.group().reduce(
      (p,v) => {
        if (v.price && !isNaN(v.price)) p.push(yScale(v.price));
        return p;
      },
      (p,v) => {
        if (v.price && !isNaN(v.price)) p.splice(p.indexOf(yScale(v.price)), 1)
        return p;
      },
      () => []
    );

    charts['legal-prices-by-rarity'] = dc.boxPlot('#legal-prices-by-rarity','legal');
    chart = charts['legal-prices-by-rarity'];
    chart.height(550)
         .boldOutlier(true)
         .colors(rarityColors)
         .colorAccessor(x => x.key)
         .dimension(dimensions.rarity)
         .group(groups.logPriceByRarity)
         .y(d3.scaleLinear().domain([yScale(0.009),yScale(yDomain[1]+50)]))
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
    chart.margins().left = 50;
    chart.ordering(x => rarityOrder(x.key));
    chart.on('pretransition.add-tip', (chart, filter) => {
      chart.selectAll('circle.outlierBold')
           .selectAll('title').remove();
    });

  }

  {
    const xDomain = d3.extent(groups.cpAndPrice.all().map(x=>x.key[0]));
    const yDomain = d3.extent(groups.cpAndPrice.all().map(x=>x.key[1]));
    yDomain[0] *= 0.9;
    yDomain[1] *= 2;
    xDomain[0] = 0.01;
    xDomain[1] = 30;

    const xTicks = priceTicks.slice(0,-4);

    charts['legal-cp-by-price'] = dc.scatterPlot('#legal-cp-by-price','legal');
    chart = charts['legal-cp-by-price'];
    chart.height(550)
         .colors(typesColors)
         .colorAccessor(d => {
           if (d.key[4] == +favoriteNumber) {return 'Favorite';}
           else return d.key[3];
         })
         .y(d3.scaleLog().domain(yDomain))
         .x(d3.scaleLog().domain(xDomain))
         .brushOn(false)
         .title(() => undefined)
         .dimension(dimensions.cpAndPrice)
         .group(groups.cpAndPrice)
         .data(g => g.all().filter(x => !isNaN(x.key[0]) && !isNaN(x.key[1])))
         .xAxisLabel('Preço')
         .yAxisLabel('CP Médio')
         .symbolSize(6);
    chart.yAxis().tickValues([
      0.08, 0.1, 0.2, 0.5, 0.8, 1, 2, 5, 10, 20, 50, 100, 200, 300
    ]).tickFormat(x => x);
    chart.xAxis().tickValues(xTicks)
         .tickFormat(x => {
           if (x >= 1) return `${currencyFormatter(x)}\$`
           else return `${Math.round(x*100)}¢`
          });

    const tooltip = d3.tip().html(d => {
      const [price, cp, id] = d.key;
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
      e.appendChild(document.createTextNode(
        `Preço: ${currencyFormatter(price)}\$`
      ));
      e.appendChild(document.createElement('br'));
      e.appendChild(document.createTextNode(
        `CP médio: ${currencyFormatter(cp)}`)
      );

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
    charts['legal-pie'] = dc.pieChart('#legal-pie','legal');
    chart = charts['legal-pie'];
    chart.height(550)
         .innerRadius(50)
         .dimension(dimensions.cardsBySet)
         .group(groups.cardsBySet)
         .legend(dc.legend())
         .ordering(x => {
          if (x.key !== 'SM Black Star Promos')
            return legalSets.indexOf(x.key);
          else
            return Infinity;
        });
  }

  {
    charts['legal-gen-pie'] = dc.pieChart('#legal-gen-pie','legal');
    chart = charts['legal-gen-pie'];
    chart.height(550)
         .innerRadius(50)
         .dimension(dimensions.cardsByGeneration)
         .group(groups.cardsByGeneration)
         .ordering(x => +x.key)
         .legend(dc.legend());
  }

  {
    const yDomain = [
      dimensions.price.bottom(1)[0].price,
      dimensions.price.top(1)[0].price
    ];
    const yScale = d3.scaleLog().domain(yDomain).nice();

    const yTicks = priceTicks.map(yScale);

    groups.logPriceByArtist = dimensions.artist.group().reduce(
      (p,v) => {
        if (v.price && !isNaN(v.price)) p.push(yScale(v.price));
        return p;
      },
      (p,v) => {
        if (v.price && !isNaN(v.price)) p.splice(p.indexOf(yScale(v.price)), 1)
        return p;
      },
      () => []
    );

    charts['legal-price-by-artist'] = dc.boxPlot('#legal-price-by-artist','legal');
    chart = charts['legal-price-by-artist'];
    chart.height(550)
         .elasticX(true)
         .boldOutlier(true)
         .dimension(dimensions.artist)
         .group(groups.logPriceByArtist)
         .data(g =>
             g.all().map(d => (d.map = a => a.call(d, d), d))
                    .filter(d => d.value.length > 0)
                    .sort((a,b) => {
                      const len = b.value.length-a.value.length;
                      if (len != 0) return len;
                      const aAvg = a.value.reduce((x,y) => x+y)/a.length;
                      const bAvg = b.value.reduce((x,y) => x+y)/b.length;
                      return bAvg-aAvg;
                    })
                    .slice(0,6)
         )
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

    chart.xAxis().tickFormat(a =>{
      let cards = maps.cardsByArtist.value.get(a);
      return `${a} - ${cards?cards.length:0}`;
    });
    chart.margins().left = 50;
    chart.ordering(x => -x.value.length);
    chart.on('pretransition.add-tip', (chart, filter) => {
      chart.selectAll('circle.outlierBold')
           .selectAll('title').remove();
    });
  }

  lists.pricesByDexNumber = () => makePokeList(
    '#legal-prices-by-dexnumber',
    groups.priceByDex.top(10).filter(o => o.value >= 0),
    (o) => [
      [o.key, undefined, pokedex.get(o.key).name],
      `${pokedex.get(o.key).name} ${currencyFormatter(o.value.avg)}\$`
    ]
  );

  lists.mostRepresented = () => makePokeList(
    '#legal-most-represented',
    groups.pokedexNumber.top(10).filter(o => o.value > 0),
    (o) => [
      [o.key, undefined, pokedex.get(o.key).name],
      `${pokedex.get(o.key).name} ${o.value} cartas`
    ]
  );

  lists.mostExpensive = () => {
    let div = document.querySelector('#legal-expensive-cards');
    div.innerHTML = '';
    let cards = dimensions.price.top(5);
    for (let card of cards) {
      let img = document.createElement('img');
      img.title = (
        `${card.name} (${card.set}) ${currencyFormatter(card.price)}\$`
      );
      img.src = card.imageURL;
      div.appendChild(img);
    }
  }

  lists.mostExpensiveRest = () => makePokeList(
    '#legal-expensive-cards-rest',
    dimensions.price.top(15).slice(5).filter(o => o.price > 0),
    (o) => [
      [o.nationalPokedexNumber, o.types[0], o.name],
      `${o.name} <span class="small">(${o.set})</span> ${currencyFormatter(o.price)}\$`
    ]
  );

  lists.mostCP = () => {
    let div = document.querySelector('#legal-cp-cards');
    div.innerHTML = '';
    let cards = dimensions.cp.top(5).filter(x => x.cp > 0);
    for (let card of cards) {
      let img = document.createElement('img');
      img.title = (
        `${card.name} (${card.set}) - CP ${currencyFormatter(card.cp)}`
      );
      img.src = card.imageURL;
      div.appendChild(img);
    }
  }

  lists.mostCP2 = () => makePokeList(
    '#legal-cp-cards-rest',
    dimensions.cp.top(15).filter(o => o.cp > 0).slice(5),
    (o) => [
      [o.nationalPokedexNumber, o.types[0], o.name],
      `${o.name} <span class="small">(${o.set})</span> CP ${currencyFormatter(o.cp)}`
    ]
  );

  lists.favorites = updateFavorite;

  for (let key in lists) lists[key]();
})();