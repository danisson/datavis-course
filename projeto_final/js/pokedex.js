export const pokedexPromise = d3.csv('data/pokemon.csv').then(d => {
  return new Map(d.map(x => [
    x['pokedex_number'],{
      name: x.name,
      pokedexNumber: +x.pokedex_number,
      japaneseName: x.japanese_name,
      generation: +x.generation,
      legendary: x.is_legendary === "1",
      generalRanking: x.general_ranking === ''? null : +x.general_ranking,
      sumoRanking: x.sumo_ranking === ''? null : +x.sumo_ranking
    }
  ]));
});