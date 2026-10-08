/* SEAT 25 50 Hz three-phase: selected 1450/2870 rpm 0.37/2.2 kW variants. Curves provisional: manual graph readings; review before engineering use. */
window.models.push(...[
  {
    "key": "SEAT-SEAT25|51252000",
    "configurationId": "SEAT 25 1450 RPM 0.37 kW 3PH",
    "display": "SEAT 25 1450 RPM 0.37 kW",
    "model": "SEAT 25 1450 RPM 0.37 kW",
    "brand": "SEAT",
    "manufacturer": "SEAT",
    "family": "SEAT 25",
    "series": "SEAT 25",
    "seriesCode": "SEAT 25",
    "productCode": "51252000",
    "fanType": "Santrifüj",
    "mountType": "Salyangoz",
    "productGroup": "Santrifüj Fan",
    "fanTypeEn": "Centrifugal",
    "mountTypeEn": "Centrifugal",
    "productGroupEn": "Centrifugal Fan",
    "categories": [
      "Centrifugal Fan"
    ],
    "tagsEn": [
      "Centrifugal Fan"
    ],
    "catalogNameEn": "SEAT 25 Centrifugal Fan",
    "nominal": 1330,
    "kw": 0.37,
    "rpm": 1450,
    "amps": 1.06,
    "amps230V": 1.85,
    "amps400V": 1.06,
    "voltage": "230/400 V",
    "frequency": "50 Hz",
    "weight": 11.3,
    "ipClass": "IP55",
    "phase": "Three Phase",
    "poles": 4,
    "pole": 4,
    "dimensions": {
      "A": 248,
      "B": 365,
      "C": 310,
      "D": 200,
      "E": 103,
      "F": 92,
      "G": 165,
      "H": 35,
      "L": 95,
      "M": 105,
      "P": 430,
      "Y": 180,
      "Y1": 160,
      "Z": 420,
      "X": 300,
      "X1": 71,
      "X2": 371
    },
    "dimensionsUnit": "mm",
    "spl": 57,
    "price": 1400,
    "priceCurrency": "EUR",
    "sourceCatalogue": "seat-25-fiche-technique-gb-03-2024-1710493913.pdf",
    "sourcePage": 2,
    "curveInterpolation": "linear",
    "curveVerification": {
      "status": "needs_engineering_review",
      "sourceCatalogue": "seat-25-fiche-technique-gb-03-2024-1710493913.pdf",
      "sourcePage": 2,
      "sourceMethod": "approximate manual digitization of printed 50 Hz AS motor curve; motor power-limited section only",
      "caution": "Graph resolution and motor-power boundary warrant independent curve verification before use for a technical offer."
    },
    "curves": [
      {
        "control": "nominal",
        "sourcePage": 2,
        "sourceMethod": "approximate manual reading of published graph, truncated to selected motor-power region",
        "interpolation": "linear",
        "sourcePoints": [
          [
            380,
            100
          ],
          [
            375,
            300
          ],
          [
            365,
            550
          ],
          [
            368,
            850
          ],
          [
            365,
            1050
          ],
          [
            351,
            1200
          ],
          [
            335,
            1350
          ],
          [
            320,
            1470
          ]
        ]
      }
    ],
    "operatingPoints": [
      {
        "control": "nominal",
        "powerW": 370,
        "powerKw": 0.37,
        "currentA": 1.06,
        "rpm": 1450,
        "maxAirflowM3h": 1470
      }
    ],
    "catalogueInfo": {
      "general": [
        "SEAT 25 centrifugal fan, AS 50 Hz three-phase motor.",
        "Fan size 25, outlet diameter 200 mm.",
        "Catalogue includes selectable left/right discharge orientations."
      ],
      "motor": [
        "Three-phase asynchronous motor, IP55, 230/400 V, 50 Hz, 0.37 kW, 1450 rpm.",
        "Rated current 1.85 A at 230 V and 1.06 A at 400 V.",
        "Weight 11.3 kg."
      ],
      "applications": [
        "Centrifugal ventilation applications according to the manufacturer's technical requirements."
      ]
    },
    "atex": false,
    "pricePending": false
  },
  {
    "key": "SEAT-SEAT25-ATEX|51252003",
    "configurationId": "SEAT 25 ATEX 1450 RPM 0.37 kW 3PH",
    "display": "SEAT 25 ATEX 1450 RPM 0.37 kW",
    "model": "SEAT 25 ATEX 1450 RPM 0.37 kW",
    "brand": "SEAT",
    "manufacturer": "SEAT",
    "family": "SEAT 25 ATEX",
    "series": "SEAT 25 ATEX",
    "seriesCode": "SEAT 25 ATEX",
    "productCode": "51252003",
    "fanType": "Santrifüj",
    "mountType": "Salyangoz",
    "productGroup": "ATEX Santrifüj Fan",
    "fanTypeEn": "Centrifugal",
    "mountTypeEn": "Centrifugal",
    "productGroupEn": "ATEX Centrifugal Fan",
    "categories": [
      "Centrifugal Fan",
      "Explosion-Proof / ATEX Fan"
    ],
    "tagsEn": [
      "Centrifugal Fan",
      "Explosion-Proof / ATEX Fan"
    ],
    "catalogNameEn": "SEAT 25 ATEX Centrifugal Fan",
    "nominal": 1330,
    "kw": 0.37,
    "rpm": 1450,
    "amps": 1.12,
    "amps230V": 1.94,
    "amps400V": 1.12,
    "voltage": "230/400 V",
    "frequency": "50 Hz",
    "weight": 12.3,
    "ipClass": "IP55",
    "phase": "Three Phase",
    "poles": 4,
    "pole": 4,
    "dimensions": {
      "A": 248,
      "B": 365,
      "C": 310,
      "D": 200,
      "E": 103,
      "F": 92,
      "G": 165,
      "H": 35,
      "L": 95,
      "M": 105,
      "P": 430,
      "Y": 180,
      "Y1": 160,
      "Z": 420,
      "X": 300,
      "X1": 71,
      "X2": 371
    },
    "dimensionsUnit": "mm",
    "spl": 57,
    "price": 1600,
    "priceCurrency": "EUR",
    "sourceCatalogue": "seat-25-fiche-technique-gb-03-2024-1710493913.pdf",
    "sourcePage": 2,
    "curveInterpolation": "linear",
    "curveVerification": {
      "status": "needs_engineering_review",
      "sourceCatalogue": "seat-25-fiche-technique-gb-03-2024-1710493913.pdf",
      "sourcePage": 2,
      "sourceMethod": "approximate manual digitization of printed 50 Hz AS motor curve; motor power-limited section only",
      "caution": "Graph resolution and motor-power boundary warrant independent curve verification before use for a technical offer."
    },
    "curves": [
      {
        "control": "nominal",
        "sourcePage": 2,
        "sourceMethod": "approximate manual reading of published graph, truncated to selected motor-power region",
        "interpolation": "linear",
        "sourcePoints": [
          [
            380,
            100
          ],
          [
            375,
            300
          ],
          [
            365,
            550
          ],
          [
            368,
            850
          ],
          [
            365,
            1050
          ],
          [
            351,
            1200
          ],
          [
            335,
            1350
          ],
          [
            320,
            1470
          ]
        ]
      }
    ],
    "operatingPoints": [
      {
        "control": "nominal",
        "powerW": 370,
        "powerKw": 0.37,
        "currentA": 1.12,
        "rpm": 1450,
        "maxAirflowM3h": 1470
      }
    ],
    "catalogueInfo": {
      "general": [
        "SEAT 25 centrifugal fan, AS 50 Hz three-phase motor.",
        "Fan size 25, outlet diameter 200 mm.",
        "Catalogue includes selectable left/right discharge orientations."
      ],
      "motor": [
        "Three-phase asynchronous motor, IP55, 230/400 V, 50 Hz, 0.37 kW, 1450 rpm.",
        "Rated current 1.94 A at 230 V and 1.12 A at 400 V.",
        "Weight 12.3 kg."
      ],
      "applications": [
        "ATEX version; verify actual Ex marking, zone and gas/dust classification from manufacturer certificate before specifying."
      ]
    },
    "atex": {
      "status": "manufacturer_ATEX_variant_marking_not_given_in_datasheet"
    },
    "safetyWarning": "ATEX marking / group / temperature class and certificates are not specified in the supplied two-page sheet. Confirm suitability with manufacturer before selection for hazardous zones.",
    "pricePending": false
  },
  {
    "key": "SEAT-SEAT25|51253000",
    "configurationId": "SEAT 25 2870 RPM 2.20 kW 3PH",
    "display": "SEAT 25 2870 RPM 2.20 kW",
    "model": "SEAT 25 2870 RPM 2.20 kW",
    "brand": "SEAT",
    "manufacturer": "SEAT",
    "family": "SEAT 25",
    "series": "SEAT 25",
    "seriesCode": "SEAT 25",
    "productCode": "51253000",
    "fanType": "Santrifüj",
    "mountType": "Salyangoz",
    "productGroup": "Santrifüj Fan",
    "fanTypeEn": "Centrifugal",
    "mountTypeEn": "Centrifugal",
    "productGroupEn": "Centrifugal Fan",
    "categories": [
      "Centrifugal Fan"
    ],
    "tagsEn": [
      "Centrifugal Fan"
    ],
    "catalogNameEn": "SEAT 25 Centrifugal Fan",
    "nominal": 1900,
    "kw": 2.2,
    "rpm": 2870,
    "amps": 4.35,
    "amps230V": 7.56,
    "amps400V": 4.35,
    "voltage": "230/400 V",
    "frequency": "50 Hz",
    "weight": 23.9,
    "ipClass": "IP55",
    "phase": "Three Phase",
    "poles": 2,
    "pole": 2,
    "dimensions": {
      "A": 248,
      "B": 365,
      "C": 310,
      "D": 200,
      "E": 103,
      "F": 92,
      "G": 165,
      "H": 35,
      "L": 95,
      "M": 105,
      "P": 515,
      "Y": 180,
      "Y1": 160,
      "Z": 420,
      "X": 300,
      "X1": 90,
      "X2": 390
    },
    "dimensionsUnit": "mm",
    "spl": 0,
    "price": 2500,
    "priceCurrency": "EUR",
    "sourceCatalogue": "seat-25-fiche-technique-gb-03-2024-1710493913.pdf",
    "sourcePage": 2,
    "curveInterpolation": "linear",
    "curveVerification": {
      "status": "needs_engineering_review",
      "sourceCatalogue": "seat-25-fiche-technique-gb-03-2024-1710493913.pdf",
      "sourcePage": 2,
      "sourceMethod": "approximate manual digitization of printed 50 Hz AS motor curve; motor power-limited section only",
      "caution": "Graph resolution and motor-power boundary warrant independent curve verification before use for a technical offer."
    },
    "curves": [
      {
        "control": "nominal",
        "sourcePage": 2,
        "sourceMethod": "approximate manual reading of published graph, truncated to selected motor-power region",
        "interpolation": "linear",
        "sourcePoints": [
          [
            1450,
            1050
          ],
          [
            1450,
            1250
          ],
          [
            1440,
            1500
          ],
          [
            1435,
            1750
          ],
          [
            1430,
            1950
          ]
        ]
      }
    ],
    "operatingPoints": [
      {
        "control": "nominal",
        "powerW": 2200,
        "powerKw": 2.2,
        "currentA": 4.35,
        "rpm": 2870,
        "maxAirflowM3h": 1950
      }
    ],
    "catalogueInfo": {
      "general": [
        "SEAT 25 centrifugal fan, AS 50 Hz three-phase motor.",
        "Fan size 25, outlet diameter 200 mm.",
        "Catalogue includes selectable left/right discharge orientations."
      ],
      "motor": [
        "Three-phase asynchronous motor, IP55, 230/400 V, 50 Hz, 2.2 kW, 2870 rpm.",
        "Rated current 7.56 A at 230 V and 4.35 A at 400 V.",
        "Weight 23.9 kg."
      ],
      "applications": [
        "Centrifugal ventilation applications according to the manufacturer's technical requirements."
      ]
    },
    "atex": false,
    "pricePending": false
  },
  {
    "key": "SEAT-SEAT25-ATEX|51253003",
    "configurationId": "SEAT 25 ATEX 2870 RPM 2.20 kW 3PH",
    "display": "SEAT 25 ATEX 2870 RPM 2.20 kW",
    "model": "SEAT 25 ATEX 2870 RPM 2.20 kW",
    "brand": "SEAT",
    "manufacturer": "SEAT",
    "family": "SEAT 25 ATEX",
    "series": "SEAT 25 ATEX",
    "seriesCode": "SEAT 25 ATEX",
    "productCode": "51253003",
    "fanType": "Santrifüj",
    "mountType": "Salyangoz",
    "productGroup": "ATEX Santrifüj Fan",
    "fanTypeEn": "Centrifugal",
    "mountTypeEn": "Centrifugal",
    "productGroupEn": "ATEX Centrifugal Fan",
    "categories": [
      "Centrifugal Fan",
      "Explosion-Proof / ATEX Fan"
    ],
    "tagsEn": [
      "Centrifugal Fan",
      "Explosion-Proof / ATEX Fan"
    ],
    "catalogNameEn": "SEAT 25 ATEX Centrifugal Fan",
    "nominal": 1900,
    "kw": 2.2,
    "rpm": 2870,
    "amps": 5,
    "amps230V": 8.7,
    "amps400V": 5,
    "voltage": "230/400 V",
    "frequency": "50 Hz",
    "weight": 20.9,
    "ipClass": "IP55",
    "phase": "Three Phase",
    "poles": 2,
    "pole": 2,
    "dimensions": {
      "A": 248,
      "B": 365,
      "C": 310,
      "D": 200,
      "E": 103,
      "F": 92,
      "G": 165,
      "H": 35,
      "L": 95,
      "M": 105,
      "P": 515,
      "Y": 180,
      "Y1": 160,
      "Z": 420,
      "X": 300,
      "X1": 90,
      "X2": 390
    },
    "dimensionsUnit": "mm",
    "spl": 0,
    "price": 2750,
    "priceCurrency": "EUR",
    "sourceCatalogue": "seat-25-fiche-technique-gb-03-2024-1710493913.pdf",
    "sourcePage": 2,
    "curveInterpolation": "linear",
    "curveVerification": {
      "status": "needs_engineering_review",
      "sourceCatalogue": "seat-25-fiche-technique-gb-03-2024-1710493913.pdf",
      "sourcePage": 2,
      "sourceMethod": "approximate manual digitization of printed 50 Hz AS motor curve; motor power-limited section only",
      "caution": "Graph resolution and motor-power boundary warrant independent curve verification before use for a technical offer."
    },
    "curves": [
      {
        "control": "nominal",
        "sourcePage": 2,
        "sourceMethod": "approximate manual reading of published graph, truncated to selected motor-power region",
        "interpolation": "linear",
        "sourcePoints": [
          [
            1450,
            1050
          ],
          [
            1450,
            1250
          ],
          [
            1440,
            1500
          ],
          [
            1435,
            1750
          ],
          [
            1430,
            1950
          ]
        ]
      }
    ],
    "operatingPoints": [
      {
        "control": "nominal",
        "powerW": 2200,
        "powerKw": 2.2,
        "currentA": 5,
        "rpm": 2870,
        "maxAirflowM3h": 1950
      }
    ],
    "catalogueInfo": {
      "general": [
        "SEAT 25 centrifugal fan, AS 50 Hz three-phase motor.",
        "Fan size 25, outlet diameter 200 mm.",
        "Catalogue includes selectable left/right discharge orientations."
      ],
      "motor": [
        "Three-phase asynchronous motor, IP55, 230/400 V, 50 Hz, 2.2 kW, 2870 rpm.",
        "Rated current 8.7 A at 230 V and 5 A at 400 V.",
        "Weight 20.9 kg."
      ],
      "applications": [
        "ATEX version; verify actual Ex marking, zone and gas/dust classification from manufacturer certificate before specifying."
      ]
    },
    "atex": {
      "status": "manufacturer_ATEX_variant_marking_not_given_in_datasheet"
    },
    "safetyWarning": "ATEX marking / group / temperature class and certificates are not specified in the supplied two-page sheet. Confirm suitability with manufacturer before selection for hazardous zones.",
    "pricePending": false
  }
]);
