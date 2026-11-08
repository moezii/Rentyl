#!/usr/bin/env node

/**
 * Create New Translation Module
 * 
 * This script helps you create a new translation module quickly.
 * 
 * Usage:
 *   node scripts/create-translation-module.js <module-name>
 * 
 * Example:
 *   node scripts/create-translation-module.js cars
 *   node scripts/create-translation-module.js settings
 */

const fs = require('fs');
const path = require('path');

// Get module name from command line
const moduleName = process.argv[2];

if (!moduleName) {
    console.error('❌ Error: Please provide a module name');
    console.log('\nUsage:');
    console.log('  node scripts/create-translation-module.js <module-name>');
    console.log('\nExample:');
    console.log('  node scripts/create-translation-module.js cars');
    process.exit(1);
}

// Validate module name
if (!/^[a-z]+$/.test(moduleName)) {
    console.error('❌ Error: Module name must be lowercase letters only');
    process.exit(1);
}

const EN_DIR = path.join(__dirname, '../src/translations/en');
const AR_DIR = path.join(__dirname, '../src/translations/ar');

// Ensure directories exist
[EN_DIR, AR_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Create English translation file
const enFilePath = path.join(EN_DIR, `${moduleName}.js`);
if (fs.existsSync(enFilePath)) {
    console.error(`❌ Error: ${moduleName}.js already exists in en/`);
    process.exit(1);
}

const capitalizedName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

const enContent = `// ${capitalizedName} page translations
export default {
  title: '${capitalizedName}',
  subtitle: 'Manage your ${moduleName}',
  // Add more translations here
  // Example:
  // addNew: 'Add New ${capitalizedName}',
  // search: 'Search ${moduleName}...',
  // noDataFound: 'No ${moduleName} found',
};
`;

fs.writeFileSync(enFilePath, enContent, 'utf-8');
console.log(`✅ Created ${moduleName}.js in en/`);

// Create Arabic translation file
const arFilePath = path.join(AR_DIR, `${moduleName}.js`);
const arContent = `// ${capitalizedName} page translations (Arabic)
export default {
  title: '${capitalizedName}', // TODO: Translate to Arabic
  subtitle: 'Manage your ${moduleName}', // TODO: Translate to Arabic
  // Add Arabic translations here
};
`;

fs.writeFileSync(arFilePath, arContent, 'utf-8');
console.log(`✅ Created ${moduleName}.js in ar/`);

// Instructions for updating index.js
console.log('\n📝 Next steps:');
console.log(`\n1. Add translations to:`);
console.log(`   - src/translations/en/${moduleName}.js`);
console.log(`   - src/translations/ar/${moduleName}.js`);
console.log(`\n2. Import in src/translations/en/index.js:`);
console.log(`   import ${moduleName} from './${moduleName}';`);
console.log(`   export default { ..., ${moduleName} };`);
console.log(`\n3. Import in src/translations/ar/index.js:`);
console.log(`   import ${moduleName} from './${moduleName}';`);
console.log(`   export default { ..., ${moduleName} };`);
console.log(`\n4. Use in components:`);
console.log(`   const { t } = useLanguage();`);
console.log(`   <h1>{t('${moduleName}.title')}</h1>`);
console.log('');
