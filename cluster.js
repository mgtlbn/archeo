const GEOSERVER_URL = "https://geobretagne.fr/geoserver";
const WORKSPACE = "drac";
const LAYER_URL = `${GEOSERVER_URL}/${WORKSPACE}/wfs?service=WFS&version=1.0.0&request=GetFeature&typeNames=drac:site&outputFormat=application/json&srsName=EPSG:4326&maxFeatures=5000`;
const LAYER_ID = "site_cluster";

// Couleurs par période archéologique
const PERIOD_COLORS = {
  'Paléolithique': '#26dea7',
  'Mésolithique': '#f2b818',
  'Néolithique': '#6eb220',
  'Age du Bronze': '#716767',
  'Age du Fer': '#827be1',
  'Antiquité': '#f21119',
  'Moyen-âge': '#e14897',
  'Période récente': '#b1eefc',
  'Epoque indéterminée': '#f38c3c'
};

// Style pour un point individuel
const uniqueStyle = function(feature) {
  const features = feature.get('features');
  const singleFeature = features && features.length === 1 ? features[0] : feature;
  const periode = singleFeature.get('DEBUT');
  const color = PERIOD_COLORS[periode] || '#888888';
  
  return [
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: 8,
        fill: new ol.style.Fill({
          color: color,
        }),
        stroke: new ol.style.Stroke({
          color: '#ffffff',
          width: 1,
        }),
      }),
    }),
  ];
};

// Style pour les clusters
const clusterStyle = function (feature) {
  var size = feature.get("features").length;
  var max_radius = 40;
  var max_value = 500;
  var radius = 12 + Math.sqrt(size) * (max_radius / Math.sqrt(max_value));
  var radius2 = (radius * 75) / 100;
  
  if (size == 1) {
    return uniqueStyle(feature);
  } else {
    return manyStyle(radius, radius2, size);
  }
};

// Style pour plusieurs points regroupés
const manyStyle = function (radius, radius2, size) {
  // Couleur selon la taille du cluster
  let clusterColor = '#ff9500';
  if (size >= 100) clusterColor = '#d73027';
  else if (size >= 50) clusterColor = '#f46d43';
  else if (size >= 20) clusterColor = '#fdae61';
  else if (size >= 10) clusterColor = '#fee08b';
  else clusterColor = '#e6f598';
  
  return [
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: radius,
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.8)',
        }),
        stroke: new ol.style.Stroke({
          color: clusterColor,
          width: 3,
        }),
      }),
    }),
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: radius2,
        fill: new ol.style.Fill({
          color: clusterColor,
        }),
      }),
      text: new ol.style.Text({
        font: "bold 12px Arial",
        text: size.toString(),
        fill: new ol.style.Fill({
          color: "#ffffff",
        }),
        stroke: new ol.style.Stroke({
          color: "#000000",
          width: 1,
        }),
      }),
    }),
  ];
};

// Création de la légende
const legend = {
  items: [
    { styles: uniqueStyle(), label: "Site archéologique", geometry: "Point" },
    { styles: manyStyle(20, 15, 7), label: "Groupe de sites", geometry: "Point" },
  ],
};

// Création de la couche avec clustering
let layer = new ol.layer.Vector({
  source: new ol.source.Cluster({
    distance: 50, // Distance de regroupement en pixels
    source: new ol.source.Vector({
      url: LAYER_URL,
      format: new ol.format.GeoJSON(),
    }),
  }),
  style: clusterStyle,
});

// Gestion des clics sur les clusters
const handle = function (clusters, views) {
  if (clusters.length > 0) {
    var l = mviewer.getLayer(LAYER_ID);
    var elements = [];
    var html;
    var panel = "";
    
    clusters.forEach((c) => {
      // Récupération des features pour le template
      if (c?.properties) {
        // Version mviewer < 3.5
        elements = elements.concat(
          c.properties.features.map((d) => ({
            properties: d.getProperties(),
          }))
        );
      } else {
        // Version mviewer >= 3.5
        elements = elements.concat(c?.getProperties()?.features || c.properties.features);
      }
    });
    
    // Création du HTML pour l'affichage des informations
    if (l.template) {
      html = info.templateHTMLContent(elements, l);
    } else {
      html = info.formatHTMLContent(elements, l);
    }
    
    // Choix du panneau selon mobile/desktop
    if (configuration.getConfiguration().mobile) {
      panel = "modal-panel";
    } else {
      panel = "right-panel";
    }
    
    var view = views[panel];
    view.layers.push({
      id: view.layers.length + 1,
      firstlayer: true,
      manyfeatures: elements.length > 1,
      nbfeatures: elements.length,
      name: l.name,
      layerid: LAYER_ID,
      theme_icon: l.icon,
      html: html,
    });
  }
};

// Création du CustomLayer
new CustomLayer(LAYER_ID, layer, legend, handle);