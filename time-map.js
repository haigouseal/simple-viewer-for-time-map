/**
 * Time map for netCDF visualization 
 * Haitao Wang | September 09, 2015
 * update: September 23, 2015
 */

/* server configuration */
var geoserverURL = '';
var netcdfLayerName = 'netCDFtesting:devWDIR';

/* map configurations */
var mapConfig = {'styles':{} };
mapConfig.defaultView = {zoom: 6, center: [-78.56, 38.04]};
mapConfig.projection = 'EPSG:3857';

// define map layers (baselayer, sample netCDF layers)
var baseLayers = new ol.layer.Tile({
	source: new ol.source.MapQuest({layer: 'sat'})
});

//define map view
var view = new ol.View({
	zoom : mapConfig.defaultView.zoom,
	//maxZoom: 12,
	center : ol.proj.transform(mapConfig.defaultView.center, 'EPSG:4326', mapConfig.projection),
	projection: mapConfig.projection
});

//define map controls: fullscreen, scaleline, etc.
mapConfig.controls = {
	'fullscreen' : new ol.control.FullScreen({
		className:'fullscreen',
		target:'fullScreen'
	}),
	
	'scaleline': new ol.control.ScaleLine({
		className:'ol-scale-line', 
		units:['us'],
		target: 'metricBox'
	}),
	
	'overviewmap': new ol.control.OverviewMap({
		className:'ol-overviewmap',
		//target: 'overviewMap'
	}),
	
	'mousePositionControl': new ol.control.MousePosition({
		//coordinateFormat: function(coord) {return ol.coordinate.toStringHDMS(coord);},
		coordinateFormat: function(coord){return ol.coordinate.toStringXY(coord, 6)},
			projection: 'EPSG:4326',
			undefinedHTML: 'Mouse is not on map',
			target: 'metricBox'
	}),
	
	'attribution' : new ol.control.Attribution({
		collapsible: true,
		collapsed: true,
		target: 'map'
	}),
};

//create a map overlay for displaying layer title
var title = new ol.Overlay({
});

//Create a map and add controls
var map = new ol.Map({
	target : 'map',
	///layers: drawLayers must be the last one
	layers : [baseLayers],
	controls: ol.control.defaults({attribution: false}).extend([
		mapConfig.controls.fullscreen, mapConfig.controls.scaleline, mapConfig.controls.mousePositionControl
		]),
	view : view
});

/* request data from geoserver*/

var result;
$('#parseXML').click(function (){
	//get and parse XML from WMSCapabilities
	var parser = new ol.format.WMSCapabilities();
	$.ajax({
			url: 'data.xml',
			//url: geoserverURL + '?SERVICE=WMS&VERSION=1.3.0&REQUEST=getCapabilities&FORMAT=image%2Fpng&TRANSPARENT=true&layers=netCDFtesting%3AdevWDIR&bbox=-83.807%2C36.433%2C-74.91299999999998%2C39.82899999999999&width=768&height=330&format=image%2Fpng&crs=EPSG%3A4326&time=2015-08-24T00%3A00%3A00.000Z&CRS=EPSG%3A3857&STYLES=&WIDTH=1601&HEIGHT=751&BBOX=-10702406.952377237%2C3667754.3652358977%2C-6786385.119271088%2C5504689.028985254',
			//method: 'GET',
			//dataType: 'XML',
			//crossDomain: 'true',
			success:function(){
				console.log('Get XML successfully');
			},
			error: function() {//TODO: generic Ajax error handling
				$('#xmllog').val('Get XML failed');
			} 
	}).then(function(response) {
		result = parser.read(response);
		$('#xmllog').val(window.JSON.stringify(result, null, 2));
		console.log(result);
	});
});

//Parse time-stamps
var timeList = [];
$('#parseTime').click(function (){
	//temporary solution: hard-coded path of netcdf layer
	
	var tDim = result.Capability.Layer.Layer[1].Dimension[0].values.split(',');
	//console.log(tDim);
	$.each(tDim, function(i, v) {
		timeList.push(v.split('/').shift()); //keep the start time only
		//console.log(v.split('/').shift());
	});
	$('#timelist').val(window.JSON.stringify(tDim, null, 2));
	
});

$('#buildSelect').click(function (){
	var option = '';
	$.each(timeList, function(i,v){
		option += '<option value="' + v + '">' + v + '</option>';
	});
	$('#timeSelection').html('');
	$('#timeSelection').append(option);
});

//a layer group to write in
var netcdfLayers = new ol.layer.Group({
	title: 'netcdf layer group',
}); 
var selectedTime;
function createNetcdfLayers (){

	console.log($('#loading'));
	var li = '';
	//get value from multiple selection
	selectedTime = $('#timeSelection').val();
	if (selectedTime) {
		var option = '<option> == Selected netCDF Layer == </option>';
		var layers = [];
		//var li = '';
		$.each(selectedTime, function(key, time){
			//display a layer list
			option += '<option id='+ key +' value="' + time + '">netCDF Layer ' + key + ' (' + time + ')</option>';
			li += '<li><label class="checkbox" for="visible' + key + '"><fieldset id="layer' + key + '"><input id="visible' + key + '" class="visible" type="checkbox" checked="false"/><span>netCDF Layer ' + key + ' (' + time + ')</span></fieldset></label></li>';
			//create layer iteratively from selected time
			var layer = new ol.layer.Image({
				title: time, //TODO: display title on map
				visible: true, //set layer visible rather than hidden to cache the images for slider play 
				source: new ol.source.ImageWMS({
					 url: geoserverURL,
					 params: {
						layers: netcdfLayerName,
						crossOrigin: 'anonymous',

						/**
						* TODO: use draw interaction to define bbox, width, height
						* How about save image locally. Maybe for generating a gif/movie in future?  
						*/
						'bbox': '-83.807,36.433,-74.91299999999998,39.82899999999999', 
						width: '768',
						height: '330',
						format: 'image/png',
						crs: 'EPSG:4326',
						time: time
					}
				})
			});
			//add layer to group layer iteratively 
			layers.push(layer);
			
		});
		console.log('selectedTime', selectedTime);
		$("#map-title").html("Start: " + selectedTime[0] + "</br> End:  " + selectedTime[selectedTime.length - 1]);
		$('#layerlist').html(li);
		//buildSlider(selectedTime);

		/*
		title.setElement(time);
		title.setPosition('80, 10');
		title.setPositioning('top-left');
		*/
		$('#selectionlist').html(option);
		//console.log("layers:", layers);
	} else {
		$('#layerlist').append('No layer is selected');
	}
	
	try {//swallow an Error: addEventListener and attachEvent are unavailable
			netcdfLayers.setLayers(layers);
	} catch (e) {
		console.log(e.name + ": " + e.message);  
	};
}

$('#createLayers').click(createNetcdfLayers);

$('#addLayers').click(function(){
	//TODO: display busy status when loading image layers
	//$('#loading').show();
	$('.VisPanel').show();
	//createNetcdfLayers;
	map.addLayer(netcdfLayers);

	map.getLayers().forEach(function(layer){
		if (layer instanceof ol.layer.Group){
			//allow tweak additional visual effects (opacity, hue, contrast, etc) on layer group
			toggleVis(layer);
			layer.getLayers().forEach(function(sublayer, i){
				//create a slider from selected time, and bind slide pip to time-stamp
				buildSlider(selectedTime, sublayer, i);
			});
		}
	});
});


/* Initiate range slider */

function buildSlider(labels, layer, layerid){
	$("#time-slider")
	.slider({
		min: 0,
		max: labels.length - 1,
		value: 0
	})
	.slider("pips", {
		rest: "pip",
		first:'label',
		last:'label',
		pips: labels
	})
	.slider("float", {
		labels: labels
	})
	.on("slide", function(event, ui) {
		//console.log(ui, ui.value);
		//console.log(this);
		if(ui.value == layerid) {
			layer.setVisible(true);
		} else {
			layer.setVisible(false);
		}
		$('#currentTime').html('Current:' + labels[ui.value])
		map.renderSync(); //force an immediate render in a synchronous manner
		//console.log(layer, layerid);
	});
}

$('#startSlider').click(function(){
	if(selectedTime){
		$(".slider").start();
		console.log('start clicked');
	} else {
		//$('#layerlist').html('No layer is selected');
	}
});

function toggleVis(layer) {
	$.each(['opacity', 'hue', 'saturation', 'contrast', 'brightness'],
	//$.each(['opacity'],
			function(i, v) {
				var input = $('#layerVisPanel input.' + v);
				input.on('input change', function() {
					layer.set(v, parseFloat(this.value));
					map.renderSync(); 
				});
				input.val(String(layer.get(v)));
			}
	);
}

$('layerliste li > span').click(function() {
	$(this).siblings('fieldset').toggle();
}).siblings('fieldset').show();

//Clear outputs
$('.clear').click(function(){
	var clearContent = $(this).parent().parent().find('.output'); //get the closest input field
	clearContent.html('').val('').focus();
});

