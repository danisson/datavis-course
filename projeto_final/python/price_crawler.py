import time
import sys
from bs4 import BeautifulSoup
import requests

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
  'smp': 'smp',
}
sets_param = '%2C'.join(sets.keys())

s = requests.Session()
i = 1

print('set\tnum\tname\tprice')
while True:
  current_url = base_url.format(sets_param,i)
  r = s.get(current_url)

  if r.status_code != 200:
    print(r.text, file=sys.stderr)
    break

  soup = BeautifulSoup(r.text, 'html.parser')
  entries = soup.find_all('article', class_='type-pkmn_card')

  print('Current:',i,'Cards:',len(entries), file=sys.stderr)
  for entry in entries:
    contents = entry.div.contents
    cset = sets[contents[0].span.abbr.text.lower()]
    num = contents[1].span.text
    name = contents[2].a.text
    price = None if contents[-1].a is None else contents[-1].a.text[1:]
    print(f'{cset}\t{num}\t{name}\t{price}')
  i += 1
  time.sleep(5)