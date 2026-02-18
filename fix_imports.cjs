const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'layout', 'Sidebar.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldImport = "import { fetchCustomViews, createCustomView, updateCustomView, deleteCustomView } from '../services/customViewService';\r\nimport type { CustomView, ViewFilter } from '../types';";
const newImport = "import type { CustomView } from '../types';\r\nimport { useCustomViews } from '../hooks/useCustomViews';";

content = content.replace(oldImport, newImport);
fs.writeFileSync(file, content);
console.log('Done - imports replaced');
