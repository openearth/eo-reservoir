# -*- coding: utf-8 -*-
"""
Created on Tue Feb 27 12:27:50 2018

download:
    JASON datasets: https://ipad.fas.usda.gov/lakes/images/lakes.TPJO.1.1.txt.tar.gz
    ENVISAT https://ipad.fas.usda.gov/lakes/images/envisat_lakes.txt.zip


@author: laver1
"""
import pandas as pd
import os
import numpy as np
import urllib2
import matplotlib.pyplot as plt

# folder
os.chdir("Z:\\Reservoir\\Altimetry\\G-realm")
JasonFolder="lakes.TPJO.1.1"
EnvFolder= "envisat_lakes"

# lakes  35 days list
cat=[]
for line in urllib2.urlopen("https://ipad.fas.usda.gov/lakes/images/envisat_summary.txt"):
    line = line.split()
    cat.append(line)

lake_Env = pd.DataFrame(cat)
header = lake_Env.iloc[0]  
lake_Env =lake_Env.rename(columns = header)
lake_Env = lake_Env[1:]
Lat_Env = lake_Env.Lat
Lon_Env = lake_Env.Lon

# lakes  10 days list
cat=[]
for line in urllib2.urlopen(" https://ipad.fas.usda.gov/lakes/images/summary.txt"):
    line = line.split()
    cat.append(line)

lake = pd.DataFrame(cat)
lake =lake.rename(columns = header)
lake = lake[1:]
Lat = lake.Lat
Lon = lake.Lon

# ----------------------------------------------
# --------------- ALTIMETRY ENVISAT (35 days) -----
# ----------------------------------------------

Altimetry_Env = pd.date_range('1992-01-01', '2017-01-01', freq='MS') 
Altimetry_Env =pd.DataFrame(Altimetry_Env,index=Altimetry_Env,columns=['A'])
del Altimetry_Env['A']

for LA in range(1,lake_Env.Name.count()):
    
    # read altimetry data
    Name=EnvFolder+ "\\lake%04d.N.1.4.txt" %( float(lake_Env.ID[LA]))
    df = pd.read_table(Name, delim_whitespace=True, skiprows= 24,index_col=None, 
         names=("Satellite", "cycle", "date","hour","min","height","error", 'mean_track ','Topo_correc'))                 
    
    # remove NaN values
    df=df[df.date != 99999999]
    
    # Index by date
    df['DateTime'] = pd.to_datetime(df['date'].astype(str), format='%Y%m%d')
    df=df.set_index('DateTime')
    df=df.replace(999.99, np.nan)
    # summary monthly maximum
    Monthly=pd.Series.to_frame(df['height'].resample('MS').max())
    Monthly.columns = Monthly.columns.str.replace('height',lake_Env.Name[LA])
    
    Altimetry_Env= pd.concat([Altimetry_Env,Monthly], axis=1)  

#clear missing values
Altimetry_Env=Altimetry_Env.replace(999.99, np.nan)

# ----------------------------------------------
# --------------- ALTIMETRY JASON (10 days)--------
# ----------------------------------------------

Altimetry = pd.date_range('1992-01-01', '2017-01-01', freq='MS') 
Altimetry =pd.DataFrame(Altimetry,index=Altimetry,columns=['A'])
del Altimetry['A']

for LA in range(1,lake.Name.count()):
    
    # read altimetry data
    Name = JasonFolder + "\\lake%04d.TPJO.1.1.txt" %( float(lake.ID[LA]))
    df = pd.read_table(Name, delim_whitespace=True, skiprows= 24,index_col=None, 
         names=("Satellite", "cycle", "date","hour","min","height","error", 'mean_track ','Topo_correc','ionos_correc','Dry_correc'))                 
    
    # remove NaN values
    df=df[df.date != 99999999]
    
    # Index by date
    df['DateTime'] = pd.to_datetime(df['date'].astype(str), format='%Y%m%d')
    df=df.set_index('DateTime')
    df=df.replace(999.99, np.nan)
    # summary monthly maximum
    Monthly=pd.Series.to_frame(df['height'].resample('MS').max())
    Monthly.columns = Monthly.columns.str.replace('height',lake.Name[LA])
    
    Altimetry= pd.concat([Altimetry,Monthly], axis=1)  

#clear missing values
Altimetry=Altimetry.replace(999.99, np.nan)


## plot alimtery database

lake.drop(lake.index[0], inplace=True) ## eliminate "Winnipeg"
merge=[]
for poly in lake.name:

    if any(poly in s for s in lake_Env.Name):
        name= poly
        merge.append(name)
        plt.plot(Altimetry_Env[name])   
        plt.plot(Altimetry[name])  
        plt.ylabel('Hight (m)')
        plt.title(name)
        plt.grid(True)
        plt.savefig(name +".png")   
#       plt.show()
        plt.close()
    else:
        name= poly        
        plt.plot(Altimetry[name])  
        plt.ylabel('Hight (m)')
        plt.title(name)
        plt.grid(True)
        plt.savefig(name +".png")   
#       plt.show()
        plt.close()