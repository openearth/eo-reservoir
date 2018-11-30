require('ee-runner')


gee.initialize(() => {
  let countries = ee.FeatureCollection('USDOS/LSIB/2013')
  let hydroLakes = ee.FeatureCollection("users/gena/HydroLAKES_polys_v10")
  let waterbodies = hydroLakes.filterBounds(countries.filter(ee.Filter.inList('name', ['ZAMBIA'])).geometry())
  print(waterbodies.size().getInfo())
})