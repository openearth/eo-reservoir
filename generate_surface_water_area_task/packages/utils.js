/***
 * Multiteporal speckle filter: image is the original image, images is the temporal collection of images
 * 
 * Version: 1.0
 * 
 * by Genadii Donchyts https://groups.google.com/d/msg/google-earth-engine-developers/umGlt5qIN1I/jQ4Scd_pAAAJ
 *
 * Example: https://code.earthengine.google.com/52c695b6fe7c25b5cdc1f16c8dd0f17e
 */
function multitemporalDespeckle(images, radius, units, opt_timeWindow) {
  var timeWindow = opt_timeWindow || { before: -3, after: 3, units: 'month' }
  var bandNames = ee.Image(images.first()).bandNames()
  var bandNamesMean = bandNames.map(function(b) { return ee.String(b).cat('_mean') })
  var bandNamesRatio = bandNames.map(function(b) { return ee.String(b).cat('_ratio') })
  
  // compute space-average for all images
  var meanSpace = images.map(function(i) {
    var reducer = ee.Reducer.mean()
    var kernel = ee.Kernel.square(radius, units)
    
    var mean = i.reduceNeighborhood(reducer, kernel).rename(bandNamesMean)
    var ratio = i.divide(mean).rename(bandNamesRatio)

    return i.addBands(mean).addBands(ratio)
  })

  /***
  * computes a multi-temporal despeckle function for a single image
  */
  function multitemporalDespeckleSingle(image) {
    var t = image.date()
    var from = t.advance(ee.Number(timeWindow.before), timeWindow.units)
    var to = t.advance(ee.Number(timeWindow.after), timeWindow.units)
    
    var meanSpace2 = ee.ImageCollection(meanSpace).select(bandNamesRatio).filterDate(from, to)
      .filter(ee.Filter.eq('relativeOrbitNumber_start', image.get('relativeOrbitNumber_start'))) // use only images from the same cycle
    
    var b = image.select(bandNamesMean)

    return b.multiply(meanSpace2.sum()).divide(meanSpace2.count()).rename(bandNames)
      .copyProperties(image, ['system:time_start'])
  }
  
  return meanSpace.map(multitemporalDespeckleSingle).select(bandNames)
}

/***
 * Removes low-entropy edges
 */
function maskLowEntropy(image) { 
  var bad = image.select(0).multiply(10000).toInt().entropy(ee.Kernel.circle(5)).lt(3.2)
 
  return image.updateMask(image.mask().multiply(bad.focal_max(5).not()))
} 


// I(n+1, i, j) = I(n, i, j) + lambda * (cN * dN(I) + cS * dS(I) + cE * dE(I), cW * dW(I))
var peronaMalikFilter = function(I, iter, opt_K, opt_method) {
  var method = opt_method || 1
  var K = opt_K || 10

  var dxW = ee.Kernel.fixed(3, 3,
                           [[ 0,  0,  0],
                            [ 1, -1,  0],
                            [ 0,  0,  0]]);
  
  var dxE = ee.Kernel.fixed(3, 3,
                           [[ 0,  0,  0],
                            [ 0, -1,  1],
                            [ 0,  0,  0]]);
  
  var dyN = ee.Kernel.fixed(3, 3,
                           [[ 0,  1,  0],
                            [ 0, -1,  0],
                            [ 0,  0,  0]]);
  
  var dyS = ee.Kernel.fixed(3, 3,
                           [[ 0,  0,  0],
                            [ 0, -1,  0],
                            [ 0,  1,  0]]);

  var lambda = 0.2;

  if(method == 1) {
    var k1 = ee.Image(-1.0/K);

    for(var i = 0; i < iter; i++) {
      var dI_W = I.convolve(dxW)
      var dI_E = I.convolve(dxE)
      var dI_N = I.convolve(dyN)
      var dI_S = I.convolve(dyS)
      
      var cW = dI_W.multiply(dI_W).multiply(k1).exp();
      var cE = dI_E.multiply(dI_E).multiply(k1).exp();
      var cN = dI_N.multiply(dI_N).multiply(k1).exp();
      var cS = dI_S.multiply(dI_S).multiply(k1).exp();
  
      I = I.add(ee.Image(lambda).multiply(cN.multiply(dI_N).add(cS.multiply(dI_S)).add(cE.multiply(dI_E)).add(cW.multiply(dI_W))))
    }
  }
  else if(method == 2) {
    var k2 = ee.Image(K).multiply(ee.Image(K));

    for(var i = 0; i < iter; i++) {
      var dI_W = I.convolve(dxW)
      var dI_E = I.convolve(dxE)
      var dI_N = I.convolve(dyN)
      var dI_S = I.convolve(dyS)
      
      var cW = ee.Image(1.0).divide(ee.Image(1.0).add(dI_W.multiply(dI_W).divide(k2)));
      var cE = ee.Image(1.0).divide(ee.Image(1.0).add(dI_E.multiply(dI_E).divide(k2)));
      var cN = ee.Image(1.0).divide(ee.Image(1.0).add(dI_N.multiply(dI_N).divide(k2)));
      var cS = ee.Image(1.0).divide(ee.Image(1.0).add(dI_S.multiply(dI_S).divide(k2)));
  
      I = I.add(ee.Image(lambda).multiply(cN.multiply(dI_N).add(cS.multiply(dI_S)).add(cE.multiply(dI_E)).add(cW.multiply(dI_W))))
    }
  }
  
  return I;
}

exports.peronaMalikFilter = peronaMalikFilter

/***
 * pad(0,3) --> '003'
 */
exports.pad = function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

/***
 * Clips and rescales image using a given range of values
 */ 
exports.rescale = function(img, exp, thresholds) {
  return img.expression(exp, { img: img }).subtract(thresholds[0]).divide(thresholds[1] - thresholds[0]);
};

/*** 
 * Convet image from degrees to radians
 */
function radians(img) { return img.toFloat().multiply(3.1415927).divide(180); }

/***
 * Computes hillshade
 */
exports.hillshade = function(az, ze, slope, aspect) {
  var azimuth = radians(ee.Image.constant(az));
  var zenith = radians(ee.Image.constant(ze));
  return azimuth.subtract(aspect).cos().multiply(slope.sin()).multiply(zenith.sin())
      .add(zenith.cos().multiply(slope.cos()));
}

/***
 * Styles RGB image using hillshading, mixes RGB and hillshade using HSV<->RGB transform
 */
function hillshadeRGB(image, elevation, weight, height_multiplier, azimuth, zenith, castShadows, proj) {
  weight = weight || 1.5
  height_multiplier = height_multiplier || 5
  azimuth = azimuth || 0
  zenith = zenith || 45

  var hsv = image.visualize().unitScale(0, 255).rgbToHsv();
 
  var z = elevation.multiply(ee.Image.constant(height_multiplier))

  var terrain = ee.Algorithms.Terrain(z)
  var slope = radians(terrain.select(['slope']));

  var aspect = radians(terrain.select(['aspect'])).resample('bicubic');
  var hs = exports.hillshade(azimuth, zenith, slope, aspect).resample('bicubic');

  if(castShadows) {
    var hysteresis = true
    var neighborhoodSize = 100

    var hillShadow = ee.Algorithms.HillShadow(z, azimuth, zenith, neighborhoodSize, hysteresis).float().not()
    
    // opening
    // hillShadow = hillShadow.multiply(hillShadow.focal_min(3).focal_max(6))    
  
    // cleaning
    hillShadow = hillShadow.focal_mode(3)
  
    // smoothing  
    hillShadow = hillShadow.convolve(ee.Kernel.gaussian(5, 3))
  
    // transparent
    hillShadow = hillShadow.multiply(0.4)
  
    hs = ee.ImageCollection.fromImages([
      hs.rename('shadow'), 
      hillShadow.mask(hillShadow).rename('shadow')
    ]).mosaic()
  }

  var intensity = hs.multiply(ee.Image.constant(weight)).multiply(hsv.select('value'));
  var huesat = hsv.select('hue', 'saturation');

  return ee.Image.cat(huesat, intensity).hsvToRgb();
}

exports.hillshadeRGB = hillshadeRGB 

exports.hillshadeit = hillshadeRGB // backward-compabitility

/***
 * Adds a features layer as an image
 */
exports.Map = {
  addAsImage: function(features, name, options) {
    var fill = true
    var outline = true
    var palette = ['555555', '000000','ffff00']
    var image = true
    var opacity = 1
  
    fill = typeof(options.fill) === 'undefined' ? fill : options.fill
    outline = typeof(options.outline) === 'undefined' ? outline : options.outline
    palette = options.palette || palette
    opacity = options.opacity || opacity

    if(typeof(features) === 'undefined') {
      throw 'Please specify features'
    }
    
    if(typeof(name) === 'undefined') {
      throw 'Please specify name'
    }
    
    var image = ee.Image().byte()
    
    if(fill) {
      image = image
        .paint(features, 1)
    }  
      
    if(outline) {
      image = image
        .paint(features, 2, 1)
    }
  
    var layer = {
      visible: true,
      opacity: 1.0,
      name: name
    }  
    
    if(typeof(options.layer) !== 'undefined') {
      layer.visible = typeof(options.layer.visible) !== 'undefined' ? options.layer.visible : layer.visible
      layer.opacity = typeof(options.layer.opacity) !== 'undefined' ? options.layer.opacity : layer.opacity
    }
  
    Map.addLayer(image, { palette: palette, min:0, max:2, opacity: opacity}, 
      layer.name, layer.visible, layer.opacity)
  }
} 

exports.focalMin = function(image, radius) {
  var erosion = image.not().fastDistanceTransform(radius).sqrt().lte(radius).not()

  return erosion
}

exports.focalMax = function(image, radius) {
  var dilation = image.fastDistanceTransform().sqrt().lte(radius)

  return dilation
}
  
exports.focalMaxWeight = function(image, radius) {
  var distance = image.fastDistanceTransform(radius).sqrt()
  var dilation = distance.where(distance.gte(radius), radius)
  
  dilation = ee.Image(radius).subtract(dilation).divide(radius)
  
  return dilation
}

function getIsolines(image, opt_levels) {
  var addIso = function(image, level) {
    var crossing = image.subtract(level).focal_median(3).zeroCrossing();
    var exact = image.eq(level);
    
    return ee.Image(level).float().mask(crossing.or(exact)).set({level: level})
  };
  
  var levels = opt_levels || ee.List.sequence(0, 1, 0.1);
  
  levels = ee.List(levels)
  
  var isoImages = ee.ImageCollection(levels.map(function(l) {
    return addIso(image, ee.Number(l))
  }))

  return isoImages
}

exports.getIsolines = getIsolines


function addIsolines(image, levels) {
  var colors = ['f7fcf0','e0f3db','ccebc5','a8ddb5','7bccc4','4eb3d3','2b8cbe','0868ac','084081']

  var isoImages = getIsolines(image, levels)
  
  var isolinesLayer = ui.Map.Layer(isoImages.mosaic(), {min: 0, max: 1, palette: colors}, 'isolines', false, 0.3)
  
  Map.layers().add(isolinesLayer)
}

exports.addIsolines = addIsolines


/***
 * Generates image collection gallery.
 */
function ImageGallery(images, region, rows, columns, options) {
  // var proj = ee.Image(images.first()).select(0).projection()
  var proj = ee.Projection('EPSG:3857', [Map.getScale(), 0, 0, 0, -Map.getScale(), 0])
  var scale = proj.nominalScale()
  
  var e = ee.ErrorMargin(Map.getScale())

  var bounds = region.transform(proj, e).bounds(e, proj)
  
  var count = ee.Number(columns * rows)

  // number of images is less than grid cells
  count = count.min(images.size())

  images = images.limit(count)

  var ids = ee.List(images.aggregate_array('system:index'))

  var indices = ee.List.sequence(0, count.subtract(1))

  var offsetsX = indices.map(function(i) { return ee.Number(i).mod(columns) })
  var offsetsY = indices.map(function(i) { return ee.Number(i).divide(columns).floor() })
  
  var offsets = offsetsX.zip(offsetsY)

  var offsetByImage = ee.Dictionary.fromLists(ids, offsets)

  var coords = ee.List(bounds.coordinates().get(0))

  var w = ee.Number(ee.List(coords.get(1)).get(0)).subtract(ee.List(coords.get(0)).get(0))//.floor()
  var h = ee.Number(ee.List(coords.get(2)).get(1)).subtract(ee.List(coords.get(0)).get(1))//.floor()

  // CRASHES
  // var boundsImage = ee.Image().changeProj('EPSG:4326', proj).toInt().paint(bounds)

  var boundsImage = ee.Image().toInt().paint(bounds, 1).reproject(proj)

  // new region
  var ll = ee.List(coords.get(0))
  var ur = [ee.Number(ll.get(0)).add(w.multiply(columns)), ee.Number(ll.get(1)).add(h.multiply(rows))]
  
  var regionNew = ee.Geometry.Rectangle([ll, ur], proj, false)
  
  var mosaic = images
    .map(function(i) {
      var offset = ee.List(offsetByImage.get(i.get('system:index')))
      var xoff = w.multiply(offset.get(0)).multiply(scale)
      var yoff = h.multiply(offset.get(1)).multiply(scale)
  
      i = i.mask(boundsImage.multiply(i.mask()))

      return i.translate(xoff, yoff, 'meters', proj)
  }).mosaic()
  
  return mosaic
  // return {image: mosaic, region: regionNew};
}

exports.ImageGallery = ImageGallery


/***
 * Computes export video / image parameters: scale, rect.
 */
function generateExportParameters(bounds, w, h, crs) {
  crs = crs || 'EPSG:4326'
  
  var scale = Map.getScale()
  
  bounds = ee.Geometry(bounds).bounds(scale).transform(crs, scale)
  
  // get width / height
  var coords = ee.List(bounds.coordinates().get(0))
  var ymin = ee.Number(ee.List(coords.get(0)).get(1))
  var ymax = ee.Number(ee.List(coords.get(2)).get(1))
  var xmin = ee.Number(ee.List(coords.get(0)).get(0))
  var xmax = ee.Number(ee.List(coords.get(1)).get(0))
  var width = xmax.subtract(xmin)
  var height = ymax.subtract(ymin)

  // compute new height, ymin, ymax and bounds
  var ratio = ee.Number(w).divide(h)
  var ycenter = ymin.add(height.divide(2.0))
  var xcenter = xmin.add(width.divide(2.0))

  ymin = ee.Number(ee.Algorithms.If(width.gt(height), ycenter.subtract(width.divide(ratio).divide(2.0)), ymin))
  ymax = ee.Number(ee.Algorithms.If(width.gt(height), ycenter.add(width.divide(ratio).divide(2.0)), ymax))
  xmin = ee.Number(ee.Algorithms.If(width.lte(height), xcenter.subtract(height.multiply(ratio).divide(2.0)), xmin))
  xmax = ee.Number(ee.Algorithms.If(width.lte(height), xcenter.add(height.multiply(ratio).divide(2.0)), xmax))

  bounds = ee.Geometry.Rectangle([xmin, ymin, xmax, ymax], crs, false)
  
  var scale = bounds.projection().nominalScale().multiply(width.divide(w))

  return {scale: scale, bounds: bounds}  
}

exports.generateExportParameters = generateExportParameters

/***
 * Generates line features for line string
 */
function lineToPoints(lineString, count) {
  var length = lineString.length();
  var step = lineString.length().divide(count);
  var distances = ee.List.sequence(0, length, step)

  function makePointFeature(coord, offset) {
    var pt = ee.Algorithms.GeometryConstructors.Point(coord);
    return new ee.Feature(pt).set('offset', offset)
  }
  
  var lines = lineString.cutLines(distances).geometries();

  var points = lines.zip(distances).map(function(s) {
    var line = ee.List(s).get(0);
    var offset = ee.List(s).get(1)
    return makePointFeature(ee.Geometry(line).coordinates().get(0), offset)
  })
  
  points = points.add(makePointFeature(lineString.coordinates().get(-1), length))

  return new ee.FeatureCollection(points);
}

exports.lineToPoints = lineToPoints

/***
 * Reduces image values along the given line string geometry using given reducer.
 * 
 * Samples image values using image native scale, or opt_scale
 */
function reduceImageProfile(image, line, reducer, scale, crs, crsTransform) {
  var length = line.length();
  var distances = ee.List.sequence(0, length, scale)
  var lines = line.cutLines(distances).geometries();
  lines = lines.zip(distances).map(function(l) { 
    l = ee.List(l)
    
    var geom = ee.Geometry(l.get(0))
    var distance = ee.Geometry(l.get(1))
    
    geom = ee.Algorithms.GeometryConstructors.LineString(geom.coordinates())
    
    return ee.Feature(geom, {distance: distance})
  })
  lines = ee.FeatureCollection(lines)

  // reduce image for every segment
  var values = image.reduceRegions( {
    collection: ee.FeatureCollection(lines), 
    reducer: reducer, 
    scale: scale, 
    crs: crs
  })
  
  return values
}

exports.reduceImageProfile = reduceImageProfile

/*** 
 * Exports a video, annotates images if needed, previews a few frame.
 */
exports.exportVideo = function(images, options) {
  var label = (options && options.label) || null
  var bounds = (options && options.bounds) || Map.getBounds(true)
  var w = (options && options.width) || 1920
  var h = (options && options.height) || 1080
  var previewFrames = (options && options.previewFrames) || 0
  var maxFrames = (options && options.maxFrames) || 100
  var framesPerSecond = (options && options.framesPerSecond) || 5
  var name = (options && options.name) || 'ee-animation'
  var crs = 'EPSG:3857'
  
  // expand bounds to ensure w/h ratio
  var p = generateExportParameters(bounds, w, h, crs)
  
  if(label) {
    var annotations = [{
      position: 'left', offset: '1%', margin: '1%', property: label, scale: ee.Number(p.scale).multiply(2)
    }]
    
    var text = require('users/gena/packages:text')

    images = images.map(function(i) {
      return text.annotateImage(i, {}, p.bounds, annotations)
    })
  }

  Export.video.toDrive({ 
    collection: images, 
    description: name, 
    fileNamePrefix: name, 
    framesPerSecond: framesPerSecond, 
    dimensions: w, 
    region: p.bounds,
    maxFrames: maxFrames
  })
  
  if(previewFrames) {
    var frames = images.toList(previewFrames)
    ee.List.sequence(0, ee.Number(previewFrames).subtract(1)).evaluate(function(indices) {
      indices.map(function(i) {
        var image = ee.Image(frames.get(i)).clip(p.bounds)
        Map.addLayer(image, {}, i.toString(), false)
      })
    })
  }
}

// backward-compatibility 
exports.addImagesToMap = function() {
  throw "utils.addImagesToMap is obsolete, use require('users/gena/package:animation').animate(images) instead"
}


// returns random image with normally distributed values
exports.norm = function(seed) {
  var u1 = ee.Image.random(ee.Number(1000).add(seed))
  var u2 = ee.Image.random(ee.Number(2000).add(seed))

  // https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
  var n = u1.log().multiply(-2).sqrt().multiply(u2.multiply(2 * Math.PI).cos())

  return n
}

exports.generateHexagonalSeeds = function(size, crs, scale) {
  crs = crs || 'EPSG:3857'

  scale = scale || Map.getScale()
  
  var step = ee.Number(scale).multiply(size)

  var image1 = ee.Image.pixelCoordinates(crs)
    .mod(ee.Image.constant([step.multiply(2), step.multiply(3)]))
    .abs()
    .gt(scale)
    .reduce(ee.Reducer.anyNonZero())
    .not()

  var image2 = ee.Image.pixelCoordinates(crs).add(ee.Image.constant([step, step.multiply(1.5)]))
    .mod(ee.Image.constant([step.multiply(2), step.multiply(3)]))
    .abs()
    .gt(scale)
    .reduce(ee.Reducer.anyNonZero())
    .not()

  return ee.Image([image1, image2]).reduce(ee.Reducer.anyNonZero())
}

function fillGaps(image, radius, iterations) {
  function fillGapsSingle(image) {
    var fill = image //.where(image.mask().lt(1), image.convolve(ee.Kernel.gaussian(5, 3, 'meters')))
      .reduceNeighborhood({
        reducer: ee.Reducer.median(), 
        kernel: ee.Kernel.circle(radius, 'meters'),
        inputWeight: 'mask',
        skipMasked: false
      })
      
    return image.unmask(fill)
  }

  var result = ee.List.sequence(1, iterations).iterate(function(curr, prev) {
    var image = ee.Image(prev)
    return fillGapsSingle(image)
  }, image)
  
  return ee.Image(result)
}

exports.fillGaps = fillGaps
