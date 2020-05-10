//set up dependencies
const express = require("express");
const redis = require("redis");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require('cors') // https://github.com/expressjs/cors
// const CircularJSON = require('circular-json'); // https://www.npmjs.com/package/circular-json


//setup port constants
const port_redis = process.env.PORT || 6379;
const port = process.env.PORT || 5000;

//configure redis client on port 6379
const redis_client = redis.createClient(port_redis);

//configure express server
const app = express();

//Body Parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

setInterval( async() => { 
    console.log("Hello"); 
    let url = `https://gameinfo.albiononline.com/api/gameinfo/battles?limit=50&sort=recent&offset=0`

    const starShipInfo = await axios.get(url, { timeout: 60000 })
    const starShipInfoData = starShipInfo.data;

    //add data to Redis
    redis_client.setex('battles', 300, JSON.stringify(starShipInfoData)); // 5m
    console.log('cache set interval')
}, 6000);

//Middleware Function to Check Cache
checkCache = (req, res, next) => {
  
    redis_client.get('battles', (err, data) => {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      }
      //if no match found
      if (data != null) {
          console.log('cache found')
        res.send(data);
      } else {
        //proceed to next middleware function
        next();
      }
    });
  };


app.get('/battles/:offset', cors(), checkCache, async (req, res) => {
    try {
    let url = `https://gameinfo.albiononline.com/api/gameinfo/battles?limit=50&sort=recent&offset=${req.params.offset}`
    const starShipInfo = await axios.get(url, { timeout: 60000 })
    const starShipInfoData = starShipInfo.data;

    //add data to Redis
    redis_client.setex('battles', 300, JSON.stringify(starShipInfoData));
    console.log('cache set')

    return res.json(starShipInfoData);

    } catch (error) {
        console.log(error);
        return res.status(404).send({ success: false, message: error.message });

      }
});

//listen on port 5000;
app.listen(port, () => console.log(`Server running on Port ${port}`));