export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function groupBy(xs, key) {
  let m = new Map();
  for (let x of xs) {
    const mX = m.get(x[key]);
    if (mX) mX.push(x);
    else m.set(x[key], [x]);
  }
  return m;
};
