const express = require('express');


const app = express();

app.use(express.json());
app.post('/webhook', (req, res) => {
    console.log('Webhook received');
    console.log(req.body);

    res.status(200).send('Webhook received');
})


app.listen(3001,()=> {
    console.log('Server is running on port 3001');
})