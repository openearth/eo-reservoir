require('ee-runner')

// parse command line
let cmd = require('commander')

cmd
  .version('0.0.1')
  .description('Creates a new task to generate waterbody time series')
  .usage('<code-editor-script-path>')
  .option('-a, --authenticate', 'Authenticate user to acess Google Earth Engine and Google Cloud Storage')
  .parse(process.argv);

if(cmd.rawArgs.length < 1) {
  cmd.help();
  process.exit();
}

gee.initialize(() => {
  let geometry = require('./imports.js').geometry

  let water = require('./algorithm')

  var waterOccurrence = ee.Image("JRC/GSW1_0/GlobalSurfaceWater")
    .select('occurrence')
    .divide(100)
    .unmask(0)
    .resample('bilinear')
  
  waterOccurrence = waterOccurrence
    .mask(waterOccurrence)  
  
  // var waterbodies = ee.FeatureCollection("users/rogersckw9/final-waterbodies/waterbodies")

  /*
  const folder = 'waterbody-area'
  var waterbodies = new ee.FeatureCollection([])

  ee.data.getList({id: 'users/rogersckw9/waterbodies'}).map(function(o) {
    waterbodies = waterbodies.merge(ee.FeatureCollection(o['id']))
  })
  */

  /*
  var total = waterbodies.size().getInfo()
  print('Number of waterbodies: ' + total)

  function getWaterbody(i) {
      return ee.Feature(waterbodies.toList(1, i).get(0))
  }
  */

  /*
  const folder = 'waterbody-area-validation'
  var dams = ee.FeatureCollection('ft:10bIIDcBgxWa8yhZ1GrIIKkyc66yXZ0M6lBRjEj6k')
  var damsList = dams.toList(1000)
  var total = damsList.size().getInfo()
  print('Number of waterbodies: ' + total)

  // waterbodies (JRC)
  var waterbodiesJRC = ee.FeatureCollection('users/gena/waterbodies-jrc-cells-merged')

  // get waterbody using raw JRC data
  function getWaterbody(i) {
      let currentDam = ee.Feature(damsList.get(i))

      let currentWaterbody = waterbodiesJRC.filterBounds(currentDam.geometry().buffer(90)).geometry()
      currentWaterbody = waterbodiesJRC.filterBounds(currentWaterbody).geometry().dissolve() // tile boundary


      // smaller than 50km
      currentWaterbody = currentWaterbody.intersection(currentDam.geometry().buffer(50000), 100)

      // custom clip
      var features = currentWaterbody.difference(geometry).geometries().map(function(g) {
        return ee.Feature(ee.Geometry(g))
      })
    
      currentWaterbody = ee.FeatureCollection(features).filterBounds(currentDam.geometry().buffer(90)).geometry()
    
      currentWaterbody = ee.Feature(currentWaterbody)


      // sometimes nasty geometries pop-up
      var g = currentWaterbody.geometry()
      var type = g.type()
    
      if(type.getInfo() === 'GeometryCollection') {
        var geoms = g.geometries()
      
        print('Fount ' + geoms.length().getInfo() + ' geometries, selecting the largest one')
      
        var features = geoms.map(function(gg) { 
          gg = ee.Geometry(gg)
          return ee.Feature(gg).set({area: gg.area(10)}) 
        })
        currentWaterbody = ee.Feature(ee.FeatureCollection(features).sort('area', false).first())
        g = currentWaterbody.geometry()
      }

      if(g.coordinates().length().getInfo() === 0) {
          return null
      }

      let coordinates = ee.List(ee.List(g.buffer(-10).coordinates().get(0)).get(0))

      return currentWaterbody
          .set({ Lake_lat: coordinates.get(1), Lake_lon: coordinates.get(0) })
  }
  */

  /*
  let hydroLakes = ee.FeatureCollection("users/gena/HydroLAKES_polys_v10")

  // ZIMBABWE
  let countries = ee.FeatureCollection('USDOS/LSIB/2013')
  let waterbodies = hydroLakes.filterBounds(countries.filter(ee.Filter.inList('name', ['ZIMBABWE'])).geometry())
  const folder = 'waterbody-area-zimbabwe'

  function getWaterbody(i) {
      return ee.Feature(waterbodies.toList(1, i).get(0))
  }
  */

  /*
  let waterbodies = ee.FeatureCollection("users/gena/eo-reservoirs/waterbodies-10-19-extra")

  const folder = 'waterbody-area-extra'

  function getWaterbody(i) {
      return ee.Feature(waterbodies.toList(1, i).get(0))
  }
  */

  let hydroLakes = ee.FeatureCollection("users/gena/HydroLAKES_polys_v10")

  // ZIMBABWE
  let countries = ee.FeatureCollection('USDOS/LSIB/2013')
  let waterbodies = hydroLakes.filterBounds(countries.filter(ee.Filter.inList('name', ['ZAMBIA'])).geometry())
  const folder = 'waterbody-area-zambia'

  function getWaterbody(i) {
      return ee.Feature(waterbodies.toList(1, i).get(0))
  }



  // new
  // let waterbodiesOld = ee.FeatureCollection("users/rogersckw9/final-waterbodies/waterbodies")
  // let waterbodies = ee.FeatureCollection("users/rogersckw9/final-waterbodies/waterbodies-2")
  // let waterbodies = ee.FeatureCollection("users/gena/eo-reservoirs/waterbodies-10-07-missing-data")
  //    .filter(ee.Filter.and(ee.Filter.neq('Lake_name', 'Caspian Sea'), ee.Filter.neq('Hylak_id', 15370)))

  // const folder = 'waterbody-area-2'

  //waterbodies = waterbodies.merge(ee.FeatureCollection("users/rogersckw9/missing-waterbodies/missing-MENA-waterbodies-2018-10-02"))

  // function getWaterbody(i) {
  //    return ee.Feature(waterbodies.toList(1, i).get(0))
  // }


  // Hirakud, India
  // let waterbodies = hydroLakes.filterBounds(ee.Geometry.Point([83.7906177915039, 21.594684418519105]))
  // const folder = 'waterbody-area-Hidakud'

  var total = waterbodies.size().getInfo()
  print('Number of waterbodies: ' + total)

  // time
  var start = '1985-01-01'
  var stop = '2018-08-01'
  //var start = '2017-01-01'
  //var stop = '2018-01-01'

  // compute and export time series for every waterbody

  //var offset = 4
  //var count = 10000
  //var offsetExport = 5539

  var offset = 0
  var count = 10000
  var offsetExport = 8000

  for(let i=offset; i<Math.min(count + offset, total); i++) {
    let waterbody = getWaterbody(i)

    //if(!waterbody) {
    //    print('No waterbody detected for dam index: ' + i)
    //    continue
    //}

    // let w = waterbody.geometry().union(hydroLakes.filterBounds(waterbody.geometry()).geometry()).dissolve()
    let w = waterbody

    w = ee.Feature(w)
      .copyProperties(waterbody, ['Lake_lat', 'Lake_lon'])

    let scale = w.geometry().area().sqrt().divide(200).max(10).getInfo()

    exportWaterbodyAreaTimeSeries(w, i + offsetExport, scale)
  }

function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

function exportWaterbodyAreaTimeSeries(waterbody, i, scale) {
  waterbody = ee.Feature(waterbody)

  // empty!!
  var lat = ee.Number(waterbody.get('Lake_lat'))
  var lon = ee.Number(waterbody.get('Lake_lon'))

  //var coords = ee.List(ee.List(waterbody.geometry().buffer(-90).coordinates().get(0)).get(0))
  //var lat = ee.Number(coords.get(1))
  //var lon = ee.Number(coords.get(0))

  // to be inspected:
  // var bad = [94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 145, 147, 170]
  // 169, 207, 382, 383, 506 - different number of times / points
  // 115, 116 - crazily small

  // water area (JRC)
  var waterAreaJRC = water.computeSurfaceWaterAreaJRC(waterbody, start, stop, scale)
  
  // water area (optical images, Landsat and Sentinel-2)
  var waterArea = water.computeSurfaceWaterArea(waterbody, start, stop, scale, waterOccurrence)

  waterArea = waterArea
    .filter(ee.Filter.and(
        ee.Filter.neq('p', 101),
        ee.Filter.gt('ndwi_threshold', -0.15),
        ee.Filter.lt('ndwi_threshold', 0.5),
        ee.Filter.lt('filled_fraction', 0.6)
  ))

  // generate feature to export
  var water_area_time = waterArea.aggregate_array('system:time_start')
  var water_area_value = waterArea.aggregate_array('area')
  var water_area_filled = waterArea.aggregate_array('area_filled')
  var water_area_p = waterArea.aggregate_array('p')
  var quality_score = waterArea.aggregate_array('quality_score')
  var ndwi_threshold = waterArea.aggregate_array('ndwi_threshold')

  var water_area_filled_fraction = waterArea.aggregate_array('filled_fraction')
  
  var water_area_time_jrc = waterAreaJRC.aggregate_array('system:time_start')
  var water_area_value_jrc = waterAreaJRC.aggregate_array('area')

  var mission = waterArea.aggregate_array('MISSION')
    
  var waterbody_pt = ee.Geometry.Point(ee.List([lon, lat]).flatten().slice(0, 2)) // something strange is going on with coordinates, trying to fix them by flattening and slicing

  // export
  var f = ee.Feature(waterbody_pt, {
    water_area_time: water_area_time,
    water_area_value: water_area_value,

    water_area_filled: water_area_filled,
    water_area_p: water_area_p,
    quality_score: quality_score,
    ndwi_threshold: ndwi_threshold,

    water_area_filled_fraction: water_area_filled_fraction,
  
    water_area_time_jrc: water_area_time_jrc,
    water_area_value_jrc: water_area_value_jrc,

    mission: mission,

    area: waterbody.area(),
    scale: scale,
  })
  
  var features = ee.FeatureCollection([f])

  var name = 'water_area_' + pad(i, 5)

  print(name + ', scale: ' + scale)

  let done = false

  function onError(message) {
    console.log('error: ' + i + ' ' + message)
    done = true
  }

  function onSuccess(message) {
    done = true
  }

  ee.batch.Export.table.toDrive(features, name, folder, name, 'GeoJSON')
    .start(onSuccess, onError)
  
  while(!done) {
    require('deasync').sleep(100);
  }
}

})

