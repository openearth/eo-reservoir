# -*- coding: utf-8 -*-
"""
Created on Tue Feb 27 12:27:50 2018

@author: laver1
"""

import pandas as pd
import os
import numpy as np

os.chdir("Z:\\Reservoir\\Altimetry\\G-realm")

id_file = "ID_lakes.xlsx"
lake = pd.read_excel(id_file,sheetname="Jason")
lake_Env= pd.read_excel(id_file,sheetname="Envisat")


Altimetry_JASON={}
for LA in range(lake.Name.count()):
    
    # read altimetry data
    Name="lakes.TPJO.1.1\\lake%04d.TPJO.1.1.txt" %( lake.ID[LA])
    df = pd.read_table(Name, delim_whitespace=True, skiprows= 24,index_col=None, 
         names=("Satellite", "cycle", "date","hour","min","height","error", 'mean_track ','Topo_correc','ionos_correc','Dry_correc'))                 
    
    # remove NaN values
    df=df[df.date != 99999999]
    df.height=df.height.replace(999.99, np.nan)
    
    # Index by date
    df['DateTime'] = pd.to_datetime(df['date'].astype(str), format='%Y%m%d')
#    df=df.set_index('DateTime')
    
    
    #create dictionary
    d = dict([("Date", df['DateTime']),("Height",df['height']), ("Name",lake.Name[LA]),("Country",lake.Country[LA]) ])
    Altimetry_JASON[lake.Hylak_id[LA]] = d
    d=None


# ----------------------------------------------
# --------------- ALTIMETRY ENVISAT (35 days) -----
# ----------------------------------------------

Altimetry_ENVISAT={}
for LA in range(lake_Env.Name.count()):
    
    # read altimetry data
    Name="envisat_lakes\\lake%04d.N.1.4.txt" %( lake_Env.ID[LA])
    df = pd.read_table(Name, delim_whitespace=True, skiprows= 24,index_col=None, 
         names=("Satellite", "cycle", "date","hour","min","height","error", 'mean_track ','Topo_correc'))                 
    
    # remove NaN values
    df=df[df.date != 99999999]
    df.height=df.height.replace(999.99, np.nan)
    
    # Index by date
    df['DateTime'] = pd.to_datetime(df['date'].astype(str), format='%Y%m%d')
#    df=df.set_index('DateTime')

   #create dictionary
    d = dict([("Date", df['DateTime']),("Height",df['height']), ("Name",lake_Env.Name[LA]),("Country",lake_Env.Country[LA]) ])
    Altimetry_ENVISAT[lake_Env.Hylak_id[LA]] = d
    d=None
