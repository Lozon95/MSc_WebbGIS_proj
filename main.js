// Creator: Loa Andersson and Yuzhu Wang
// Date: 2024-10-21
// For: WebGIS project in course NGEN26 Lund University


// ##########################################
// ############ Swipe function ##############
// ##########################################
import ImageTile from 'ol/source/ImageTile.js';
import Map from 'ol/Map.js';
import OSM from 'ol/source/OSM.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import TileArcGISRest from 'ol/source/TileArcGISRest.js'
import {transformExtent, fromLonLat} from 'ol/proj.js';
import {getRenderPixel} from 'ol/render.js';
import TileWMS from 'ol/source/TileWMS.js'
import XYZ from 'ol/source/XYZ.js'
// ##########################################
// ############ Create features #############
// ##########################################
import Draw from 'ol/interaction/Draw.js';
import {Vector as VectorSource} from 'ol/source.js';
import {Vector as VectorLayer} from 'ol/layer.js';
import Overlay from 'ol/Overlay.js';
import {toLonLat} from 'ol/proj.js';
import {toStringHDMS} from 'ol/coordinate.js';
import {Circle as CircleStyle, Fill, Style} from 'ol/style.js';
//###########################################
//###########################################
//###########################################

// Create extent to be used on all layers
const extent = transformExtent(
  // Cover slightly more than Lunds Kommun
  [13.051695, 55.50000, 13.953790, 55.803461],
  'EPSG:4326', //Arcgis layers is in WGS84
  'EPSG:3857' //OpenLayers apperantly uses Web mercator
);

// Layer for Terrain Base Map
const osm = new TileLayer({
  source: new OSM()
});

// Layer for Satelite base Map
const aerial = new TileLayer({
  source: new XYZ({
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  })
});

// Layer for Key Biotopes
const wmsSource = new TileWMS({
  url: 'https://geoserver.gis.lu.se/geoserver/wms?',
  params: {'LAYERS': 'KeyBiotopes',
    'STYLES': 'Loa_Yuzhu_TUVA',
    'BBOX': '13.14154028827214,55.54153538654792,13.613275425152862,55.79131441499021',
    'WIDTH': "512", 'HEIGHT': '358',
    'TILED': true},
  serverType: 'geoserver',
  crossOrigin: 'anonymous',
});

const TUVA = new TileLayer({
  source: wmsSource,
});

//################################################
//################ Create features ###############
//!!!Drawn vectors neds to be initalized on the map, 
// therefore neded in the layer list before the view
// function is executed in the map const
//!!! 
const sourcee = new VectorSource();
const vector = new VectorLayer({
  source: sourcee,
});
//################ Create features ###############
//################################################


// Create map
const map = new Map({
  // Puting vector before TUVA so polygons wont cover labels on map
  layers: [aerial, osm, vector, TUVA],
  target: 'map',
  // Create default for user geographic view whenever WebGIS is opened
  view: new View({
      // Center the map over Dalby (approximently center of munipilacity)
      center: fromLonLat([13.356374, 55.680635]),
      // Zoom is needed for map rendering
      zoom: 12,
      // Set extent to the square covering Lunds Kommun
      extent: extent
  }),
});

// ######################################################################################################
// ########################################### Create Swiper ##########################################
// ######################################################################################################
// Retrieve element from HTML
const swipe = document.getElementById('swipe');
// Event handler
osm.on('prerender', function (event) {
  // retrieves drawing from eventobject
  const ctx = event.context;
  // Retrieves size of the background map
  const mapSize = map.getSize();
  // Calculate the width of the swiper 
  const width = mapSize[0] * (swipe.value / 100);
  // Calculates topp(t) and bottom(b) coordinates
  const tl = getRenderPixel(event, [width, 0]);
  const tr = getRenderPixel(event, [mapSize[0], 0]);
  const bl = getRenderPixel(event, [width, mapSize[1]]);
  const br = getRenderPixel(event, mapSize);
  // Saves the current rendering and begins a new
  ctx.save();
  ctx.beginPath();
  // Draws the coordinate view 
  ctx.moveTo(tl[0], tl[1]);
  ctx.lineTo(bl[0], bl[1]);
  ctx.lineTo(br[0], br[1]);
  ctx.lineTo(tr[0], tr[1]);
  // Clips the map to the extent drawn
  ctx.closePath();
  ctx.clip();
});
// Event handler 
osm.on('postrender', function (event) {
  // Retrieves the clipped extent from the event object
  const ctx = event.context;
  ctx.restore();
});
// Listens for swipe change by user 
swipe.addEventListener('input', function () {
  // Render new extent
  map.render();
});


// ######################################################################################################
// ########################################### Create observations ##########################################
// ######################################################################################################

// #########################
// ###### Add Lables #######
// #########################
function addlabel() {
  // Rightclick to add label
  map.on('contextmenu', function (evt) {
    // Make sure menu will not display
    evt.preventDefault();
    // Retrieve coordinates for the click
    const coordinate = evt.coordinate;
    // Create a popup element
    const container = document.createElement('div');
    container.className = 'popup';
    const content = document.createElement('div');
    content.className = 'popup-content';
    container.appendChild(content);
    // Add user input as content to popup
    const userInput = prompt("New observation? Name it and press OK. To add a triangular marker without label text, just press OK:");
    content.innerHTML = userInput;
    // Create a new overlay
    const overlay = new Overlay({
      element: container,
      position: coordinate,
      positioning: 'bottom-center',
      autoPan: {
        animation: {
          duration: 250,
        },
      },
    });
    // Add the overlay to the map
    map.addOverlay(overlay);
  });
}
// Run the function
addlabel();

// #########################
// ##### Draw feature ######
// #########################
// Retrieves elemnt id from HTML
const typeSelect = document.getElementById('type');
// Creates global variable so it can be removed
let draw; 
// Add the interaction
function addInteraction() {
  const value = typeSelect.value;
  // If Feat is choosen, the user can only add lables or triangular shapes
  if (value !== 'Feat') {
      draw = new Draw({
          // Set source to the vector layer 
          source: sourcee,
          type: typeSelect.value, 
      });
      map.addInteraction(draw);
  }   
}
// When feature type is changed, a new vector layer is created
typeSelect.onchange = function () {
  map.removeInteraction(draw);
  addInteraction();
};
// Undo vertex when drawing
document.getElementById('undo').addEventListener('click', function () {
  draw.removeLastPoint();
});
// Call the geometry drawing function
addInteraction();


// ######################################################################################################
// ################################# Display feature info ###############################################
// ######################################################################################################

// Display nformation when clicking on question symbol
const Qimage = document.getElementById("questions");
Qimage.addEventListener("click", function(event){
alert(`The red polygons on the map are areas of higher nature 
value where you can expect to see higher biodiversity and more 
rare species. The polygons are inventoried by the Swedish Board 
of Agriculture and the Swedish Forest Agency. You can use the 
cursor to click on the polygons and display the attribut table of
the feature. In the attributetable you can copy the Name of the 
nature type and search on it on google to find more information. 

Happy specie hunting!

// The developers`)
});


// Display feature infor
const view = map.getView()
map.on('singleclick', function (evt) {
  document.getElementById('info').innerHTML = '';
  // Create GetFeatureInfo request
  const viewResolution = /** @type {number} */ (view.getResolution());
  const url = wmsSource.getFeatureInfoUrl(
    evt.coordinate,
    viewResolution,
    // As for extent box, OpenLayers use web mercator
    'EPSG:3857',
    {'INFO_FORMAT': 'text/html'},
  );
  // I dont understand this code snipet, copied from OpenLayers and is working
  if (url) {
    fetch(url)
      .then((response) => response.text())
      .then((html) => {
        document.getElementById('info').innerHTML = html;
      });
  }
});

// Change cursor to a pointer hand when moved over clickable feature
map.on('pointermove', function (evt) {
  // If user is paning, abort
  if (evt.dragging) {
    return;
  }
  // Retrieve data at pixel
  const data = TUVA.getData(evt.pixel);
  // Make sure the pixel has data (pixelvalue above 0)
  const hit = data && data[3] > 0; 
  // If pixel has data, change to pointer
  map.getTargetElement().style.cursor = hit ? 'pointer' : '';
});



// ######################################################################################################



