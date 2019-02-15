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

  if status in ['RUNNING', 'READY']:
      ee.data.cancelTask(id)
