const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

const codesRule = `
    // --- Codes Collection ---
    match /codes/{codeId} {
      allow get: if isSignedIn();
      allow list: if isAdmin();
      allow create: if isAdmin();
      allow update: if isSignedIn() 
                    && existing().isUsed == false 
                    && incoming().isUsed == true
                    && incoming().usedBy == request.auth.uid
                    && incoming().durationDays == existing().durationDays;
    }
`;

code = code.replace("    // --- Users Collection ---", codesRule + "\n    // --- Users Collection ---");

fs.writeFileSync('firestore.rules', code);
