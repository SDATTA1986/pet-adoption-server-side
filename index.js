const express=require('express');
const app=express();
const cors=require('cors');
require('dotenv').config()
const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY)
const port=process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
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