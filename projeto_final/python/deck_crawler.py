import time
import sys
import re
from bs4 import BeautifulSoup
import requests
import IPython.display as ipd

base_url = r'https://pkmncards.com/page/{1}/?s=set%3A{0}&display=list&sort=number&order=asc'

sets = {
  'sum': 'sm1',
  'gri': 'sm2',
  'bus': 'sm3',
  'slg': 'sm35',
  'cin': 'sm4',
  'upr': 'sm5',
  'fli': 'sm6',
  'ces': 'sm7',
  'drm': 'sm75',
  'lot': 'sm8',
  'pr-sm': 'smp',
}

missing_href = {
  'Ditto Prism Star': 'sm8-154',
  'Sylveon-GX': 'sm2-92',
  'Salazzle-GX': 'sm3-25',
}

bad_id = {
  '/wp-content/media/scans/translations/441.jpg': 'sm8-132',
}

s = requests.Session()

def parse_deck(url):
  cards = []
  r = s.get('http://limitlesstcg.com'+url)

  if r.status_code != 200:
    print(r.text, file=sys.stderr)
    raise Exception(r.status_code)

  soup = BeautifulSoup(r.text, 'html.parser')
  decklists = soup.find('span', class_='decklist-head-dropdown-heading-subline')
  if decklists is None:
    print('bad_decklist',url, file=sys.stderr)
    return []
  
  match = re.search(r'(\d+) decklist(?:s)?',decklists.text)
  if match is None:
    print('bad_decklist',url, file=sys.stderr)
    return []
  
  decklists = int(match.group(1))
  pokemons = soup.find('div', class_='decklist-column').find_all('a')
  
  for a in pokemons:
    name = a.contents[2].text
    mean = float(a.span.text)
    if 'href' in a.attrs:
      webid = a['href'].split('/')[-1][:-6]
      match = re.search(r'([A-Z\-]+?)-?(\d+)', webid)
      if match == None:
        if a['href'] in bad_id:
          card_id = bad_id[a['href']]
        else:
          print('bad_id',name,a['href'], file=sys.stderr)
      else:
        a,b = match.groups()
        set_id = sets.get(a.lower(), None)
        if set_id is None:
          print('illegal_set',name,a.lower(),webid, file=sys.stderr)
          continue
        card_id = f'{set_id}-{b}'
    else:
      if name in missing_href:
        card_id = missing_href[name]
      else:
        print('missing_href',name, file=sys.stderr)
        continue
    cards.append((card_id,round(mean*decklists)))
  return cards
    

i = 1
d = []
base_url = r'http://limitlesstcg.com/decks/?time=1819&format=standard&split=yes&pg={}'
while True:
  current_url = base_url.format(i)
  r = s.get(current_url)

  if r.status_code != 200:
    print(r.text, file=sys.stderr)
    raise Exception(r.status_code)

  soup = BeautifulSoup(r.text, 'html.parser')
  decks = soup.find('table').find_all('tr')[1:]
  
  if len(decks) == 0:
    break
  
  for deck in decks:
    deck_link = deck.contents[1].a['href']
    deck_name = deck.contents[1].a.text
    points = float(deck.contents[3].text)
    d.append((deck_name, points, parse_deck(deck_link)))
#     print(deck_name, points, parse_deck(deck_link))
  
  i += 1
  time.sleep(5)
  
dsp = pd.DataFrame([(d[0],d[1],sum([x[1] for x in d[2]]),x[0],x[1]) for d in ds for x in d[2]], columns=['deck','cp','#pkmn','card','#'])