const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
var cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();

require("dotenv").config();
const port = 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://sharebite-9ad0a.web.app",
      "https://sharebite-9ad0a.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xgh8h2c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    const foodCollection = client.db("shareBite").collection("food");
    const userCollection = client.db("shareBite").collection("user");
    const foodRequestCollection = client
      .db("shareBite")
      .collection("foodRequest");
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("token", token, cookieOptions).send({ success: true });
    });
    app.post("/logout", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });
    // service related apis
    app.get("/foods", async (req, res) => {
      const email = req.query.email;
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);

      if (email) {
        // If an email query parameter is provided, filter by email
        const query = { donatorEmail: email };
        const result = await foodCollection
          .find(query)
          .skip(page * size)
          .limit(size)
          .toArray();
        res.send(result);
      } else {
        // Otherwise, return all foods
        const result = await foodCollection
          .find()
          .skip(page * size)
          .limit(size)
          .toArray();
        res.send(result);
      }
    });

    app.get("/featured-foods", async (req, res) => {
      const result = await foodCollection.find().skip(0).limit(3).toArray();
      res.send(result);
    });

    app.get("/foodCountAll", async (req, res) => {
      const count = await foodCollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.get("/foodCount", async (req, res) => {
      const email = req.query.email;
      const query = { donatorEmail: email };
      const count = await foodCollection.countDocuments(query);
      res.send({ count });
    });
    app.get("/foodCount/request", async (req, res) => {
      const email = req.query.email;
      const query = { claimedBy: email };
      const count = await foodCollection.countDocuments(query);
      res.send({ count });
    });
    app.get("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });
    app.post("/foods", async (req, res) => {
      const food = req.body;
      // console.log(food);
      const result = await foodCollection.insertOne(food);
      res.send(result);
    });
    app.put("/foods/:id", async (req, res) => {
      const food = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          foodName: food.foodName,
          foodImage: food.foodImage,
          foodQuantity: food.foodQuantity,
          pickupLocation: food.pickupLocation,
          expiredDate: food.expiredDate,
          additionalNotes: food.additionalNotes,
          donatorImage: food.donatorImage,
          donatorEmail: food.donatorEmail,
          foodStatus: food.foodStatus,
        },
      };
      const result = await foodCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });
    app.patch("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const food = req.body;
      const updateDoc = {
        $set: {
          foodStatus: food.foodStatus,
          claimedBy: food.claimedBy,
        },
      };
      const result = await foodCollection.updateOne(
        { _id: new ObjectId(id) },
        updateDoc
      );
      res.send(result);
    });
    app.delete("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/food-requests", async (req, res) => {
      const result = await foodRequestCollection.find().toArray();
      res.send(result);
    });
    app.get("/food-requests/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodRequestCollection.findOne(query);
      res.send(result);
    });
    app.get("/my-claimed-foods", async (req, res) => {
      const email = req.query.email;
      const query = { claimedBy: email };
      const result = await foodCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/food-requests", async (req, res) => {
      const foodRequest = req.body;
      const result = await foodRequestCollection.insertOne(foodRequest);
      res.send(result);
    });
    app.put("/food-requests/:id", async (req, res) => {
      const filter = { _id: new ObjectId(req.params.id) };
      const foodRequest = req.body;
      const updateDoc = {
        $set: {
          foodName: foodRequest.foodName,
          quantity: foodRequest.quantity,
          location: foodRequest.location,
          pickupTime: foodRequest.pickupTime,
          specialInstructions: foodRequest.specialInstructions,
        },
      };
      const result = await foodRequestCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Share bite server is running!");
});

app.listen(port, () => {
  console.log(`Share bite server app listening on port ${port}`);
});
