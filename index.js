const express=require('express');
const app=express();
const cors=require('cors');
const jwt=require('jsonwebtoken');
const cloudinary=require('cloudinary').v2;
require('dotenv').config()
const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY)
const port=process.env.PORT || 5000;
const fileUpload=require('express-fileupload');
app.use(fileUpload({
    useTempFiles:true
}))

app.use(cors());
app.use(express.json());




 cloudinary.config({
    cloud_name: `${process.env.CLOUD_NAME}`,
    api_key: `${process.env.API_KEY}`,
    api_secret: `${process.env.API_SECRET}`,
  });


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4qnhmwc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const petCollection=client.db("PetAdoption").collection("Pet");
    const categoryCollection=client.db("PetAdoption").collection("Category");
    const campaignCollection=client.db("PetAdoption").collection("Campaign");
    const paymentCollection=client.db("PetAdoption").collection("Payment");
    const userCollection2=client.db("PetAdoption").collection("Users");


    app.post('/',(req,res,next)=>{
        console.log(req.body);
        const file=req.files.photo;
        cloudinary.uploader.uploadFile.tempFilePath,(err,result)=>{
            console.log(result);
        }
    })

    app.post('/jwt',async(req,res)=>{
        const user=req.body;
        const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
            expiresIn:'1h'
        });
        res.send({token});
    })

    const verifyToken=(req,res,next)=>{
        console.log('inside verify token',req.headers.authorization);
        if(!req.headers.authorization){
            return res.status(401).send({message:'forbidden access'});
        }
        const token=req.headers.authorization.split(' ')[1];
        jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
            if(err){
                return res.status(401).send({message:'Forbidden access'})
            }
            req.decoded=decoded;
            next();
        })
    }

    const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await userCollection2.findOne(query);
        const isAdmin = user?.role === true;
        if (!isAdmin) {
          return res.status(403).send({ message: 'forbidden access' });
        }
        next();
      }

      app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
        const result = await userCollection2.find().toArray();
        res.send(result);
      });

      

      

    app.post('/users',async(req,res)=>{
        const user=req.body;
        const query={email:user.email};
        const existingUser=await userCollection2.findOne(query);
        if(existingUser){
            return res.send({message:'user already exists',insertedId:null})
        }
        const result=await userCollection2.insertOne(user);
        res.send(result);
    })

    app.get('/pet',async(req,res)=>{
        const result=await petCollection.find().toArray();
        res.send(result);
    })

    app.get('/Pet/:id',async(req,res)=>{
        const id=req.params.id;
        const query={_id:new ObjectId(id)}
        const result=await petCollection.find(query).toArray();
        res.send(result);
    })

    app.put("/Pet/:id",async(req,res)=>{
        const id=req.params.id;
        const filter={_id:new ObjectId(id)}
        const options={upsert:true};
        const updatedProduct=req.body;
        const product={
          $set:{
            PetImage:updatedProduct.PetImage,
            PetName:updatedProduct.PetName,
            PetLocation:updatedProduct.PetLocation,
            PetAge:updatedProduct.PetAge,
            PetCategory:updatedProduct.PetCategory,
            ShortDescription:updatedProduct.ShortDescription,
            LongDescription:updatedProduct.LongDescription,
            DateOfUpdation:updatedProduct.DateOfUpdation,
            TimeOfUpdation:updatedProduct.TimeOfUpdation
          }
        }
        const result=await petCollection.updateOne(filter,product,options);
        res.send(result);
      })

    app.get('/category',async(req,res)=>{
        const result=await categoryCollection.find().toArray();
        res.send(result);
    })
    app.get('/campaign',async(req,res)=>{
        const result=await campaignCollection.find().toArray();
        res.send(result);
    })

    app.post('/create-payment-intent',async(req,res)=>{
        const {donatedAmount}=req.body;
        const amount=parseInt(donatedAmount*100);
        const paymentIntent=await stripe.paymentIntents.create({
            amount:amount,
            currency:'inr',
            payment_method_types:['card']
        });
        res.send({
            clientSecret: paymentIntent.client_secret
        })

    })

    app.post("/addPet", async (req, res) => {
        const user = req.body;
        console.log(user);
        const result = await petCollection.insertOne(user);
        console.log(result);
        res.send(result);
      });

      app.post("/createCampaign", async (req, res) => {
        const user = req.body;
        console.log(user);
        const result = await campaignCollection.insertOne(user);
        console.log(result);
        res.send(result);
      }); 

    app.post('/payments',async(req,res)=>{
        const payment=req.body;
        const paymentResult=await paymentCollection.insertOne(payment);
        console.log('payment info',payment);
        res.send(paymentResult);
    })

    

    app.get('/payment/:email',async(req,res)=>{
        const query={email:req.params.email}
        const result=await paymentCollection.find(query).toArray();
        res.send(result);
    })
    app.get('/Pets',async(req,res)=>{
        const query={email:req.query.email}
        const result=await petCollection.find(query).toArray();
        res.send(result);
    })
    app.get('/AllPets',async(req,res)=>{
        
        const result=await petCollection.find().toArray();
        res.send(result);
    })

    app.delete('/Pets/:id',async(req,res)=>{
        const id=req.params.id;
        const query={_id:new ObjectId(id)}
        const result=await petCollection.deleteOne(query);
        res.send(result);
    })
    app.delete('/Campaigns/:id',async(req,res)=>{
        const id=req.params.id;
        const query={_id:new ObjectId(id)}
        const result=await campaignCollection.deleteOne(query);
        res.send(result);
    })

    app.patch('/Pets/adopted/:id',async(req,res)=>{
        const id=req.params.id;
        const filter={_id: new ObjectId(id)};
        const updatedDoc={
            $set:{
                Adopted: Boolean(1)
            }
        }
        const result=await petCollection.updateOne(filter,updatedDoc);
        res.send(result);
    })
    app.patch('/Campaigns/running/:id',async(req,res)=>{
        const id=req.params.id;
        const filter={_id: new ObjectId(id)};
        const updatedDoc={
            $set:{
                CampaignStatus: Boolean(1)
            }
        }
        const result=await campaignCollection.updateOne(filter,updatedDoc);
        res.send(result);
    })
    app.patch('/Campaigns/paused/:id',async(req,res)=>{
        const id=req.params.id;
        const filter={_id: new ObjectId(id)};
        const updatedDoc={
            $set:{
                CampaignStatus: Boolean(0)
            }
        }
        const result=await campaignCollection.updateOne(filter,updatedDoc);
        res.send(result);
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: Boolean(1)
          }
        }
        const result = await userCollection2.updateOne(filter, updatedDoc);
        res.send(result);
      })

      app.get('/users/admin/:email', verifyToken, async (req, res) => {
        const email = req.params.email;
  
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: 'forbidden access' })
        }
        const query = { email: email };
        const user = await userCollection2.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === true;
        }
        res.send({ admin });
      })

    app.get('/payments',async(req,res)=>{
        const email=req.query.email;
        const query={email:email};
        const result=await paymentCollection.find(query).toArray();
    })

    const userCollection = client.db("PetAdoption").collection("UserDetails");
    app.post("/userDetails", async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await userCollection.insertOne(user);
      console.log(result);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('server is running')
})

app.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
})