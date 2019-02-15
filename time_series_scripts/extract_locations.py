import os
import sys
import glob
import json
from geojson import Point, Feature, FeatureCollection, dump
import datetime

features = []

def process(f, i):
  j = json.loads(open(f).read())

  coords = j['features'][0]['geometry']['coordinates']

  point = Point((coords[0], coords[1]))
  head, tail = os.path.split(f)
  features.append(Feature(geometry=point, properties={"filename": tail}))

offset = 0

for (i, f) in enumerate(glob.glob('./*.geojson')[offset:]):
  print('Processing ' + str(i) + ' ...')

  process(f, i + offset)

feature_collection = FeatureCollection(features)

with open('locations.geojson', 'w') as f:
   dump(feature_collection, f)
