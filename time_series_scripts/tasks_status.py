import os
import ee

ee.Initialize()

with open('tasks') as f:
  tasks = f.readlines()


durations = []

for t in tasks:
  s = t.split()

  id = s[0]
  status = s[3]

  print(id, status)

  if status == 'COMPLETED':
      task_status = ee.data.getTaskStatus(id)[0]

      print(task_status)
      t0 = int(task_status['start_timestamp_ms'])
      t1 = int(task_status['update_timestamp_ms'])
      duration = (t1 - t0)/(1000 * 60)
      
      print(str(str(duration) + ' min'))

      durations.extend([duration])

import matplotlib.pylab as plt

plt.plot(durations)
plt.savefig('tasks.png')

import pandas as pd
pd.DataFrame(durations).to_csv('tasks.csv')

