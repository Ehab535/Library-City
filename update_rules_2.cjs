const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

code = code.replace("                    && incoming().fullName == existing().fullName\\n", "");

fs.writeFileSync('firestore.rules', code);
