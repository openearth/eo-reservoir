# eo-reservoirs

[![Join the chat at https://gitter.im/openearth/eo-reservoirs](https://badges.gitter.im/openearth/eo-reservoirs.svg)](https://gitter.im/openearth/eo-reservoirs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

### Roadmap
- [x] Generate surface water area time series for MENA region using JRC monthly water extent, using HydroLAKES as extent
- [~] Generate surface water area time series for MENA region using JRC monthly water extent combined with JRC water occurrence as a prior
- [ ] Generate surface water area time series for MENA region using JRC monthly water extent combined with JRC water occurrence as a prior and maximum water extent based on an overlap HydroLAKES+OSM, and JRC water occurrence
- [ ] Generate surface water area time series for MENA region using RAW images (Landsat 5,7,8, Sentinel-2, ASTER?) monthly water extent combined with JRC water occurrence as a prior and maximum water extent based on an overlap HydroLAKES and JRC water occurrence. Include metainfo in exported time series (fill pixel fraction, cloud/snow/... pixel count).
- [ ] Identify missing reservoirs (constructed after 1999 and missing in HydroLAKES) 
- [ ] Detect waterbodies where HydroLAKES max distance point (not centroid) does not overlap with the JRC water occurence. Then take the largerst blob from overlapping JRC water occurrence.
- [ ] Cache time series under hydro engine (store on GCS)
- [ ] Setup a script to update time series (monthly?)
- [ ] Update license on Hydro Engine


- [ ] Build a website to inspect reservoir time series
- [ ] Estimate water levels and volume using HydroLAKES and/or hydrological models
- [ ] Scale globally
- [ ] Detect missing waterbodies in JRC (or custom) water occurrence dataset, convert to vector
- [ ] Improve algorithm to look at waterbody perimeter only (dynamic pixels), Voronoi 
- [ ] Clip water edges belonging to clouds before filling missing water
- [ ] Identify areas where water occurence should not be used (non-informative prior)
