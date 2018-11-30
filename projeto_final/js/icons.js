function createSVGIcon(x,y) {
  let height = 3054;
  let width = 1314;
  let left = -x;
  let right = width-left-40;
  let top = -y;
  let bottom = height-top-30;

  let image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  image.setAttribute('width', 1314);
  image.setAttribute('height', 3054);
  image.setAttribute('x',-left);
  image.setAttribute('y',-top);
  image.setAttribute('href', './third-party/img/pokesprite.png');
  image.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`
  return image;
}

export function createPokémonIcon(dexNumber, type) {
  let dexn = String(dexNumber).padStart(3,'0');
  let span = document.createElement('span');
  span.className = `spriteHolder pkspr pkmn-${dexn}`;
  span.style.backgroundColor = type ? types[type] : '#fff';

  if (dexNumber > 0) {
    PkSpr.decorate(span);
    span.children[0].className = 'sprite';
  }
  return span;
}

export function makePokeList(selector, list, attrSelector) {
  let fragments = document.createDocumentFragment();
  list.forEach(o => {
    let [iconData, text] = attrSelector(o);
    
    let li = document.createElement('li');
    let e = document.createElement('span');
    let icon = createPokémonIcon(...iconData);
    
    li.appendChild(e);
    e.appendChild(icon);
    e.appendChild(document.createTextNode(text));
    fragments.appendChild(li);
  })
  document.querySelector(selector).appendChild(fragments);
}