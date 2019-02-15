import os
import glob
import json
import pandas as pd

for (i, f) in enumerate(glob.glob('*.geojson')):
  print('Processing ' + str(i) + ' ...')

  j = json.loads(open(f).read())

  p = j['features'][0]['properties']

  # fr = p['water_area_filled_fraction']

  mission = p['mission']
  ndwi_threshold = p['ndwi_threshold']
  quality_score = p['quality_score']
  water_area_filled = p['water_area_filled']
  water_area_filled_fraction = p['water_area_filled_fraction']
  water_area_p = p['water_area_p']
  water_area_time = p['water_area_time']
  water_area_value = p['water_area_value']

  data = {'mission': mission, 'ndwi_threshold': ndwi_threshold, 'quality_score': quality_score,
          'water_area_filled': water_area_filled, 'water_area_filled_fraction': water_area_filled_fraction, 'water_area_p': water_area_p,
          'water_area_time': water_area_time, 'water_area_value': water_area_value}

  df = pd.DataFrame(data)
  df['water_area_time'] = pd.to_datetime(df['water_area_time'])
                                      
  path = os.path.basename(f) + '.csv'
  df.to_csv(path)

