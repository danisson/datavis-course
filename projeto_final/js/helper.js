export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function indexer(key) {
  return (xs) => new Map(xs.map(x => [x[key], x]));
};

export function groupBy(xs, key) {
  let m = new Map();
  for (let x of xs) {
    const mX = m.get(x[key]);
    if (mX) mX.push(x);
    else m.set(x[key], [x]);
  }
  return m;
};

function reduceAddAvg(attr) {
  return function(p,v) {
    if (!isNaN(v[attr])) {
      ++p.count
      p.sum += v[attr];
      p.avg = p.sum/p.count;
    }
    return p;
  };
}
function reduceRemoveAvg(attr) {
  return function(p,v) {
    if (!isNaN(v[attr])) {
      --p.count
      p.sum -= v[attr];
      if (p.count > 0) p.avg = p.sum/p.count;
      else p.avg = -1;
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

export const avgReducer = (attr) => [
  reduceAddAvg(attr), reduceRemoveAvg(attr), reduceInitAvg
];

export const currencyFormatter = d3.format('.2f');

export class Filterable {
  constructor(builder) {
    this.builder = builder;
    this.value = builder();
  }

  refresh() {
    this.value = this.builder();
  }

  valueOf() {
    return this.value;
  }
}
