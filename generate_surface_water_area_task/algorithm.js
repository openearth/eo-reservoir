/*
var assets = require('users/gena/packages:assets')
var thresholding = require('users/gena/packages:thresholding')
*/

var assets = require('./packages/assets')
var thresholding = require('./packages/thresholding')


function computeSurfaceWaterArea(waterbody, start, stop, scale, waterOccurrence) {
  var geom = ee.Feature(waterbody).geometry()
  
  var images = assets.getImages(geom, {
    resample: true,
    filter: ee.Filter.date(start, stop),
    missions: [
      'L4', 
      'L5', 
      'L7', 
      'L8', 
      'S2'
  ]
  })
  
  // print('Image count: ', images.size())
  
  images = assets.getMostlyCleanImages(images, geom.buffer(300, scale), {
     // cloudFrequencyThresholdDelta: -0.15
  }).sort('system:time_start')
  
  // print('Image count (clean): ', images.size())
  
  var water = images.map(function(i) {
    return computeSurfaceWaterArea_SingleImage(i, waterbody, scale, waterOccurrence)
  })
  
  water = water.filter(ee.Filter.neq('area', 0))

  return water
}

function computeSurfaceWaterArea_SingleImage(i, waterbody, scale, waterOccurrence) {
  var geom = ee.Feature(waterbody).geometry()
  
  var fillPercentile = 50 // we don't trust our prior

  var ndwiBands = ['green', 'swir']
  //var ndwiBands = ['green', 'nir'] 

  var waterMaxImage = ee.Image().float().paint(waterbody.buffer(150), 1)
  
  var maxArea = waterbody.area(scale)

  var t = i.get('system:time_start')
  
  i = i
    .updateMask(waterMaxImage)
    .updateMask(i.select('swir').min(i.select('nir')).gt(0.001))
  
  var ndwi = i.normalizedDifference(ndwiBands)

  // var water = ndwi.gt(0)

  var th = thresholding.computeThresholdUsingOtsu(ndwi, scale, geom, 0.5, 0.7, -0.2)
  var water = ndwi.gt(th)
  
  var area = ee.Image.pixelArea().mask(water)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geom,
      scale: scale
    }).get('area')

  // fill missing, estimate water probability as the lowest percentile.
  // var waterEdge = ee.Algorithms.CannyEdgeDetector(water, 0.1, 0)
  var waterEdge = ee.Algorithms.CannyEdgeDetector(ndwi, 0.5, 0.7)
  
  // image mask
  var imageMask = ndwi.mask()
  
  // var imageMask = i.select(ndwiBands).reduce(ee.Reducer.allNonZero())
  
  //imageMask = utils.focalMin(imageMask, ee.Number(scale) * 1.5)
  imageMask = imageMask.focal_min(ee.Number(scale).multiply(1.5), 'square', 'meters')
    //.multiply(waterMaxImage)

  // TODO: exclude non-water/missing boundsry
  waterEdge = waterEdge.updateMask(imageMask)

  // clip by clouds
  // var bad = ee.Image(1).float().subtract(i.select('weight'))
  // bad = utils.focalMax(bad, 90).not()
  // waterEdge = waterEdge.updateMask(bad)

  // get water probability around edges  
  var p = waterOccurrence.mask(waterEdge).reduceRegion({
    //reducer: ee.Reducer.mode(),
    reducer: ee.Reducer.percentile([fillPercentile]),
    geometry: geom,
    scale: scale
  }).values().get(0)
  
  // TODO: exclude edges belonging to cloud/water or cloud/land
  
  // TODO: use multiple percentiles (confidence margin)
    
  p = ee.Algorithms.If(ee.Algorithms.IsEqual(p, null), 101, p)

  var waterFill = waterOccurrence.gt(ee.Image.constant(p))
    .updateMask(water.unmask(0, false).not())
    
  // exclude false-positive, where we're sure in a non-water
  var nonWater = ndwi.lt(-0.15).unmask(0)
  waterFill = waterFill.updateMask(nonWater.not())
  
  var fill = ee.Image.pixelArea().mask(waterFill)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geom,
      scale: scale
    }).get('area')
    
  var area_filled = ee.Number(area).add(fill)
  
  var filled_fraction = ee.Number(fill).divide(area_filled)

  return i
    .addBands(waterFill.rename('water_fill'))
    .addBands(waterEdge.rename('water_edge'))
    .addBands(ndwi.rename('ndwi'))
    .addBands(water.rename('water'))
    //.addBands(bad.rename('bad'))
    .set({ 
      p: p, 
      area: area, 
      area_filled: area_filled, 
      filled_fraction: filled_fraction, 
      'system:time_start': t,
      ndwi_threshold: th,
      waterOccurrenceExpected: waterOccurrence.mask(waterEdge)
    })
  
}

function computeSurfaceWaterAreaJRC(waterbody, start, stop, scale) {
  var geom = ee.Feature(waterbody).geometry()
  
  var jrcMonthly = ee.ImageCollection("JRC/GSW1_0/MonthlyHistory")

  var water = jrcMonthly.filterDate(start, stop).map(function(i) {
    var area = ee.Image.pixelArea().mask(i.eq(2)).reduceRegion({
      reducer: ee.Reducer.sum(), 
      geometry: geom, 
      scale: scale
    })

    return i.set({area: area.get('area')})
  })

  return water
}

exports.computeSurfaceWaterArea = computeSurfaceWaterArea

exports.computeSurfaceWaterArea_SingleImage = computeSurfaceWaterArea_SingleImage

exports.computeSurfaceWaterAreaJRC = computeSurfaceWaterAreaJRC




