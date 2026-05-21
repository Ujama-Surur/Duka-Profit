const fs = require('fs');
let file = fs.readFileSync('frontend/src/components/layout/LayoutEnhanced.jsx', 'utf8');
file = file.replace(/\{ path: '\/sales'.*\}/, "{ path: '/sales', icon: <Receipt size={20} />, key: 'sales' }");
fs.writeFileSync('frontend/src/components/layout/LayoutEnhanced.jsx', file);
