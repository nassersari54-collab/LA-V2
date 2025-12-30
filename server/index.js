import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, "db.json");

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      users: [
        // Exemple (à changer dans l'UI si tu veux): 
        // { id: "u1", display: "Vista Kyle", panelToken: "PANEL_TOKEN", phoneToken: "PHONE_TOKEN" }
      ],
      inventory: {}, // userId -> [{id,label,qty,category}]
      contacts: {},  // userId -> [{id,name,number}]
      messages: {}   // userId -> [{id,toNumber,fromNumber,body,createdAt}]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function getUserByPanelToken(db, token) {
  return db.users.find(u => u.panelToken === token);
}
function getUserByPhoneToken(db, token) {
  return db.users.find(u => u.phoneToken === token);
}

app.get("/health", (_req,res)=>res.json({ok:true}));

// ✅ Setup ultra simple: créer un user + tokens (tu peux garder ton système de tokens)
app.post("/api/setup", (req,res)=>{
  const { display, panelToken, phoneToken } = req.body || {};
  if (!display || !panelToken || !phoneToken) return res.status(400).json({error:"display/panelToken/phoneToken requis"});
  const db = loadDB();
  let user = db.users.find(u => u.panelToken === panelToken) || db.users.find(u => u.phoneToken === phoneToken);
  if (!user) {
    user = { id: uid(), display, panelToken, phoneToken };
    db.users.push(user);
  } else {
    user.display = display;
    user.panelToken = panelToken;
    user.phoneToken = phoneToken;
  }
  db.inventory[user.id] ||= [];
  db.contacts[user.id] ||= [];
  db.messages[user.id] ||= [];
  saveDB(db);
  res.json({ ok:true, user });
});

// ---- PANEL API ----
app.get("/api/panel/me", (req,res)=>{
  const db = loadDB();
  const token = req.query.panel_token;
  if (!token) return res.status(401).json({error:"panel_token manquant"});
  const user = getUserByPanelToken(db, token);
  if (!user) return res.status(401).json({error:"panel_token invalide"});
  res.json({ user: { id:user.id, display:user.display }});
});

app.get("/api/panel/inventory", (req,res)=>{
  const db = loadDB();
  const token = req.query.panel_token;
  if (!token) return res.status(401).json({error:"panel_token manquant"});
  const user = getUserByPanelToken(db, token);
  if (!user) return res.status(401).json({error:"panel_token invalide"});
  res.json({ items: db.inventory[user.id] || [] });
});

app.post("/api/panel/inventory/add", (req,res)=>{
  const db = loadDB();
  const token = req.query.panel_token;
  const user = token ? getUserByPanelToken(db, token) : null;
  if (!user) return res.status(401).json({error:"panel_token invalide"});
  const { label, qty, category } = req.body || {};
  if (!label) return res.status(400).json({error:"label requis"});
  const item = { id: uid(), label, qty: Number(qty||1), category: category || "Divers" };
  db.inventory[user.id] ||= [];
  db.inventory[user.id].push(item);
  saveDB(db);
  res.json({ ok:true, item });
});

// quick buttons
app.post("/api/panel/quick", (req,res)=>{
  const db = loadDB();
  const token = req.query.panel_token;
  const user = token ? getUserByPanelToken(db, token) : null;
  if (!user) return res.status(401).json({error:"panel_token invalide"});
  const { what } = req.body || {};
  const label = what === "eau" ? "Eau" : what === "sandwich" ? "Sandwich" : null;
  if (!label) return res.status(400).json({error:"what invalide"});
  const item = { id: uid(), label, qty: 1, category: "Ravitaillement" };
  db.inventory[user.id] ||= [];
  db.inventory[user.id].push(item);
  saveDB(db);
  res.json({ ok:true, item });
});

// ---- PHONE API ----
app.get("/api/phone/home", (req,res)=>{
  const db = loadDB();
  const token = req.query.phone_token;
  if (!token) return res.status(401).json({error:"phone_token manquant"});
  const user = getUserByPhoneToken(db, token);
  if (!user) return res.status(401).json({error:"phone_token invalide"});
  res.json({
    user: { display: user.display },
    apps: [
      { id:"messages", name:"Messages" },
      { id:"contacts", name:"Contacts" },
      { id:"birdy", name:"Birdy" },
      { id:"spark", name:"Spark" },
      { id:"tiktok", name:"TikTok partagé" }
    ]
  });
});

app.get("/api/phone/contacts", (req,res)=>{
  const db = loadDB();
  const token = req.query.phone_token;
  const user = token ? getUserByPhoneToken(db, token) : null;
  if (!user) return res.status(401).json({error:"phone_token invalide"});
  res.json({ contacts: db.contacts[user.id] || [] });
});

app.post("/api/phone/contacts/add", (req,res)=>{
  const db = loadDB();
  const token = req.query.phone_token;
  const user = token ? getUserByPhoneToken(db, token) : null;
  if (!user) return res.status(401).json({error:"phone_token invalide"});
  const { name, number } = req.body || {};
  if (!name || !number) return res.status(400).json({error:"name/number requis"});
  const c = { id: uid(), name, number };
  db.contacts[user.id] ||= [];
  db.contacts[user.id].push(c);
  saveDB(db);
  res.json({ ok:true, contact: c });
});

app.get("/api/phone/messages", (req,res)=>{
  const db = loadDB();
  const token = req.query.phone_token;
  const user = token ? getUserByPhoneToken(db, token) : null;
  if (!user) return res.status(401).json({error:"phone_token invalide"});
  const msgs = (db.messages[user.id] || []).slice().sort((a,b)=> (b.createdAt||"").localeCompare(a.createdAt||""));
  res.json({ messages: msgs });
});

app.post("/api/phone/messages/send", (req,res)=>{
  const db = loadDB();
  const token = req.query.phone_token;
  const user = token ? getUserByPhoneToken(db, token) : null;
  if (!user) return res.status(401).json({error:"phone_token invalide"});
  const { toNumber, fromNumber, body } = req.body || {};
  if (!toNumber || !fromNumber || !body) return res.status(400).json({error:"toNumber/fromNumber/body requis"});
  const m = { id: uid(), toNumber, fromNumber, body, createdAt: new Date().toISOString() };
  db.messages[user.id] ||= [];
  db.messages[user.id].push(m);
  saveDB(db);
  res.json({ ok:true, message: m });
});

// ---- Static site ----
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// SPA-ish routes
app.get(["/","/inventaire","/telephone","/actions","/metier"], (_req,res)=>{
  res.sendFile(path.join(publicDir, "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log("Server on", PORT));
