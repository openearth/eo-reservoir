/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var jrc = ee.Image("JRC/GSW1_0/GlobalSurfaceWater");
/***** End of imports. If edited, may not auto-convert in the playground. *****/

/*
Copyright (c) 2018 Gennadii Donchyts. All rights reserved.

This work is licensed under the terms of the MIT license.  
For a copy, see <https://opensource.org/licenses/MIT>.
*/


/*
var utils = require('users/gena/packages:utils')
*/

var utils = require('./utils')

function getCity(name) {
  var cities = ee.FeatureCollection('ft:10oAgy872tFwLQQeqG3R5QsozP5_h9mwwijpQqw')
  return cities.filter(ee.Filter.eq('name', name))
}

function getCountry(name) {
  var countries = ee.FeatureCollection('USDOS/LSIB/2013')
  return countries.filter(ee.Filter.eq('name', name))
}

function getRiver(name) {
  var rivers = ee.FeatureCollection('ft:1yMXz_cItkAJFvmeXNcsuW2i7kK5i1iJ0QcYK3g')
  return rivers.filter(ee.Filter.eq('name', name))
}

// TODO: currently is's hacked together, ugly-ugly :( - refactor, re-use code developed for reservoir water detection 

function getImages(g, options) {
  g = ee.Geometry(g)
  
  var resample = false
  
  if(options && options.resample !== undefined) {
    resample = options.resample
  }

  var bands = {
    S2: { from: ['B11', 'B8', 'B4', 'B3', 'B2'], to: ['swir', 'nir', 'red', 'green', 'blue'] },
    L8: { from: ['B6', 'B5', 'B4', 'B3', 'B2'], to: ['swir', 'nir', 'red', 'green', 'blue'] },
    L5: { from: ['B5', 'B4', 'B3', 'B2', 'B1'], to: ['swir', 'nir', 'red', 'green', 'blue'] },
    L4: { from: ['B5', 'B4', 'B3', 'B2', 'B1'], to: ['swir', 'nir', 'red', 'green', 'blue'] },
    L7: { from: ['B5', 'B4', 'B3', 'B2', 'B1'], to: ['swir', 'nir', 'red', 'green', 'blue'] },
  }


  // used only for a single sensor
  if(options && options.bandsAll !== undefined) {
    bands.S2 = { 
      from: ['B11', 'B8', 'B3', 'B2', 'B4', 'B5', 'B6', 'B7', 'B8A', 'B9', 'B10'], 
      to: ['swir', 'nir', 'green', 'blue', 'red', 'red2', 'red3', 'red4', 'nir2', 'water_vapour', 'cirrus']
      // from: ['B11', 'B8', 'B3', 'B1', 'B2', 'B4', 'B5', 'B6', 'B7', 'B8A', 'B9', 'B10', 'B12'], 
      // to: ['swir', 'nir', 'green', 'coastal', 'blue', 'red', 'red2', 'red3', 'red4', 'nir2', 'water_vapour', 'cirrus', 'swir2']
    }
  }

  var s2 = ee.ImageCollection('COPERNICUS/S2')
    //.select(['B11', 'B12', 'B8', 'B4', 'B3', 'B2', 'B1', 'B10'], ['swir', 'swir2', 'nir', 'red', 'green', 'blue', 'coastal', 'cirrus'])
    .select(bands.S2.from, bands.S2.to)
    .filterBounds(g)

  var l8 = ee.ImageCollection('LANDSAT/LC08/C01/T1_RT_TOA')
    //.select(['B6', 'B7', 'B5', 'B4', 'B3', 'B2', 'B1', 'B9'], ['swir', 'swir2', 'nir', 'red', 'green', 'blue', 'coastal', 'cirrus'])
    .select(bands.L8.from, bands.L8.to)
    .filterBounds(g)
  
  var l5 = ee.ImageCollection('LANDSAT/LT05/C01/T1_TOA')
    //.select(['B6', 'B7', 'B5', 'B4', 'B3', 'B2', 'B1', 'B9'], ['swir', 'swir2', 'nir', 'red', 'green', 'blue', 'coastal', 'cirrus'])
    .select(bands.L5.from, bands.L5.to)
    .filterBounds(g)
  
  var l4 = ee.ImageCollection('LANDSAT/LT04/C01/T1_TOA')
    //.select(['B6', 'B7', 'B5', 'B4', 'B3', 'B2', 'B1', 'B9'], ['swir', 'swir2', 'nir', 'red', 'green', 'blue', 'coastal', 'cirrus'])
    .select(bands.L4.from, bands.L4.to)
    .filterBounds(g)

  var l7 = ee.ImageCollection('LANDSAT/LE07/C01/T1_RT_TOA')
    //.select(['B6', 'B7', 'B5', 'B4', 'B3', 'B2', 'B1', 'B9'], ['swir', 'swir2', 'nir', 'red', 'green', 'blue', 'coastal', 'cirrus'])
    .select(bands.L7.from, bands.L7.to)
    .filterBounds(g)

  if(options && options.filter) {
    s2 = s2.filter(options.filter)
    l5 = l5.filter(options.filter)
    l4 = l4.filter(options.filter)
    l7 = l7.filter(options.filter)
    l8 = l8.filter(options.filter)
  }

  if(resample) {
    s2 = s2
      .map(function(i) { 
        i = i.resample('bicubic')

        return i
    })
  }

  // merge by time (remove duplicates)
  if(options && !options.fast) {
    s2 = mosaicByTime(s2)
  }

  s2 = s2
    .map(function(i) { 
      return i
        .addBands(i.multiply(0.0001).float(), i.bandNames(), true)
        //.clip(i.geometry().buffer(-5000, 1000)) // not needed, footprints are ok
        .copyProperties(i)
        .set({SUN_ELEVATION: ee.Number(90).subtract(i.get('MEAN_SOLAR_ZENITH_ANGLE'))})
        .set({MISSION: 'S2'})
        .set({SUN_AZIMUTH: i.get('MEAN_SOLAR_AZIMUTH_ANGLE')})
    })

  var images = ee.ImageCollection([])

  if(options && options.missions) {
    if(options.missions.indexOf('L5') != -1) {
      l5 = l5.map(function(i) { return i.set({MISSION: 'L5'})})
      images = images.merge(l5)
    }

    if(options.missions.indexOf('L4') != -1) {
      l4 = l4.map(function(i) { return i.set({MISSION: 'L4'})})
      images = images.merge(l4)
    }
    
    if(options.missions.indexOf('L7') != -1) {
      l7 = l7.map(function(i) { return i.set({MISSION: 'L7'})})
      images = images.merge(l7)
    }

    if(options.missions.indexOf('L8') != -1) {
      l8 = l8.map(function(i) { return i.set({MISSION: 'L8'})})
      images = images.merge(l8)
    }
  } else {
    images = l8 
  }

  images = ee.ImageCollection(images)
  
  if(resample) {
    images = images
      .map(function(i) { 
        return i
          .resample('bicubic')
      })
  }
  
  images = images.map(function(i) { 
    return i.clip(i.select(0).geometry().buffer(-5000, 1000))
    //return i.clip(i.select(0).geometry().buffer(-10000, 1000))
  })

  if(options && options.missions) {
    if(options.missions.indexOf('S2') != -1) {
      s2 = s2.map(function(i) { return i.set({MISSION: 'S2'})})
      images = images.merge(s2)
    }
  } else {
      s2 = s2.map(function(i) { return i.set({MISSION: 'S2'})})
      images = images.merge(s2) // always include s2
  }
  
  images = ee.ImageCollection(images)
  
  if(options && options.filterMasked) {
    print('Befor masking: ', images.size())
    images = images.map(function(i) {
      return i.set({complete: i.select(0).mask().reduceRegion(ee.Reducer.allNonZero(), g, Map.getScale() * 50).values().get(0)})
    }).filter(ee.Filter.eq('complete', 1))
    print('After masking: ', images.size())
    print(images)
  }

  return images
}

function focalMaxWeight(image, radius) {
  var distance = image.fastDistanceTransform(radius).sqrt()
  var dilation = distance.where(distance.gte(radius), radius)
  
  dilation = ee.Image(radius).subtract(dilation).divide(radius)
  
  return dilation
}

/***
 * Sentinel-2 produces multiple images, resultsing sometimes 4x more images than the actual size. 
 * This is bad for any statistical analysis.
 * 
 * This function mosaics images by time.    
 */
function mosaicByTime(images) {
  var TIME_FIELD = 'system:time_start'

  var distinct = images.distinct([TIME_FIELD])

  var filter = ee.Filter.equals({ leftField: TIME_FIELD, rightField: TIME_FIELD });
  var join = ee.Join.saveAll('matches')
  var results = join.apply(distinct, images, filter)

  // mosaic
  results = results.map(function(i) {
    var mosaic = ee.ImageCollection.fromImages(i.get('matches')).sort('system:index').mosaic()
    
    return mosaic.copyProperties(i).set(TIME_FIELD, i.get(TIME_FIELD))
  })
  
  return ee.ImageCollection(results)
}

exports.mosaicByTime = mosaicByTime

/***
 * Sentinel-2 produces multiple images, resultsing sometimes 4x more images than the actual size. 
 * This is bad for any statistical analysis.
 * 
 * This function mosaics images by time. 
 */
function mosaicByDate(images, opt_reducer) {
  var reducer = opt_reducer || ee.Reducer.first()

  images = images.map(function(i) { 
    return i.set({date: i.date().format('YYYY-MM-dd')})
  })
  
  var TIME_FIELD = 'date'

  var distinct = images.distinct([TIME_FIELD])

  var filter = ee.Filter.equals({ leftField: TIME_FIELD, rightField: TIME_FIELD });
  var join = ee.Join.saveAll('matches')
  var results = join.apply(distinct, images, filter)

  // mosaic
  var bandNames = ee.Image(images.first()).bandNames()
  results = results.map(function(i) {
    var mosaic = ee.ImageCollection.fromImages(i.get('matches')).sort('system:index').reduce(reducer).rename(bandNames)
    
    return mosaic.copyProperties(i).set(TIME_FIELD, i.get(TIME_FIELD))
      .set('system:time_start', ee.Date(i.get(TIME_FIELD)).millis())
  })
  
  return ee.ImageCollection(results)
}

exports.mosaicByDate = mosaicByDate

function addQualityScore(images, g, options) {
  var scorePercentile = (options && options.percentile) || 75
  var scale = (options && options.scale) || 500
  var mask = (options && options.mask) || null
  var qualityBand = (options && options.qualityBand) || 'green'

  return images
    .map(function(i) { 
      var score = i.select(qualityBand) //.where(i.select('green').gt(0.5), 0.5)

      if(mask) {
        score = score.updateMask(mask)
      }

      score = score        
        .reduceRegion(ee.Reducer.percentile([scorePercentile]), g, scale).values().get(0)

      // var score = i.select('green').add(i.select('blue'))
      //  .reduceRegion(ee.Reducer.percentile([scorePercentile]), g, scale).values().get(0)

      // var cloudScore = computeCloudScore(i)
      // var score = cloudScore.gt(cloudThreshold)
      //   .reduceRegion(ee.Reducer.sum(), g, scale).values().get(0)

      return i.set({ quality_score: score })
    })
}

function getMostlyCleanImages(images, g, options) {
  g = ee.Geometry(g)
  
  var scale = (options && options.scale) || 500
  var p = (options && options.percentile) || 85

  // http://www.earthenv.org/cloud
  var modisClouds = ee.Image('users/gena/MODCF_meanannual')
  
  var cloudFrequency = modisClouds.divide(10000).reduceRegion(
    ee.Reducer.percentile([p]), 
    g.buffer(10000, scale*5), scale*5).values().get(0)
    
  //print('Cloud frequency (over AOI):', cloudFrequency)
  
  // decrease cloudFrequency, include some more partially-cloudy images then clip based on a quality metric
  // also assume inter-annual variability of the cloud cover
  cloudFrequency = ee.Number(cloudFrequency).subtract(0.15).max(0.0)
  
  if(options && options.cloudFrequencyThresholdDelta) {
    cloudFrequency = cloudFrequency.add(options.cloudFrequencyThresholdDelta)
  }
    

  var images = images
    .filterBounds(g)

  var size = images.size()
  
  images = addQualityScore(images, g, options)
    .filter(ee.Filter.gt('quality_score', 0)) // sometimes null?!

  /*
  var scoreMin = 0.01
  var scoreMax = images.reduceColumns(ee.Reducer.percentile([ee.Number(1).subtract(cloudFrequency).multiply(100)]), ['score']).values().get(0)
  
  if(debug) {
    printChart('Quality score:', ui.Chart.feature.histogram(images, 'score', 200))
    print('scoreMax:', scoreMax)
    print('size, all: ', size)
  }
  
  // filter by quality score
  // images = images
  //   .filter(ee.Filter.and(ee.Filter.gte('score', scoreMin), ee.Filter.lte('score', scoreMax)))
  */
  
  // clip collection
  images = images.sort('quality_score')
    .limit(images.size().multiply(ee.Number(1).subtract(cloudFrequency)).toInt())
    
  // remove too dark images
  //images = images.sort('quality_score', false)
    //.limit(images.size().multiply(0.99).toInt())
  
  //print('size, filtered: ', images.size())      

  return images
    //.set({scoreMax: scoreMax})
}

function getCleanImages(g) {
  var images = getImages(g)
  return getMostlyCleanImages(images, g)
}

function filterBadPixelImages(images, g, min, max, radiusErosion, radiusDelation, maxBadPixelCountPercentile) {
  // compute simple quality score
  images = images.map(function(i) { 
    return i.addBands((i.select('swir').add(i.select('blue')).add(i.select('green'))).rename('q')) 
  })

  var min = 5
  var max = 95
  
  var pMin = images.select('q').reduce(ee.Reducer.percentile([min])).rename('min')
  var pMax = images.select('q').reduce(ee.Reducer.percentile([max])).rename('max')

  var scale = 250

  // bad pixel removal (costly)
  images = images.map(function(i) {
    var q = i.select('q')
    
    var bad = ee.Image(0)
    
    bad = bad.or(q.lt(pMin))
    bad = bad.or(q.gt(pMax))

    return i.set({ badPixelCount: bad.reduceRegion(ee.Reducer.sum(), g, scale).values().get(0) })
  })
  
  var threshold = images.reduceColumns(ee.Reducer.percentile([maxBadPixelCountPercentile]), ['badPixelCount']).values().get(0)
  print('Cloud count threshold: ',  threshold, 'scale = ' + scale)
  print(ui.Chart.feature.histogram(images, 'badPixelCount'))

  images = images.filter(ee.Filter.lt('badPixelCount', threshold))
  
  return images
}

exports.filterBadPixelImages = filterBadPixelImages


function clampImages(images, min, max, radiusErosion, radiusDilation, radiusWeight) {
  // compute simple quality score
  images = images.map(function(i) { 
    return i.addBands((i.select('swir').add(i.select('blue')).add(i.select('green'))).rename('q')) 
  })
  
  if(min) {
    var pMin = images.select('q').reduce(ee.Reducer.percentile([min])).rename('min')
  }
  
  if(max) {
    var pMax = images.select('q').reduce(ee.Reducer.percentile([max])).rename('max')
  }
  
  // bad pixel removal (costly)
  images = images.map(function(i) {
    var q = i.select('q')
    
    var bad = ee.Image(0)
    
    if(min) {
      bad = bad.or(q.lt(pMin))
    }
    
    if(max) {
      bad = bad.or(q.gt(pMax))
    }
    
    if(radiusErosion) {      
      bad = utils.focalMin(bad, radiusErosion)
    }
    
    if(radiusDilation) {
      bad = utils.focalMax(bad, radiusDilation)
    }
    
    if(radiusWeight) {
      bad = utils.focalMaxWeight(bad, radiusWeight)
    }
    
    return i.updateMask(bad.not())
  })
  
  return images
}

function computeQualityMeanComposite(g, op, opt_pMin) {
  var images = getImages(g, { resample: true })

  images = getMostlyCleanImages(images, g)

  images = images.map(function(i) { 
    return i.addBands((i.select('swir').add(i.select('blue')).add(i.select('green'))).rename('q')) 
  })
  
  var pMin = opt_pMin || 95
  
  var pMin = images.select('q').reduce(ee.Reducer.percentile([pMin])).rename('q')
  
  // bad pixel removal (costly)
  images = images.map(function(i) {
    var bad = i.select('q').gt(pMin).or(i.select('q').lt(0.005))
    
    var radius = {erosion: 5, dilation: 50, weight: 50} 
      
    bad = utils.focalMin(bad, radius.erosion)
    bad = utils.focalMax(bad, radius.dilation)
    
    // sum(w * x)
    var weight = ee.Image(1).subtract(utils.focalMaxWeight(bad, radius.weight)).float().rename('weight')

    return op(i).addBands(weight)
  })
  
  var bandNames = ee.Image(images.first()).bandNames().slice(0, -1)

  // mean = sum(w * x) / sum(w)          
  var mean = images.map(function(i) { 
     return i.select(bandNames).multiply(i.select('weight'))
  }).select(bandNames).sum().divide(images.select('weight').sum())

  return mean
}

/***
 * Compute one or more high percentile for every pixel and add quality score if pixel value is hither/lower than the threshold %
 */
function addCdfQualityScore(images, opt_thresholdMin, opt_thresholdMax, opt_includeNeighborhood, opt_neighborhoodOptions) {
  images = images.map(function(i) { 
    return i.addBands(i.select('green').rename('q'))
    // return i.addBands((i.select('swir').add(i.select('blue')).add(i.select('green'))).rename('q'))  // q is cloud score
  })
  
  var thresholdMin = opt_thresholdMin || 75
  var thresholdMax = opt_thresholdMax || 95
  
  // P(bad | I < min) = 0, P(bad | I >= max) = 1
  var pBad = images.select('q').reduce(ee.Reducer.percentile([thresholdMin, thresholdMax])).rename(['qmin', 'qmax']) 
  var pBadRange = pBad.select('qmax').subtract(pBad.select('qmin'))
  
  // var pBad = images.select('q').reduce(ee.Reducer.percentile([thresholdMin])).rename(['qmin']) 

  // bad pixel removal (costly)
  images = images.map(function(i) {
    
    // probability of bad due to high reflactance values
    var badLinear = i.select('q')
      .max(pBad.select('qmin'))
      .min(pBad.select('qmax'))
      .subtract(pBad.select('qmin'))
      .divide(pBadRange)
      .clamp(0, 1)
    
    // probability of bad due to low values
    var badLow = i.select('q').lt(0.005)
      
    var badWeight = badLinear.multiply(badLow.not())
    
    // var bad = i.select('q').gte(pBad.select('qmin'))

    if(opt_includeNeighborhood) {
      var radius = opt_neighborhoodOptions || {erosion: 5, dilation: 50, weight: 50} 
    
      // opening  
      var bad = badWeight.gt(0.5)

      if(radius.erosion) {
        bad = utils.focalMin(bad, radius.erosion)
      }

      bad = utils.focalMax(bad, radius.dilation)
    
      bad = utils.focalMaxWeight(bad, radius.weight)
     
      badWeight = badWeight.max(bad)
    }

    // smoothen scene boundaries
    // badWeight = badWeight
    //  .multiply(utils.focalMin(i.select('blue').mask(), 10).convolve(ee.Kernel.gaussian(5, 3)))
    

    // compute bad pixel probability 
    var weight = ee.Image(1).float().subtract(badWeight).rename('weight')

    return i
      .addBands(weight)
      .addBands(pBad)
  })
  
  return images
}


/***
 * Rescales to given ranges
 */
var rescale = function(img, exp, thresholds) {
  return img.expression(exp, {img: img}).subtract(thresholds[0]).divide(thresholds[1] - thresholds[0]);
};

/*** 
 * Aster radiometric correction algorithms
 */
var Aster = {
  radiance: {
    fromDN: function(image) {
      // Gain coefficients are dynamic (i.e. can be high, normal, low_1 or low_2)
      var multiplier = ee.Image([
        ee.Number(image.get('GAIN_COEFFICIENT_B01')).float(),
        ee.Number(image.get('GAIN_COEFFICIENT_B02')).float(),
        ee.Number(image.get('GAIN_COEFFICIENT_B3N')).float(),
        //ee.Number(image.get('GAIN_COEFFICIENT_B04')).float()
        ])
      
      // Apply correction
      var radiance = image.select(['B01', 'B02', 'B3N'/*, 'B04'*/], ['green','red','nir'/*,'swir1'*/])
        .subtract(1).multiply(multiplier)
      
      // Define properties required for reflectance calculation
      var solar_z = ee.Number(90).subtract(image.get('SOLAR_ELEVATION'))
      
      return radiance.set({
        'system:time_start': image.get('system:time_start'),
        'solar_zenith':solar_z
      })
    }
  },
  
  reflectance: {
    fromRad: function(rad) {
      // calculate day of year from time stamp
      var date = ee.Date(rad.get('system:time_start'));
      var jan01 = ee.Date.fromYMD(date.get('year'),1,1);
      var doy = date.difference(jan01,'day').add(1);

      // Earth-Sun distance squared (d2) 
      var d = ee.Number(doy).subtract(4).multiply(0.017202).cos().multiply(-0.01672).add(1) // http://physics.stackexchange.com/questions/177949/earth-sun-distance-on-a-given-day-of-the-year
      var d2 = d.multiply(d)  
      
      // mean exoatmospheric solar irradiance (ESUN)
      var ESUN = [1847, 1553, 1118/*, 232.5*/] // from Thome et al (A) see http://www.pancroma.com/downloads/ASTER%20Temperature%20and%20Reflectance.pdf
      
      // cosine of solar zenith angle (cosz)
      var solar_z = ee.Number(rad.get('solar_zenith'))
      var cosz = solar_z.multiply(Math.PI).divide(180).cos()

      // calculate reflectance
      var scalarFactors = ee.Number(Math.PI).multiply(d2).divide(cosz)
      var scalarApplied = rad.multiply(scalarFactors)
      var reflectance = scalarApplied.divide(ESUN)
      
      return reflectance
    }
  },
  
  temperature: {
    fromDN: function(image) {
      var bands = ['B10', 'B11', 'B12', 'B13', 'B14']
      var multiplier = ee.Image([0.006822, 0.006780, 0.006590, 0.005693, 0.005225])
      var k1 = ee.Image([3040.136402, 2482.375199, 1935.060183, 866.468575, 641.326517])
      var k2 = ee.Image([1735.337945, 1666.398761, 1585.420044, 1350.069147, 1271.221673])
  
      var radiance = image.select(bands).subtract(1).multiply(multiplier)
      var t = k2.divide(k1.divide(radiance).add(1).log()).rename(bands)
      
      return t
    }
  },
  
  cloudScore: function(image) {
    // Compute several indicators of cloudyness and take the minimum of them.
    var score = ee.Image(1.0);

    // Snow is reasonably bright in all visible bands.
    score = score.min(rescale(image, 'img.red + img.green', [0.2, 0.8]))

    // Excluded this for snow reasonably bright in all infrared bands.
    score = score.min(rescale(image, 'img.nir + img.swir1', [0.2, 0.4]))

    // Clouds are reasonably cool in temperature.
    score = score.min(rescale(image.resample('bicubic'), '(img.B10 + img.B12 + img.B14) / 3.0', [293, 280]))

    // However, clouds are not snow.
    //let ndsi = img.normalizedDifference(['red', 'swir']);
    //score = score.min(rescale(ndsi, 'img', [0.8, 0.6])).aside(show, 'score ndsi')

    return score;
  },
  
  TOA: function(image) {
    var radiance = Aster.radiance.fromDN(image)
    var reflectance = Aster.reflectance.fromRad(radiance)
    var temperature = Aster.temperature.fromDN(image)

    var result = reflectance.addBands(temperature)
    result = result.set('system:time_start', image.get('system:time_start'))
    result = result.copyProperties(image)
    result = ee.Image(result)
    
    return result
  }
}

exports.Aster = Aster

exports.clampImages = clampImages

exports.getCity = getCity
exports.getCountry = getCountry
exports.getRiver = getRiver
exports.getImages = getImages
exports.getCleanImages = getCleanImages

exports.computeQualityMeanComposite = computeQualityMeanComposite

// legacy
exports.getMostlyCleanImages = getMostlyCleanImages

exports.addQualityScore = addQualityScore


exports.addCdfQualityScore = addCdfQualityScore

