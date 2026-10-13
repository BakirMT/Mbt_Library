const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");
const target = `  app.listen(port, () => {
    console.log(\`[MBT Library Full-Stack] Server running on port \${port}\`);
    console.log('[License Engine] 72-Hour Free trial background deactivation scheduler active');
    console.log('[Cloud SQL] Relational schema and Row Level Security active');
  });
}

startServer();`;

const replacement = `  if (!process.env.VERCEL) {
    app.listen(port, () => {
      console.log(\`[MBT Library Full-Stack] Server running on port \${port}\`);
      console.log('[License Engine] 72-Hour Free trial background deactivation scheduler active');
      console.log('[Cloud SQL] Relational schema and Row Level Security active');
    });
  }
}

if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
  seedDatabaseIfEmpty().catch(console.error);
} else {
  startServer();
}

export default app;`;

if (!code.includes(target)) {
  console.error("Target not found!");
  process.exit(1);
}
code = code.replace(target, replacement);
fs.writeFileSync("server.ts", code, "utf8");
console.log("Updated server.ts successfully");
