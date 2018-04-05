# -*- coding: utf-8 -*-
"""
Download Altimetry information from  the Database for Hydrological Time Series 
of Inland Waters (DAHITI) water level time series


to obtain the password please register 
http://dahiti.dgfi.tum.de/en/

REFERENCE
        Schwatke C., Dettmering D., Bosch W., Seitz F.: DAHITI -
         An Innovative Approach for Estimating Water Level Time Series over 
         Inland  Waters using Multi-Mission Satellite Altimetry.
         Hydrol. Earth Syst. Sci., 19, 4345-4364, 
         doi:10.5194/hess-19-4345-2015, 
         2015

@author: laver1
"""

import pandas as pd
import requests
import json
import os
#import numpy as np

os.chdir("Z:\\Reservoir\\Altimetry\\DAHITI")

url = 'http://dahiti.dgfi.tum.de/api/v1/'
username ='mlaverde'
password = 'eo-reservoir'

## Get altimetry information based on ID

#List selected targets from the DAHITI data holding
lake = pd.read_csv("DAHITI.csv",header = 'infer')


Altimetry_DAHITI={}

for LA in range(0,lake.Name.count()):

    args = {}
    """ required options """
    args['username'] = username
    args['password'] = password
    args['action'] = 'download'
    args['dahiti_id'] = str(lake.ID[LA])
    
    """ send request as method POST """
    response = requests.post(url, data=args)
    """ send request as method GET """
#    response = requests.get(url, params=args)

    Type = lake.Type[LA]
    if Type.find("River") == -1:
    
        if response.status_code == 200:
            """ convert json string in python list """        
            data = json.loads(response.text)
            # index to date             
            df=pd.DataFrame.from_dict(data) 
            df.date = pd.to_datetime(df['date'])
#            df=df.set_index('date')
            
            #create dictionary
            d = dict([("Date", df['date']),("Height",df['height']), ("Name",lake.Name[LA]),("Country",lake.Country[LA]) ])
            Altimetry_DAHITI[lake.Hylak_id[LA]] = d
            d=None            
            print lake.Type[LA]      
#    else:
#        print 'Skip_River'
#    
lake.to_csv('Lake_DAHITI.csv',   encoding='utf-8', index=False)
Altimetry_DAHITI.to_csv('Altimeter_DAHITI.csv',   encoding='utf-8', index=False)


#    # remove NaN values
#    df=df[df.date != 99999999]
#    df.height=df.height.replace(999.99, np.nan)