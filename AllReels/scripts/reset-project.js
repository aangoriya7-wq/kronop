#!/usr/bin/env node

/**
 * This script is used to reset the project to a blank state.
 * It deletes or moves the /app, /components, /hooks, /scripts, and /constants directories to /app-example based on user input and creates a new /app directory with an index.tsx and _layout.tsx file.
 * You can remove the `reset-project` script from package.json and safely delete this file after running it.
 */
// GitHub URL removed for security
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const root = process.cwd();
const oldDirs = ["app", "components", "hooks", "constants", "scripts"];
const exampleDir = "app-example";
const newAppDir = "app";
const exampleDirPath = path.join(root, exampleDir);
const newAppDirPath = path.join(root, newAppDir);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function resetProject() {
  console.log("🔄 Resetting project to blank state...\n");
  
  // Check if example directory exists
  if (!fs.existsSync(exampleDirPath)) {
    console.error(`❌ Error: Example directory '${exampleDir}' not found.`);
    process.exit(1);
  }

  // Move existing directories to example directory if they exist
  for (const dir of oldDirs) {
    const dirPath = path.join(root, dir);
    const targetPath = path.join(exampleDirPath, dir);
    
    if (fs.existsSync(dirPath)) {
      if (fs.existsSync(targetPath)) {
        console.log(`📁 Removing existing ${dir} in example directory...`);
        fs.rmSync(targetPath, { recursive: true, force: true });
      }
      
      console.log(`📁 Moving ${dir} to example directory...`);
      fs.renameSync(dirPath, targetPath);
    }
  }

  // Create new app directory
  if (!fs.existsSync(newAppDirPath)) {
    fs.mkdirSync(newAppDirPath, { recursive: true });
  }

  // Create basic app structure
  const appContent = `import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function App() {
  return (
    <View style={styles.container}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
`;

  const layoutContent = `import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" />
    </Stack>
  );
}
`;

  fs.writeFileSync(path.join(newAppDirPath, 'index.tsx'), appContent);
  fs.writeFileSync(path.join(newAppDirPath, '_layout.tsx'), layoutContent);

  console.log("\n✅ Project reset completed!");
  console.log(`📁 New app directory created at: ${newAppDirPath}`);
  console.log(`📁 Old directories moved to: ${exampleDirPath}`);
  console.log("\n💡 Next steps:");
  console.log("1. Run 'npm install' to install dependencies");
  console.log("2. Run 'npm start' to start the development server");
  console.log("3. Remove this script from package.json if desired");
  
  rl.close();
}

resetProject().catch(console.error);
