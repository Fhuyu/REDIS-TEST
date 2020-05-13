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

let battles = null
let fetching = false
let lastFecthTime = null
let offset = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950] //, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950

setInterval( async() => { 
    console.log("Hello"); 

    lastFecthTime = battles ? Math.abs(new Date() - new Date(battles.headers.date)) : null
    let minutes = lastFecthTime ? Math.floor((lastFecthTime/1000)/60) : null

    console.log('minutes -----------', minutes)
    console.log('fetching---', fetching)

    if ((minutes === null && !fetching) || (minutes >= 1 && !fetching)) {

      fetching = true
      
      let fetchDone = 0
      try {
      offset.forEach( async (value) => {
        console.log(value)
        let url = `https://gameinfo.albiononline.com/api/gameinfo/battles?limit=50&sort=recent&offset=${value}`
        console.log(fetching)

        battles = await axios.get(url, { timeout: 300000 }) // battles = last fetched. Fix ?
        console.log('date :', new Date())
        console.log(new Date(battles.headers.date))

        let battlesData = battles.data;
        fetchDone += 1
        //add data to Redis
        redis_client.setex(`battle-${value}`, 1200, JSON.stringify(battlesData)); // 20m
        console.log('cache set interval', value)
        console.log('fetchdone ------', fetchDone)
          if (fetchDone === offset.length) {
            fetching = false
          }
          console.log(fetching)
      })
    } catch {
      fetchDone += 1
      if (fetchDone === offset.length) {
        fetching = false
      }
      console.log(fetching)

    }
      

    } else {
      console.log('skip')
    }
}, 10000);

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