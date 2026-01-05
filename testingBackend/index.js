const express = require('express');

const cors = require('cors');

const app = express();

// app.use(express.json());
app.use(cors({
    origin: ["http://localhost:5173", "https://solanapaymentsstripe.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-wallet-address"],
    credentials: true,
  }));

//   app.andklfa(/kdf)


app.post('/webhook',
    express.raw({ type: 'application/json' }),
    (req, res) => {
    console.log('Webhook received');
    console.log(req.body);

    res.status(200).send('Webhook received');
})


app.listen(3001,()=> {
    console.log('Server is running on port 3001');
})