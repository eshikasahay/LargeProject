const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const hashPass = require('password-hash');

// const path = require("path");
// const PORT = process.env.PORT || 5000;
// require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.set('port', (process.env.PORT || 5000));

const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb+srv://group23:letsgetthisbread@cluster0.3dn4j.mongodb.net/LetsCWhatYouKnow?retryWrites=true&w=majority';

const client = new MongoClient(url);
client.connect();


app.post('/api/login', async (req, res, next) =>
{
    var error = '';

    const { login, password } = req.body;

    const db = client.db();

    const result = await db.collection('Users').find({
        UserName: login.toLowerCase()
    }).toArray();
    
    var fn = '';
    var ln = '';
    var email = '';
    var valid = false;

    if (result.length > 0 && hashPass.verify(password, result[0].Password))
    {
        fn = result[0].FirstName;
        ln = result[0].LastName;
        email = result[0].Email;
        valid = result[0].Validated;
    }

    var ret = {
        firstName: fn,
        lastName: ln,
        Email: email,
        Validated: valid,
        error: ''
    };

    res.status(200).json(ret);
});

app.post('/api/Register', async (req, res, next) =>
{
    var error = '';

    const { firstname, lastname, email, login, password } = req.body;
    var hashedPass = hashPass.generate(password);

    const user = {
        FirstName: firstname,
        LastName: lastname,
        Email: email,
        UserName: login.toLowerCase(),
        Password: hashedPass,
        Notes: "",
        Validated: false
    }

    try {
      const db = client.db();
      const result = await db.collection('Users').insertOne(user);

      // using Twilio SendGrid's v3 Node.js Library
      // https://github.com/sendgrid/sendgrid-nodejs
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      const msg = {
        to: email, // Change to your recipient
        from: 'letscwhatyouknow@gmail.com', // Change to your verified sender
        subject: 'Please Verify Your Email!',
        text: 'and easy to do anywhere, even with Node.js',
        html: '<a href="http://localhost:3000/VerifyEmail/"<strong><button type="button">Click Me To Verify Account!</button></strong>',
      }
      sgMail
        .send(msg)
        .then(() => {
          console.log('Email sent')
        })
        .catch((error) => {
          console.error(error)
        })
    }
    catch(e) {
      error = "Email/Username already in use";
    }

    var ret = { error: error };
    res.status(200).json(ret);
});

app.post('/api/findQuestions', async (req, res, next) =>
{
    var error = '';
    var numQuestionsToSend = 1;
    const { difficulty } = req.body;
    var _search = parseInt(difficulty);

    try{
      const db = client.db();
      const results = await db.collection('Questions').find({
          Difficulty: _search
      }).toArray();
      
      var _ret = [];
      var length = results.length;
      
      if(length<numQuestionsToSend)
      {
        error.push("Not enough questions");
      }
      else
      {
        var rand;
        for(var i=0; i<numQuestionsToSend; i++)
        {
          rand = Math.floor(Math.random() * Math.floor(length));
          _ret.push(results[rand]);
          // console.log(_ret);
        }
      }
    }
    catch(e){
      error=e.toString();
    }
    
    // var ret = { results: _ret, error: error };
    res.status(200).json(_ret);
});

app.post('/api/verifyEmail', async (req, res, next) =>
{
    var error = '';
    const { login, password } = req.body;
    
    const db = client.db();
    
    const result = await db.collection('Users').find({
      UserName: login.toLowerCase()
    }).toArray();
    
    var fn = '';
    var ln = '';
    var email = '';

    if (result.length > 0 && hashPass.verify(password, result[0].Password))
    {
        fn = result[0].FirstName;
        ln = result[0].LastName;
        email = result[0].Email;

        var query = 
        { 
            UserName: login
        };

        var newValues = 
        {
            $set:
            {
                Validated : true
            }
        };

        var modify = await db.collection('Users').updateOne(query,newValues);
    }

    var ret = 
    {
      firstName: fn,
      lastName: ln,
      Email: email,
      error: error
    };
    console.log(ret);

    res.status(200).json(ret);
});

app.use((req, res, next) => 
{
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, DELETE, OPTIONS'
  );
  next();
});

app.listen(5000); // start Node + Express server on port 5000

// app.listen(PORT, () =>
// {
//   console.log(`Server listening on port ${PORT}.`);
// });