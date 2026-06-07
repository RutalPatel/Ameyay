const router = require('express').Router();

const COLLEGES = [
  {id:'IITB',name:'IIT Bombay',short:'IITB',city:'Mumbai',state:'Maharashtra',type:'IIT',country:'India'},
  {id:'IITD',name:'IIT Delhi',short:'IITD',city:'New Delhi',state:'Delhi',type:'IIT',country:'India'},
  {id:'IITM',name:'IIT Madras',short:'IITM',city:'Chennai',state:'Tamil Nadu',type:'IIT',country:'India'},
  {id:'IITKGP',name:'IIT Kharagpur',short:'IITKGP',city:'Kharagpur',state:'West Bengal',type:'IIT',country:'India'},
  {id:'IITK',name:'IIT Kanpur',short:'IITK',city:'Kanpur',state:'UP',type:'IIT',country:'India'},
  {id:'IITR',name:'IIT Roorkee',short:'IITR',city:'Roorkee',state:'Uttarakhand',type:'IIT',country:'India'},
  {id:'IITH',name:'IIT Hyderabad',short:'IITH',city:'Hyderabad',state:'Telangana',type:'IIT',country:'India'},
  {id:'IITG',name:'IIT Guwahati',short:'IITG',city:'Guwahati',state:'Assam',type:'IIT',country:'India'},
  {id:'SVNIT',name:'SVNIT Surat',short:'SVNIT',city:'Surat',state:'Gujarat',type:'NIT',country:'India'},
  {id:'NITT',name:'NIT Trichy',short:'NITT',city:'Tiruchirappalli',state:'Tamil Nadu',type:'NIT',country:'India'},
  {id:'NITW',name:'NIT Warangal',short:'NITW',city:'Warangal',state:'Telangana',type:'NIT',country:'India'},
  {id:'NITC',name:'NIT Calicut',short:'NITC',city:'Kozhikode',state:'Kerala',type:'NIT',country:'India'},
  {id:'NITK',name:'NIT Surathkal',short:'NITK',city:'Mangaluru',state:'Karnataka',type:'NIT',country:'India'},
  {id:'BITS',name:'BITS Pilani',short:'BITS',city:'Pilani',state:'Rajasthan',type:'Deemed',country:'India'},
  {id:'VIT',name:'VIT Vellore',short:'VIT',city:'Vellore',state:'Tamil Nadu',type:'Private',country:'India'},
  {id:'SCET',name:'SCET Surat',short:'SCET',city:'Surat',state:'Gujarat',type:'Private',country:'India'},
  {id:'NU',name:'Nirma University',short:'NU',city:'Ahmedabad',state:'Gujarat',type:'Deemed',country:'India'},
  {id:'GTU',name:'Gujarat Technological University',short:'GTU',city:'Ahmedabad',state:'Gujarat',type:'State',country:'India'},
  {id:'DTU',name:'Delhi Technological University',short:'DTU',city:'New Delhi',state:'Delhi',type:'State',country:'India'},
  {id:'JU',name:'Jadavpur University',short:'JU',city:'Kolkata',state:'West Bengal',type:'State',country:'India'},
  {id:'AU',name:'Anna University',short:'AU',city:'Chennai',state:'Tamil Nadu',type:'State',country:'India'},
  {id:'COEP',name:'COEP Technological University',short:'COEP',city:'Pune',state:'Maharashtra',type:'State',country:'India'},
  {id:'IIITH',name:'IIIT Hyderabad',short:'IIITH',city:'Hyderabad',state:'Telangana',type:'IIIT',country:'India'},
  {id:'SRM',name:'SRM Institute of Science & Tech',short:'SRMIST',city:'Chennai',state:'Tamil Nadu',type:'Deemed',country:'India'},
  {id:'MIT',name:'Manipal Institute of Technology',short:'MIT',city:'Manipal',state:'Karnataka',type:'Deemed',country:'India'},
  {id:'PESU',name:'PES University',short:'PESU',city:'Bengaluru',state:'Karnataka',type:'Private',country:'India'},
  {id:'CU',name:'Chandigarh University',short:'CU',city:'Chandigarh',state:'Punjab',type:'Private',country:'India'},
  {id:'Amity',name:'Amity University',short:'Amity',city:'Noida',state:'UP',type:'Private',country:'India'},
  {id:'TIET',name:'Thapar University',short:'TIET',city:'Patiala',state:'Punjab',type:'Deemed',country:'India'},
  {id:'IIMA',name:'IIM Ahmedabad',short:'IIMA',city:'Ahmedabad',state:'Gujarat',type:'IIM',country:'India'},
  {id:'IIMB',name:'IIM Bangalore',short:'IIMB',city:'Bengaluru',state:'Karnataka',type:'IIM',country:'India'},
  {id:'MITMA',name:'MIT Massachusetts',short:'MIT-US',city:'Cambridge',state:'MA',type:'International',country:'USA'},
  {id:'Stanford',name:'Stanford University',short:'Stanford',city:'Palo Alto',state:'CA',type:'International',country:'USA'},
  {id:'UofT',name:'University of Toronto',short:'UofT',city:'Toronto',state:'Ontario',type:'International',country:'Canada'},
  {id:'ICL',name:'Imperial College London',short:'ICL',city:'London',state:'England',type:'International',country:'UK'},
  {id:'NUS',name:'National University of Singapore',short:'NUS',city:'Singapore',state:'',type:'International',country:'Singapore'},
  {id:'LPU',name:'Lovely Professional University',short:'LPU',city:'Phagwara',state:'Punjab',type:'Private',country:'India'},
  {id:'Christ',name:'Christ University',short:'Christ',city:'Bengaluru',state:'Karnataka',type:'Deemed',country:'India'},
  {id:'RVCE',name:'RV College of Engineering',short:'RVCE',city:'Bengaluru',state:'Karnataka',type:'Autonomous',country:'India'},
  {id:'PSGCT',name:'PSG College of Technology',short:'PSGCT',city:'Coimbatore',state:'Tamil Nadu',type:'Autonomous',country:'India'},
  {id:'KJSCE',name:'KJ Somaiya College of Engineering',short:'KJSCE',city:'Mumbai',state:'Maharashtra',type:'Autonomous',country:'India'},
  {id:'MU',name:'Mumbai University',short:'MU',city:'Mumbai',state:'Maharashtra',type:'State',country:'India'},
  {id:'SPPU',name:'Savitribai Phule Pune University',short:'SPPU',city:'Pune',state:'Maharashtra',type:'State',country:'India'},
  {id:'XLRI',name:'XLRI Jamshedpur',short:'XLRI',city:'Jamshedpur',state:'Jharkhand',type:'Business',country:'India'},
  {id:'SIU',name:'Symbiosis International University',short:'SIU',city:'Pune',state:'Maharashtra',type:'Deemed',country:'India'},
  {id:'IITBHU',name:'IIT BHU Varanasi',short:'IITBHU',city:'Varanasi',state:'UP',type:'IIT',country:'India'},
  {id:'IITI',name:'IIT Indore',short:'IITI',city:'Indore',state:'MP',type:'IIT',country:'India'},
  {id:'NITR',name:'NIT Rourkela',short:'NITR',city:'Rourkela',state:'Odisha',type:'NIT',country:'India'},
];

const POPULAR = ['IITB','IITD','IITM','SVNIT','NITT','BITS','VIT','SCET','IIITH','DTU','SRM','PESU'];

// GET /api/colleges
router.get('/', (req, res) => {
  const { q, type, country, limit = 60 } = req.query;
  let list = [...COLLEGES];
  if (q) {
    const ql = q.toLowerCase();
    list = list.filter(c =>
      c.name.toLowerCase().includes(ql) || c.short.toLowerCase().includes(ql) ||
      c.city.toLowerCase().includes(ql) || c.state.toLowerCase().includes(ql) ||
      c.type.toLowerCase().includes(ql)
    );
  }
  if (type)    list = list.filter(c => c.type.toLowerCase() === type.toLowerCase());
  if (country) list = list.filter(c => c.country.toLowerCase() === country.toLowerCase());
  res.json({ total: list.length, colleges: list.slice(0, +limit) });
});

// GET /api/colleges/popular
router.get('/popular', (req, res) => {
  res.json({ colleges: POPULAR.map(id => COLLEGES.find(c => c.id === id)).filter(Boolean) });
});

// GET /api/colleges/:id
router.get('/:id', (req, res) => {
  const c = COLLEGES.find(c => c.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'College not found' });
  res.json({ college: c });
});

// POST /api/colleges/request
router.post('/request', (req, res) => {
  const { name, city, country } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  console.log('College request:', { name, city, country });
  res.json({ message: `Request received for "${name}". We'll add it within 24 hours!` });
});

module.exports = router;
