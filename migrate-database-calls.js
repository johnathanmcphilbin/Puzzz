#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = './src';
const BACKUP_DIR = './migration-backup';

// Create backup directory
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Utility functions
function getAllFiles(dir, ext = '.tsx') {
  let files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      files = files.concat(getAllFiles(fullPath, ext));
    } else if (fullPath.endsWith(ext) || fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function backupFile(filePath) {
  const backupPath = path.join(BACKUP_DIR, path.relative(SRC_DIR, filePath));
  const backupDir = path.dirname(backupPath);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  fs.copyFileSync(filePath, backupPath);
}

function addImportsIfNeeded(content) {
  const needsFunctionsImport =
    content.includes('FUNCTIONS_BASE_URL') ||
    content.includes('SUPABASE_ANON_KEY');
  const hasFunctionsImport = content.includes("from '@/utils/functions'");

  if (needsFunctionsImport && !hasFunctionsImport) {
    // Find the last import statement
    const lines = content.split('\n');
    let lastImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ') && !lines[i].includes('from')) {
        // Multi-line import, find the end
        for (let j = i; j < lines.length; j++) {
          if (lines[j].includes('from')) {
            lastImportIndex = j;
            break;
          }
        }
      } else if (lines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex !== -1) {
      lines.splice(
        lastImportIndex + 1,
        0,
        "import { FUNCTIONS_BASE_URL, SUPABASE_ANON_KEY } from '@/utils/functions';"
      );
      return lines.join('\n');
    }
  }

  return content;
}

// Migration patterns
const migrations = [
  // Fix Question interface to handle nullable fields
  {
    pattern: /interface Question \{[^}]+\}/g,
    replacement: `interface Question {
  id: string;
  option_a: string;
  option_b: string;
  category: string;
  created_at?: string;
}`,
  },

  // Fix FormsQuestion interface to handle nullable fields
  {
    pattern: /interface FormsQuestion \{[^}]+\}/g,
    replacement: `interface FormsQuestion {
  id: string;
  question: string;
  category: string;
  is_controversial: boolean;
}`,
  },

  // Fix character ID filtering for TypeScript
  {
    pattern:
      /const characterIds = players\.map\(p => p\.selected_character_id\)\.filter\(Boolean\);/g,
    replacement:
      'const characterIds = players.map(p => p.selected_character_id).filter((id): id is string => Boolean(id));',
  },

  // Fix questions data mapping to handle nulls
  {
    pattern:
      /questions = \(questionsData \|\| \[\]\)\.map\(q => \(\{\s*\.\.\.q,\s*category: q\.category \|\| "general"\s*\}\)\);/g,
    replacement: `questions = (questionsData || []).map(q => ({
      ...q,
      category: q.category || "general",
      created_at: q.created_at || new Date().toISOString()
    }));`,
  },

  // Fix selectedQuestions assignment with proper typing
  {
    pattern: /setQuestions\(selectedQuestions\);/g,
    replacement: `const formattedQuestions: FormsQuestion[] = selectedQuestions.map(q => ({
      id: q.id,
      question: q.question,
      category: q.category || "general",
      is_controversial: q.is_controversial || false
    }));
    setQuestions(formattedQuestions);`,
  },

  // Replace rooms table updates with Redis API calls
  {
    pattern:
      /const \{ error \} = await supabase\s*\.from\("rooms"\)\s*\.update\(\{ game_state: ([^}]+) \}\)\s*\.eq\("id", room\.id\);/g,
    replacement: `const response = await fetch(\`\${FUNCTIONS_BASE_URL}/rooms-service\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\` },
        body: JSON.stringify({ 
          action: 'update', 
          roomCode: room.room_code, 
          updates: { gameState: $1 } 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update game state');
      }`,
  },

  // Replace forms_responses inserts (remove them since we store in Redis)
  {
    pattern:
      /const \{ error: insertError \} = await supabase\s*\.from\("forms_responses"\)\s*\.insert\([^)]+\);\s*if \(insertError\) throw insertError;/g,
    replacement: '// Forms responses are now stored in Redis game state',
  },

  // Replace game_votes operations (remove them since we store in Redis)
  {
    pattern:
      /await supabase\s*\.from\("game_votes"\)\s*\.(delete|insert)\([^}]+\}?\);/g,
    replacement: '// Game votes are now stored in Redis game state',
  },

  // Replace room_questions operations (remove them since table is deleted)
  {
    pattern:
      /const \{ data: roomQuestions[^}]+\} = await supabase\s*\.from\("room_questions"\)[^;]+;/g,
    replacement:
      '// Room questions are no longer used - using default questions',
  },

  // Replace ai_chat_customizations operations (remove them since table is deleted)
  {
    pattern:
      /const \{ data: customizationData[^}]+\} = await supabase\s*\.from\("ai_chat_customizations"\)[^;]+;/g,
    replacement: '// AI customizations are no longer stored in database',
  },

  // Replace players table operations with Redis operations
  {
    pattern:
      /await supabase\s*\.from\("players"\)\s*\.update\([^)]+\)\s*\.eq\("room_id", room\.id\)\s*\.eq\("player_id", [^)]+\);/g,
    replacement: `// Player updates are now handled through Redis room data`,
  },

  // Replace players table deletes with Redis operations
  {
    pattern:
      /await supabase\s*\.from\("players"\)\s*\.delete\(\)\s*\.eq\("room_id", room\.id\)\s*\.eq\("player_id", [^)]+\);/g,
    replacement: `// Player removal is now handled through Redis room data`,
  },

  // Fix setCurrentQuestion with proper null checking
  {
    pattern: /setCurrentQuestion\(randomQuestion\);/g,
    replacement: 'if (randomQuestion) setCurrentQuestion(randomQuestion);',
  },

  // Fix results calculation null checks
  {
    pattern: /results\[question\.id\]\[player\.player_id\] = 0;/g,
    replacement:
      'if (results[question.id]) results[question.id][player.player_id] = 0;',
  },

  {
    pattern: /results\[questionId\]\[selectedPlayerId as string\]\+\+;/g,
    replacement:
      'if (results[questionId]) results[questionId][selectedPlayerId as string]++;',
  },

  // Fix winner votes access
  {
    pattern:
      /const winnerVotes = questionResults\[winner\?\.player_id\] \|\| 0;/g,
    replacement:
      'const winnerVotes = winner ? (questionResults[winner.player_id] || 0) : 0;',
  },

  // Remove submitResponses database operations for Forms game
  {
    pattern:
      /const \{ error \} = await supabase\s*\.from\("rooms"\)\s*\.update\(\{ game_state: updatedGameState \}\)\s*\.eq\("id", room\.id\);\s*if \(error\) throw error;/g,
    replacement: `// Update room state via Redis-based rooms-service
      const response = await fetch(\`\${FUNCTIONS_BASE_URL}/rooms-service\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\` },
        body: JSON.stringify({ 
          action: 'update', 
          roomCode: room.room_code, 
          updates: { gameState: updatedGameState } 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update game state');
      }`,
  },

  // Update show results operations
  {
    pattern:
      /const \{ error: resultsError \} = await supabase\s*\.from\("rooms"\)\s*\.update\(\{ game_state: resultsGameState \}\)\s*\.eq\("id", room\.id\);/g,
    replacement: `const resultsResponse = await fetch(\`\${FUNCTIONS_BASE_URL}/rooms-service\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\` },
        body: JSON.stringify({ 
          action: 'update', 
          roomCode: room.room_code, 
          updates: { gameState: resultsGameState } 
        }),
      });`,
  },

  // Update backToLobby operations
  {
    pattern:
      /const \{ error \} = await supabase\s*\.from\("rooms"\)\s*\.update\(\{\s*game_state: \{ phase: "lobby" \}\s*\}\)\s*\.eq\("id", room\.id\);/g,
    replacement: `const response = await fetch(\`\${FUNCTIONS_BASE_URL}/rooms-service\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\` },
        body: JSON.stringify({ 
          action: 'update', 
          roomCode: room.room_code, 
          updates: { gameState: { phase: "lobby" } } 
        }),
      });`,
  },
];

// Main migration function
function migrateFile(filePath) {
  console.log(`Migrating ${filePath}...`);

  // Create backup
  backupFile(filePath);

  // Read file content
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Apply all migration patterns
  for (const migration of migrations) {
    const before = content;
    content = content.replace(migration.pattern, migration.replacement);
    if (content !== before) {
      modified = true;
      console.log(
        `  ✓ Applied pattern: ${migration.pattern.source.substring(0, 50)}...`
      );
    }
  }

  // Add necessary imports
  const contentWithImports = addImportsIfNeeded(content);
  if (contentWithImports !== content) {
    content = contentWithImports;
    modified = true;
    console.log(`  ✓ Added function imports`);
  }

  // Write back if modified
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ File migrated successfully`);
  } else {
    console.log(`  ⚪ No changes needed`);
  }
}

// Run migration
function runMigration() {
  console.log('🚀 Starting database call migration...\n');

  const files = getAllFiles(SRC_DIR);
  console.log(`Found ${files.length} files to check\n`);

  for (const file of files) {
    try {
      migrateFile(file);
    } catch (error) {
      console.error(`❌ Error migrating ${file}:`, error.message);
    }
  }

  console.log('\n✅ Migration completed!');
  console.log(`📁 Backups saved to: ${BACKUP_DIR}`);
  console.log('\n🔧 Manual fixes still needed:');
  console.log('  1. Review and test each game component');
  console.log('  2. Update any remaining database references');
  console.log(
    '  3. Run the database migration: supabase/migrations/20250729004221_remove_room_database_tables.sql'
  );
}

// Execute if run directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, migrateFile };
