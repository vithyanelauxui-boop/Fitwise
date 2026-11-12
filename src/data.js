/* Illustrative catalogue. Brand names are used for realism; prices, part numbers and dealers are invented.
   Photos: Unsplash (Unsplash License) and Wikimedia Commons (CC BY / CC BY-SA, credited in the case study). */
const C = n => `assets/cut/${n}.avif`, PH = n => `assets/photo/${n}.jpg`;

/* Brand mark: a 4-fold pinwheel, hand-traced (4-fold symmetric Catmull-Rom path, pure JS/Python,
   no external vector tool) from the client's reference image. Filled with the same radial red
   the buttons use (--cta's colour stops) via #logoGrad, defined once in shell.html. */
const LOGO_D = "M 84.36 19.01 C 84.36 19.01 85.77 19.09 85.77 19.09 C 85.77 19.09 85.77 18.62 86.75 19.87 C 87.73 21.12 90.24 24.13 91.67 26.60 C 93.11 29.07 94.62 32.87 95.38 34.67 C 96.13 36.47 96.09 36.68 96.20 37.40 C 96.31 38.11 96.04 38.98 96.04 38.98 C 96.04 38.98 95.82 39.44 95.08 39.88 C 94.33 40.31 94.88 40.27 91.57 41.59 C 88.27 42.90 78.17 46.54 75.24 47.76 C 72.32 48.98 74.02 48.92 74.02 48.92 C 74.02 48.92 73.77 50.60 73.77 50.60 C 73.77 50.60 74.08 51.48 74.58 51.91 C 75.09 52.35 73.94 52.02 76.80 53.21 C 79.66 54.40 88.56 57.70 91.76 59.04 C 94.96 60.39 96.02 61.29 96.02 61.29 C 96.02 61.29 96.49 61.65 96.30 62.61 C 96.10 63.56 95.75 65.10 94.85 67.03 C 93.94 68.96 92.37 71.99 90.87 74.21 C 89.37 76.43 85.82 80.35 85.82 80.35 C 85.82 80.35 84.33 80.72 84.33 80.72 C 84.33 80.72 85.18 81.92 83.44 80.29 C 81.71 78.66 76.45 73.61 73.91 70.96 C 71.37 68.31 69.72 66.50 68.20 64.41 C 66.67 62.33 65.62 60.40 64.78 58.45 C 63.94 56.51 63.43 54.40 63.13 52.74 C 62.83 51.08 62.94 49.72 63.00 48.51 C 63.06 47.31 63.24 46.55 63.49 45.51 C 63.75 44.46 64.00 43.46 64.52 42.24 C 65.03 41.01 65.26 40.04 66.59 38.16 C 67.92 36.28 69.54 34.15 72.50 30.95 C 75.47 27.76 84.36 19.01 84.36 19.01 Z M 80.99 84.36 C 80.99 84.36 80.91 85.77 80.91 85.77 C 80.91 85.77 81.38 85.77 80.13 86.75 C 78.88 87.73 75.87 90.24 73.40 91.67 C 70.93 93.11 67.13 94.62 65.33 95.38 C 63.53 96.13 63.32 96.09 62.60 96.20 C 61.89 96.31 61.02 96.04 61.02 96.04 C 61.02 96.04 60.56 95.82 60.12 95.08 C 59.69 94.33 59.73 94.88 58.41 91.57 C 57.10 88.27 53.46 78.17 52.24 75.24 C 51.02 72.32 51.08 74.02 51.08 74.02 C 51.08 74.02 49.40 73.77 49.40 73.77 C 49.40 73.77 48.52 74.08 48.09 74.58 C 47.65 75.09 47.98 73.94 46.79 76.80 C 45.60 79.66 42.30 88.56 40.96 91.76 C 39.61 94.96 38.71 96.02 38.71 96.02 C 38.71 96.02 38.35 96.49 37.39 96.30 C 36.44 96.10 34.90 95.75 32.97 94.85 C 31.04 93.94 28.01 92.37 25.79 90.87 C 23.57 89.37 19.65 85.82 19.65 85.82 C 19.65 85.82 19.28 84.33 19.28 84.33 C 19.28 84.33 18.08 85.18 19.71 83.44 C 21.34 81.71 26.39 76.45 29.04 73.91 C 31.69 71.37 33.50 69.72 35.59 68.20 C 37.67 66.67 39.60 65.62 41.55 64.78 C 43.49 63.94 45.60 63.43 47.26 63.13 C 48.92 62.83 50.28 62.94 51.49 63.00 C 52.69 63.06 53.45 63.24 54.49 63.49 C 55.54 63.75 56.54 64.00 57.76 64.52 C 58.99 65.03 59.96 65.26 61.84 66.59 C 63.72 67.92 65.85 69.54 69.05 72.50 C 72.24 75.47 80.99 84.36 80.99 84.36 Z M 15.64 80.99 C 15.64 80.99 14.23 80.91 14.23 80.91 C 14.23 80.91 14.23 81.38 13.25 80.13 C 12.27 78.88 9.76 75.87 8.33 73.40 C 6.89 70.93 5.38 67.13 4.62 65.33 C 3.87 63.53 3.91 63.32 3.80 62.60 C 3.69 61.89 3.96 61.02 3.96 61.02 C 3.96 61.02 4.18 60.56 4.92 60.12 C 5.67 59.69 5.12 59.73 8.43 58.41 C 11.73 57.10 21.83 53.46 24.76 52.24 C 27.68 51.02 25.98 51.08 25.98 51.08 C 25.98 51.08 26.23 49.40 26.23 49.40 C 26.23 49.40 25.92 48.52 25.42 48.09 C 24.91 47.65 26.06 47.98 23.20 46.79 C 20.34 45.60 11.44 42.30 8.24 40.96 C 5.04 39.61 3.98 38.71 3.98 38.71 C 3.98 38.71 3.51 38.35 3.70 37.39 C 3.90 36.44 4.25 34.90 5.15 32.97 C 6.06 31.04 7.63 28.01 9.13 25.79 C 10.63 23.57 14.18 19.65 14.18 19.65 C 14.18 19.65 15.67 19.28 15.67 19.28 C 15.67 19.28 14.82 18.08 16.56 19.71 C 18.29 21.34 23.55 26.39 26.09 29.04 C 28.63 31.69 30.28 33.50 31.80 35.59 C 33.33 37.67 34.38 39.60 35.22 41.55 C 36.06 43.49 36.57 45.60 36.87 47.26 C 37.17 48.92 37.06 50.28 37.00 51.49 C 36.94 52.69 36.76 53.45 36.51 54.49 C 36.25 55.54 36.00 56.54 35.48 57.76 C 34.97 58.99 34.74 59.96 33.41 61.84 C 32.08 63.72 30.46 65.85 27.50 69.05 C 24.53 72.24 15.64 80.99 15.64 80.99 Z M 19.01 15.64 C 19.01 15.64 19.09 14.23 19.09 14.23 C 19.09 14.23 18.62 14.23 19.87 13.25 C 21.12 12.27 24.13 9.76 26.60 8.33 C 29.07 6.89 32.87 5.38 34.67 4.62 C 36.47 3.87 36.68 3.91 37.40 3.80 C 38.11 3.69 38.98 3.96 38.98 3.96 C 38.98 3.96 39.44 4.18 39.88 4.92 C 40.31 5.67 40.27 5.12 41.59 8.43 C 42.90 11.73 46.54 21.83 47.76 24.76 C 48.98 27.68 48.92 25.98 48.92 25.98 C 48.92 25.98 50.60 26.23 50.60 26.23 C 50.60 26.23 51.48 25.92 51.91 25.42 C 52.35 24.91 52.02 26.06 53.21 23.20 C 54.40 20.34 57.70 11.44 59.04 8.24 C 60.39 5.04 61.29 3.98 61.29 3.98 C 61.29 3.98 61.65 3.51 62.61 3.70 C 63.56 3.90 65.10 4.25 67.03 5.15 C 68.96 6.06 71.99 7.63 74.21 9.13 C 76.43 10.63 80.35 14.18 80.35 14.18 C 80.35 14.18 80.72 15.67 80.72 15.67 C 80.72 15.67 81.92 14.82 80.29 16.56 C 78.66 18.29 73.61 23.55 70.96 26.09 C 68.31 28.63 66.50 30.28 64.41 31.80 C 62.33 33.33 60.40 34.38 58.45 35.22 C 56.51 36.06 54.40 36.57 52.74 36.87 C 51.08 37.17 49.72 37.06 48.51 37.00 C 47.31 36.94 46.55 36.76 45.51 36.51 C 44.46 36.25 43.46 36.00 42.24 35.48 C 41.01 34.97 40.04 34.74 38.16 33.41 C 36.28 32.08 34.15 30.46 30.95 27.50 C 27.76 24.53 19.01 15.64 19.01 15.64 Z";

const VEHICLES = {
  creta:{id:'creta',type:'car',name:'Hyundai Creta',short:'Creta',variant:'SX 1.5 CRDi',fuel:'Diesel',year:2024,plate:'TN 09 BX 4821',trans:'Manual',odo:'41,200 km',img:'assets/cut/creta-official.avif',spin:36},
  m575:{id:'m575',type:'tractor',name:'Mahindra 575 DI',short:'575 DI',variant:'XP Plus',fuel:'Diesel',year:2021,plate:'TN 41 AK 2207',trans:'8F + 2R',odo:'2,340 hrs',img:C('m575-official')},
  signa:{id:'signa',type:'truck',name:'Tata Signa 4825.TK',short:'Signa',variant:'Tipper 10x4',fuel:'Diesel',year:2022,plate:'TN 37 DM 6614',trans:'9-speed',odo:'1,84,000 km',img:C('excon-truck')},
  jcb:{id:'jcb',type:'excavator',name:'JCB 30 Plus',short:'30 Plus',variant:'Mini excavator',fuel:'Diesel',year:2020,plate:'Asset CBE-07',trans:'Hydrostatic',odo:'3,910 hrs',img:C('jcb30-official')}
};
const GARAGE = ['creta','m575','signa','jcb'];

const PRODUCTS = [
  /* brake discs (Creta front) */
  {id:'d1',cat:'brakes',wheel:16,brand:'Bosch',name:'Front Brake Disc Rotor, Ventilated (Pair)',tier:'OES',style:'Plain',position:'Front',price:4650,mrp:5400,rating:4.7,reviews:842,fits:['creta'],dealers:3,eta:'Today',pn:'0 986 479 C91',oe:'51712-C9000',img:C('rotor-plain'),best:true,warranty:'12 months'},
  {id:'d2',cat:'brakes',wheel:16,brand:'Hyundai Mobis',name:'Genuine Front Brake Disc (Pair)',tier:'OE Genuine',style:'Plain',position:'Front',price:5980,mrp:6200,rating:4.8,reviews:311,fits:['creta'],dealers:4,eta:'Today',pn:'51712-C9000',oe:'51712-C9000',img:C('rotor-solid'),warranty:'12 months'},
  {id:'d3',cat:'brakes',wheel:16,brand:'Brembo',name:'Max Slotted Front Brake Disc (Pair)',tier:'Premium',style:'Slotted',position:'Front',price:6450,mrp:7300,rating:4.7,reviews:126,fits:['creta'],dealers:1,eta:'Today',pn:'09.C932.75',oe:'51712-C9000',img:C('rotor-sslot'),warranty:'24 months'},
  {id:'d4',cat:'brakes',wheel:16,brand:'Brembo',name:'Xtra Cross-Drilled Front Brake Disc (Pair)',tier:'Premium',style:'Drilled',position:'Front',price:7200,mrp:8100,rating:4.6,reviews:88,fits:['creta'],dealers:1,eta:'Tomorrow',pn:'09.C932.1X',oe:'51712-C9000',img:C('rotor-sdrill'),warranty:'24 months'},
  {id:'d5',cat:'brakes',wheel:16,brand:'TVS Girling',name:'Front Brake Disc, Ventilated (Pair)',tier:'OES',style:'Plain',position:'Front',price:3890,mrp:4500,rating:4.5,reviews:604,fits:['creta'],dealers:5,eta:'Today',pn:'TG-BD-2271',oe:'51712-C9000',img:C('rotor-cslot'),warranty:'12 months'},
  {id:'d6',cat:'brakes',wheel:16,brand:'Vrom Select',name:'Drilled & Slotted Front Disc (Pair)',tier:'Value',style:'Drilled & slotted',position:'Front',price:3490,mrp:4600,rating:4.3,reviews:1204,fits:['creta'],dealers:6,eta:'Today',pn:'FW-BD-C9-DS',oe:'51712-C9000',img:C('rotor-dsl'),warranty:'6 months'},
  {id:'d7',cat:'brakes',wheel:16,brand:'Rane',name:'Sport Cross-Drilled Front Disc (Pair)',tier:'OES',style:'Drilled',position:'Front',price:4100,mrp:4800,rating:4.4,reviews:240,fits:['creta'],dealers:2,eta:'Today',pn:'RBL-BD-5512',oe:'51712-C9000',img:C('rotor-cdrill'),warranty:'12 months'},
  {id:'d8',cat:'brakes',wheel:17,brand:'Valeo',name:'Curved Drilled & Slotted Disc, 17-inch (Pair)',tier:'Premium',style:'Drilled & slotted',position:'Front',price:5600,mrp:6300,rating:4.5,reviews:64,fits:[],variant:['creta'],variantNote:'Only for Creta builds on 17-inch wheels (SX automatic, SX(O)). Check yours first',dealers:1,eta:'Tomorrow',pn:'VL-197332',oe:'51712-C9100',img:C('rotor-cdsl'),warranty:'12 months'},
  {id:'d9',cat:'brakes',brand:'Brembo',name:'Front Brake Disc for Verna 1.5 (Pair)',tier:'Premium',style:'Plain',position:'Front',price:5200,mrp:5900,rating:4.6,reviews:73,fits:[],dealers:1,eta:'Tomorrow',pn:'09.D112.11',oe:'51712-H5000',img:C('rotor-plain'),warranty:'24 months'},
  /* tyres */
  {id:'t1',cat:'tyres',wheel:16,brand:'MRF',name:'Wanderer Street 205/65 R16 95H',tier:'Premium',size:'205/65 R16',use:'City + highway',speed:'H · 210 km/h',load:'95 (690 kg)',cons:'Tubeless radial',press:'33 psi front and rear',tread:'8.2 mm',price:7790,mrp:8500,rating:4.6,reviews:842,fits:['creta'],dealers:5,eta:'Today',pn:'MRF-WS-2056516',img:C('tyre-stack'),best:true,warranty:'5 years'},
  {id:'t2',cat:'tyres',wheel:16,brand:'Michelin',name:'Primacy 4 ST 205/65 R16 95H',tier:'Premium',size:'205/65 R16',use:'Highway',speed:'H · 210 km/h',load:'95 (690 kg)',cons:'Tubeless radial',press:'33 psi front and rear',tread:'8.2 mm',price:10950,mrp:11800,rating:4.8,reviews:356,fits:['creta'],dealers:2,eta:'Today',pn:'MIC-P4ST-20565',img:PH('tyre-dark'),photo:true,warranty:'5 years'},
  {id:'t3',cat:'tyres',wheel:16,brand:'Apollo',name:'Alnac 4G 205/65 R16 95V',tier:'Mid',size:'205/65 R16',use:'City + highway',speed:'V · 240 km/h',load:'95 (690 kg)',cons:'Tubeless radial',press:'33 psi front and rear',tread:'8.2 mm',price:7190,mrp:7900,rating:4.4,reviews:530,fits:['creta'],dealers:6,eta:'Today',pn:'APL-A4G-20565',img:C('apollo-tyre'),warranty:'5 years'},
  {id:'t4',cat:'tyres',wheel:16,brand:'CEAT',name:'CrossDrive AT 205/65 R16 95H',tier:'Mid',size:'205/65 R16',use:'All-terrain',speed:'H · 210 km/h',load:'95 (690 kg)',cons:'Tubeless radial',press:'33 psi front and rear',tread:'8.2 mm',price:8290,mrp:8900,rating:4.4,reviews:289,fits:['creta'],dealers:4,eta:'Today',pn:'CEAT-CDAT-20565',img:PH('tyre-tread'),photo:true,warranty:'5 years'},
  {id:'t5',cat:'tyres',wheel:16,brand:'JK Tyre',name:'UX Royale 205/65 R16 95H',tier:'Value',size:'205/65 R16',use:'City',speed:'H · 210 km/h',load:'95 (690 kg)',cons:'Tubeless radial',press:'33 psi front and rear',tread:'8.2 mm',price:6790,mrp:7400,rating:4.2,reviews:604,fits:['creta'],dealers:3,eta:'Tomorrow',pn:'JK-UXR-20565',img:PH('tyre-wheel'),photo:true,warranty:'4 years'},
  {id:'t6',cat:'tyres',wheel:16,brand:'Bridgestone',name:'Ecopia EP150 205/65 R16 95H',tier:'Mid',size:'205/65 R16',use:'City',speed:'H · 210 km/h',load:'95 (690 kg)',cons:'Tubeless radial',press:'33 psi front and rear',tread:'8.2 mm',price:8390,mrp:9100,rating:4.5,reviews:412,fits:['creta'],dealers:3,eta:'Today',pn:'BS-EP150-20565',img:PH('tyre-alloy'),photo:true,warranty:'5 years'},
  {id:'t10',cat:'tyres',wheel:17,brand:'MRF',name:'Wanderer Street 215/60 R17 96H',tier:'Premium',size:'215/60 R17',use:'City + highway',speed:'H · 210 km/h',load:'96 (710 kg)',cons:'Tubeless radial',press:'33 psi front and rear',tread:'8.2 mm',price:8450,mrp:9200,rating:4.6,reviews:518,fits:[],variant:['creta'],variantNote:'Only for Creta builds on 17-inch wheels (SX automatic, SX(O)). Check your sidewall first',dealers:4,eta:'Today',pn:'MRF-WS-2156017',img:C('tyre-stack'),warranty:'5 years'},
  {id:'t11',cat:'tyres',wheel:17,brand:'Apollo',name:'Alnac 4G 215/60 R17 96V',tier:'Mid',size:'215/60 R17',use:'City + highway',speed:'V · 240 km/h',load:'96 (710 kg)',cons:'Tubeless radial',press:'33 psi front and rear',tread:'8.2 mm',price:7890,mrp:8600,rating:4.4,reviews:311,fits:[],variant:['creta'],variantNote:'Only for Creta builds on 17-inch wheels (SX automatic, SX(O)). Check your sidewall first',dealers:5,eta:'Today',pn:'APL-A4G-21560',img:C('apollo-tyre'),warranty:'5 years'},
  {id:'t7',cat:'tyres',brand:'MRF',name:'Shakti Super 13.6-28 Rear Tractor Tyre',tier:'Premium',size:'13.6-28',use:'Farm, rear',speed:'A6',load:'12 ply',cons:'Bias ply, tube type',press:'16–18 psi in the field',tread:'Lug height 38 mm',price:21500,mrp:23400,rating:4.7,reviews:1130,fits:['m575'],dealers:4,eta:'Today',pn:'MRF-SS-13628',img:C('tractor-tyre'),warranty:'3 years'},
  {id:'t8',cat:'tyres',brand:'BKT',name:'Commander 13.6-28 Rear Tractor Tyre',tier:'Mid',size:'13.6-28',use:'Farm, rear',speed:'A6',load:'12 ply',cons:'Bias ply, tube type',press:'16–18 psi in the field',tread:'Lug height 36 mm',price:19800,mrp:21000,rating:4.5,reviews:640,fits:['m575'],dealers:3,eta:'Today',pn:'BKT-CMD-13628',img:PH('tractor-tyre-red'),photo:true,warranty:'3 years'},
  {id:'t9',cat:'tyres',brand:'Apollo',name:'EnduRace RD 295/80 R22.5 Drive Tyre',tier:'Mid',size:'295/80 R22.5',use:'Truck, drive axle',speed:'L · 120 km/h',load:'152/148 (3,550 kg single)',cons:'Tubeless radial',press:'120 psi',tread:'17 mm',price:25400,mrp:27100,rating:4.4,reviews:174,fits:['signa'],dealers:3,eta:'Today',pn:'APL-ERD-29580',img:PH('tyre-tread'),photo:true,warranty:'6 years'},
  /* tracks */
  {id:'k1',cat:'tracks',links:80,brand:'Vrom TrakPro',name:'Rubber Track 300 × 52.5 × 80, Block tread',tier:'Premium',size:'300 × 52.5 × 80',pattern:'Block',core:'Continuous steel',price:62000,mrp:71000,rating:4.6,reviews:84,fits:['jcb'],dealers:2,eta:'Today',pn:'FW-TR-30052-80B',img:C('rubber-track'),best:true,warranty:'18 months'},
  {id:'k2',cat:'tracks',links:80,brand:'Bridgestone',name:'Rubber Track 300 × 52.5 × 80, Zig-zag',tier:'OES',size:'300 × 52.5 × 80',pattern:'Zig-zag',core:'Continuous steel',price:78500,mrp:84000,rating:4.8,reviews:51,fits:['jcb'],dealers:1,eta:'Tomorrow',pn:'BS-RT-3005280Z',img:PH('deere-track'),photo:true,warranty:'24 months'},
  {id:'k3',cat:'tracks',links:80,brand:'JCB',name:'Genuine Rubber Track 300 × 52.5 × 80',tier:'OE Genuine',size:'300 × 52.5 × 80',pattern:'Block',core:'Continuous steel',price:92000,mrp:92000,rating:4.9,reviews:22,fits:['jcb'],dealers:1,eta:'Tomorrow',pn:'JCB-332-Y5216',img:PH('tracks-sand'),photo:true,warranty:'24 months'},
  {id:'k4',cat:'tracks',links:84,brand:'Vrom TrakPro',name:'Rubber Track 300 × 52.5 × 84, Block tread',tier:'Premium',size:'300 × 52.5 × 84',pattern:'Block',core:'Continuous steel',price:64500,mrp:73000,rating:4.5,reviews:19,fits:[],variant:['jcb'],variantNote:'Only for 30 Plus machines that run 84 links. Count the links on your old track first',dealers:1,eta:'Today',pn:'FW-TR-30052-84B',img:C('rubber-track'),warranty:'18 months'}
];

const DEALERS = [
  {id:'s4',addr:'412 Avinashi Road, Lakshmi Mills, Coimbatore',name:'Vrom Hub, Avinashi Road',area:'Lakshmi Mills',rating:4.8,reviews:1204,open:'Open until 10 PM',stock:14,factor:1,fit:true,own:true,lat:11.0112,lon:76.9868},
  {id:'s1',addr:'27 Cross Cut Road, Gandhipuram, Coimbatore',name:'Sri Murugan Auto Spares',area:'Gandhipuram',rating:4.7,reviews:318,open:'Open until 9 PM',stock:6,factor:1,fit:true,lat:11.0178,lon:76.9668},
  {id:'s2',addr:'88 DB Road, RS Puram, Coimbatore',name:'KG Motors & Brakes',area:'RS Puram',rating:4.6,reviews:211,open:'Open until 8 PM',stock:2,factor:.99,fit:true,lat:11.0091,lon:76.9502},
  {id:'s3',addr:'14 NSR Road, Saibaba Colony, Coimbatore',name:'Lakshmi Car Care',area:'Saibaba Colony',rating:4.5,reviews:176,open:'Open until 8:30 PM',stock:9,factor:1.03,fit:true,lat:11.0262,lon:76.9447},
  {id:'s5',addr:'6 Big Bazaar Street, Ukkadam, Coimbatore',name:'Velan Spares',area:'Ukkadam',rating:4.3,reviews:94,open:'Closes at 7 PM',closing:true,stock:0,factor:.97,fit:false,lat:10.9908,lon:76.961}
];
/* heavy parts (tractor and truck tyres, tracks) come from a different trade: farm, truck and earthmover dealers */
const DEALERS_HEAVY = [
  {id:'h4',addr:'412 Avinashi Road, Lakshmi Mills, Coimbatore',name:'Vrom Hub, Avinashi Road',area:'Lakshmi Mills',rating:4.8,reviews:1204,open:'Open until 10 PM',stock:3,factor:1,fit:true,own:true,lat:11.0112,lon:76.9868},
  {id:'h1',addr:'210 Sathy Road, Ganapathy, Coimbatore',name:'Kovai Earthmover Spares',area:'Ganapathy',rating:4.6,reviews:142,open:'Open until 8 PM',stock:2,factor:.98,fit:true,lat:11.0402,lon:76.9792},
  {id:'h2',addr:'52 Perur Main Road, Selvapuram, Coimbatore',name:'Sakthi Tractors & Implements',area:'Selvapuram',rating:4.5,reviews:388,open:'Open until 7:30 PM',stock:4,factor:1.02,fit:true,lat:10.9858,lon:76.9432},
  {id:'h3',addr:'31 Trichy Road, Ramanathapuram, Coimbatore',name:'Coimbatore Truck Tyre House',area:'Ramanathapuram',rating:4.4,reviews:97,open:'Closes at 7 PM',closing:true,stock:0,factor:.97,fit:false,lat:10.9978,lon:76.9925}
];
/* shopper's location: PIN 641018, central Coimbatore. Distances are computed from coordinates so list and map always agree */
const ME = {lat:11.0021,lon:76.9649,pin:'641018'};
const kmTo = d => { const R = 6371, r = x => x * Math.PI / 180, a = Math.sin(r(d.lat - ME.lat) / 2) ** 2 + Math.cos(r(ME.lat)) * Math.cos(r(d.lat)) * Math.sin(r(d.lon - ME.lon) / 2) ** 2; return Math.round(R * 2 * Math.asin(Math.sqrt(a)) * 10) / 10; };
[...DEALERS, ...DEALERS_HEAVY].forEach(d => d.km = kmTo(d));

const FACETS = {
  brakes:[
    {k:'avail',label:'Availability',type:'avail'},
    {k:'price',label:'Price',type:'range'},
    {k:'style',label:'Disc type',type:'check',info:'Plain discs are quietest and last longest. Drilled and slotted shed heat faster for hard or hilly driving.'},
    {k:'tier',label:'Quality',type:'check',info:'OE Genuine is carmaker-branded. OES is made by the same supplier under its own brand.'},
    {k:'brand',label:'Brand',type:'check'},
    {k:'rating',label:'Customer rating',type:'rating'}
  ],
  tyres:[
    {k:'avail',label:'Availability',type:'avail'},
    {k:'price',label:'Price',type:'range'},
    {k:'size',label:'Tyre size',type:'check'},
    {k:'use',label:'Driving use',type:'check'},
    {k:'speed',label:'Speed rating',type:'check'},
    {k:'brand',label:'Brand',type:'check'},
    {k:'rating',label:'Customer rating',type:'rating'}
  ],
  tracks:[
    {k:'avail',label:'Availability',type:'avail'},
    {k:'price',label:'Price',type:'range'},
    {k:'size',label:'Size (width × pitch × links)',type:'check'},
    {k:'pattern',label:'Tread pattern',type:'check'},
    {k:'tier',label:'Quality',type:'check'},
    {k:'brand',label:'Brand',type:'check'},
    {k:'rating',label:'Customer rating',type:'rating'}
  ]
};
const CAT_META = {
  brakes:{title:'Front Brake Discs',tab:'Brake discs',one:'brake disc pair',icon:C('rotor-plain'),crumb:['Car parts','Brakes'],veh:'creta',
    q:'Which brake disc should I choose?',
    qt:'For everyday city and highway driving, a <b>plain ventilated disc</b> is quietest and lasts longest. Choose <b>drilled or slotted</b> only if you drive hard or on ghat roads. Always replace discs <b>in pairs</b>, and fit new pads at the same time.'},
  tyres:{title:'Tyres',tab:'Tyres',one:'tyre',icon:C('tyre-stack'),crumb:['Tyres','By vehicle'],veh:'creta',
    q:'How do I pick the right tyre?',
    qt:'Your Creta SX manual left the factory on <span class="mono">205/65 R16 95H</span>; automatics and the SX(O) run <span class="mono">215/60 R17 96H</span>. Read the size off your sidewall to be sure. Replace tyres in pairs on the same axle, and get an alignment with every new set.',
    qtBy:{m575:'Your 575 DI runs <span class="mono">13.6-28</span> at the rear and <span class="mono">6.00-16</span> at the front. Pick a 12-ply lug tyre for mixed field and haulage work, and replace rear tyres <b>as a pair</b>.',
      signa:'Your Signa tipper runs <span class="mono">295/80 R22.5</span>. Use a lug pattern on the drive axle, and match tread depth across twin wheels so they share the load evenly.'}},
  tracks:{title:'Rubber Tracks',tab:'Tracks',one:'track',icon:C('rubber-track'),crumb:['Construction','Tracks'],veh:'jcb',
    q:'How do I read a track size?',
    qt:'Track size is <b>width × pitch × links</b>. Most 30 Plus machines take <span class="mono">300 × 52.5 × 80</span>, but some builds run 84 links. Count the links on your old track first, because one link off and it won\'t tension.'}
};
const fmt = n => '₹' + n.toLocaleString('en-IN');
