gsutil -m cp *.geojson gs://hydro-engine-waterbodies/time-series/
gsutil -m acl ch -u AllUsers:R gs://hydro-engine-waterbodies/time-series/*

