import os
import sys
import shutil
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

offset = 1000

files = glob.glob('./*.geojson')

new_indices_dir = './new_indices'
if not os.path.exists(new_indices_dir):
    os.makedirs(new_indices_dir)

pairs = [(f, os.path.join(new_indices_dir, f[0:13] + str(int(f[13:-8]) + offset) + f[18:])) for f in files]

for p in pairs:
  print('Renaming ' + p[0] + ' to ' + p[1])
  shutil.copyfile(p[0], p[1])

