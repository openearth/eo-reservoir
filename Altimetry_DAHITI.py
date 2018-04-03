# -*- coding: utf-8 -*-
"""
Created on Wed Feb 28 05:52:24 2018

@author: laver1
"""

import pandas as pd
import requests
import json
#import os

#import numpy as np

#os.chdir("Z:\\Reservoir\\Altimetry\\DAHITI")

## Download of a DAHITI water level time series

#LIST-TARGETS
#List selected targets from the DAHITI data holding

url = 'http://dahiti.dgfi.tum.de/api/v1/'
username ='mlaverde'
password = 'Santafe2600m'
args = {}
""" required options """
args['username'] = username
args['password'] = password
args['action'] = 'list-targets'
#
#""" optional options """
##args['basin'] = 'Amazon'
##args['continent'] = 'Asia'
##args['country'] = 'de'
##args['min_lon'] = 0
##args['max_lon'] = 10
##args['min_lat'] = 0
##args['max_lat'] = 10
##args['software'] = '3.1'
#
#""" send request as method POST """
#response = requests.post(url, data=args)
#""" send request as method GET """
response = requests.get(url, params=args)

if response.status_code == 200:
	""" convert json string in python list """
	data = json.loads(response.text)

    
lake = pd.DataFrame(data)    
lake['Name'],lake['Type'] = lake['target_name'].str.split(',',1).str    
lake['Name'] = lake['Name'].str.replace('Lake','')    
del lake['target_name']   
    
# remove Rivers
lake = lake[lake.Type.str.contains("River") == False]

## Get altimetry information based on ID

Altimetry_DAHITI = pd.date_range('1992-01-01', '2017-01-01', freq='MS') 
Altimetry_DAHITI  =pd.DataFrame(Altimetry_DAHITI,index=Altimetry_DAHITI,columns=['A'])
del Altimetry_DAHITI['A']

for LA in range(lake.Name.count()):

    args = {}
    """ required options """
    args['username'] = username
    args['password'] = password
    args['action'] = 'download'
    args['dahiti_id'] = str(lake.id[LA])
    
    """ send request as method POST """
    response = requests.post(url, data=args)
    """ send request as method GET """
#    response = requests.get(url, params=args)
    
    if response.status_code == 200:
        """ convert json string in python list """        
        data = json.loads(response.text)
        # index to date             
        df=pd.DataFrame.from_dict(data) 
        df.date = pd.to_datetime(df['date'])
        df=df.set_index('date')
        print lake.Type[LA] 
        # summary monthly maximum
        Monthly=pd.Series.to_frame(df['height'].resample('MS').max())
        Monthly.columns = Monthly.columns.str.replace('height',lake.Name[LA])
    
        Altimetry_DAHITI= pd.concat([Altimetry_DAHITI,Monthly], axis=1)        
    