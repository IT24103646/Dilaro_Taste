import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "./config/db.js";

import { User } from "./models/User.js";
import { Ingredient } from "./models/Ingredient.js";
import { MenuItem } from "./models/MenuItem.js";
import { Room } from "./models/Room.js";
import { TextileInventory } from "./models/TextileInventory.js";

await connectDB();

async function run() {
  await Promise.all([
    User.deleteMany({}),
    Ingredient.deleteMany({}),
    MenuItem.deleteMany({}),
    Room.deleteMany({}),
    TextileInventory.deleteMany({})
  ]);

  const adminPass = await bcrypt.hash("admin123", 10);
  const staffPass = await bcrypt.hash("Staff@123", 10);
  const custPass = await bcrypt.hash("Customer@123", 10);

  const [admin, staff, customer] = await User.create([
    { name: "Admin", email: "admin@demo.com", role: "admin", passwordHash: adminPass },
    { name: "Staff", email: "staff@demo.com", role: "staff", passwordHash: staffPass },
    { name: "Customer", email: "customer@demo.com", role: "customer", passwordHash: custPass }
  ]);

  const [rice, chicken, oil, flour] = await Ingredient.create([
    { name: "Rice", unit: "kg", stock: 30, minThreshold: 5 },
    { name: "Chicken", unit: "kg", stock: 20, minThreshold: 5 },
    { name: "Oil", unit: "L", stock: 10, minThreshold: 2 },
    { name: "Flour", unit: "kg", stock: 15, minThreshold: 3 }
  ]);

  await MenuItem.create([
    {
      name: "Chicken Fried Rice",
      description: "Classic fried rice with chicken.",
      price: 8.5,
      category: "Mains",
      dietaryTags: ["spicy"],
      allergens: [],
      recipe: [
        { ingredient: rice._id, quantity: 0.25 },
        { ingredient: chicken._id, quantity: 0.2 },
        { ingredient: oil._id, quantity: 0.02 }
      ]
    },
    {
      name: "Roti",
      description: "Fresh roti",
      price: 2.0,
      category: "Sides",
      dietaryTags: ["vegetarian"],
      allergens: ["gluten"],
      recipe: [
        { ingredient: flour._id, quantity: 0.1 },
        { ingredient: oil._id, quantity: 0.01 }
      ]
    }
  ]);

  await Room.create([
    { code: "R101", name: "Sea View Room", description: "Ocean-facing room.", capacity: 2, amenities: ["WiFi","AC"], basePricePerHour: 15, status: "Available" },
    { code: "R102", name: "Conference Room", description: "For meetings.", capacity: 12, amenities: ["Projector","Whiteboard"], basePricePerHour: 30, status: "Available" }
  ]);

  await TextileInventory.create([
    { type: "linens", clean: 50, soiled: 0, inUse: 10 },
    { type: "towels", clean: 80, soiled: 0, inUse: 15 },
    { type: "uniforms", clean: 20, soiled: 0, inUse: 5 }
  ]);

  console.log("✅ Seeded demo data");
  console.log("Logins:");
  console.log("admin@demo.com / admin123");
  console.log("staff@demo.com / Staff@123");
  console.log("customer@demo.com / Customer@123");

  await disconnectDB();
}

run().catch(async (e) => {
  console.error(e);
  await disconnectDB();
  process.exit(1);
});
