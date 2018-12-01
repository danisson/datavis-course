import {
  baseCardsPromise,
  legalCardsPromise,
  types,
  typesColors
} from './cards.js';
import {  pokedexPromise } from './pokedex.js';
import { makePokeList, createPokémonIcon } from './icons.js';


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

var currencyFormatter = d3.format(".2f");

let favoriteFirstGen = '1';
let firstGenSelector = document.querySelector('#gen1-favorite');

(async () => {
  let cards = await baseCardsPromise;
  let pokedex = await pokedexPromise;

  let cfCards = crossfilter([...cards.values()]);
  let dimensions = {};
  let groups = {};
  let maps = {};
  let lists = {};
  window.pokedex = pokedex;
  window.groups = groups;
  window.dimensions = dimensions;
  window.maps = maps;

  dimensions.price = cfCards.dimension(x => x.price);
  dimensions.type = cfCards.dimension(x => x.types, true);
  dimensions.pokedexNumber = cfCards.dimension(x => x.nationalPokedexNumber);
  dimensions.rankingAndPrice = cfCards.dimension(x =>
    [x.price,pokedex.get(x.nationalPokedexNumber).generalRanking,x.types[0]]
  );

  groups.priceByDex = dimensions.pokedexNumber.group().reduce(
    reduceAddAvg('price'), reduceRemoveAvg('price'), reduceInitAvg
  );

  groups.rankingAndPrice = dimensions.rankingAndPrice.group()
                                                     .reduceSum(x=>x.price);
  groups.type = dimensions.type.group();

  maps.pricesByDex = new Map(groups.priceByDex.all().map(x=>[x.key, x.value]));

  cfCards.onChange(() => { for (let key in lists) lists[key]();});

  function updateFirstGenFavorite() {
    let icon = createPokémonIcon(favoriteFirstGen);
    document.querySelectorAll('.gen1f-icon').forEach(x => {
      x.childNodes[0].replaceWith(icon);
    })

    document.querySelectorAll('.gen1f-name').forEach(x => {
      x.textContent = pokedex.get(+favoriteFirstGen).name;
    })

    document.querySelectorAll('.gen1f-price').forEach(x => {
      if (maps.pricesByDex.get(+favoriteFirstGen)) {
          x.textContent = currencyFormatter(
            maps.pricesByDex.get(+favoriteFirstGen).avg
          ) + ' dólares';
      } else {
        x.textContent = "sem preço registrado"
      }
    })
  }
  updateFirstGenFavorite();

  for (let pokemon of pokedex.values()) {
    if (pokemon.generation != 1) continue;
    let option = document.createElement('option');
    option.value = pokemon.pokedexNumber;
    option.appendChild(document.createTextNode(pokemon.name));
    firstGenSelector.childNodes[1].appendChild(option);
  }
  firstGenSelector.childNodes[1].onchange = function(e) {
    favoriteFirstGen = e.target.value;
    updateFirstGenFavorite();
  }

  let chart;
  chart = dc.barChart("#gen1-types");
  chart.height(480)
       .x(d3.scaleBand())
       .xUnits(dc.units.ordinal)
       .yAxisLabel("Quantidade de Cartas")
       .colors(typesColors)
       .colorAccessor(d => d.key)
       .brushOn(true)
       .dimension(dimensions.type)
       .group(groups.type.reduceCount())
       .controlsUseVisibility(true)
       .addFilterHandler((filters, filter) => [filter]);

  {
    let xDomain = d3.extent(groups.rankingAndPrice.all().map(x=>x.key[0]));
    let yDomain = d3.extent(groups.rankingAndPrice.all().map(x=>x.key[1]));

    yDomain[0] -= 20;
    yDomain[1] += 20;
    xDomain[0] -= 1;
    xDomain[1] += 1;

    chart = dc.scatterPlot("#gen1-pop-by-price");
    chart.height(480)
         .colors(typesColors)
         .colorAccessor(d => d.key[2])
         .y(d3.scaleLinear().domain(yDomain))
         .x(d3.scaleLinear().domain(xDomain))
         .brushOn(true)
         .dimension(dimensions.rankingAndPrice)
         .group(groups.rankingAndPrice)
         .xAxisLabel("Preço em dólares")
         .yAxisLabel("Popularidade");
  }



  lists.pricesByDexNumber = () => makePokeList(
    '#gen1-prices-by-dexnumber',
    groups.priceByDex.top(10).filter(o => o.value >= 0),
    (o) => [[o.key], `${pokedex.get(o.key).name} ${currencyFormatter(o.value.avg)}\$`]
  );

  for (let key in lists) lists[key]();


  dc.renderAll();
})();
