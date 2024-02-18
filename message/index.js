const dotenv = require("dotenv");
const express = require("express");
const bodyparser = require("body-parser");
const cors = require("cors");
const connection = require("./config");
const http = require('http');
const {Server} = require('socket.io');
const Radis = require("ioredis");
const Smg = require("./model/messageModel");

dotenv.config();
const URL = process.env.MONGO_URL;
const message = express();
const server = http.createServer(message);
connection(URL);
const io = new Server(server,{
  cors:{
    origin: process.env.FRONTEND,
    credentials: true,
    methods:["GET","POST"],
  }
});

const pub = new Radis(process.env.REDIS);

const sub = new Radis(process.env.REDIS);

message.get('/',(req,res)=>{
  res.render("osm redis server")
})

io.on("connection",(socket)=>{
    sub.subscribe("MESSAGES");
    socket.on("join_room",(data)=>{
        socket.join(data);
    });
    socket.on("send_message",async (data)=>{
      await pub.publish("MESSAGES",JSON.stringify(data));
      socket.to(data.receiver).emit("receive_message",data);
    })
    socket.on("disconnect",()=>{
      return true
    });
  })
  
  sub.on('message',async(channel,data)=>{
    if(channel === 'MESSAGES'){
      const new_data = JSON.parse(data);
      const newMessage = await Smg.create(new_data);
      await newMessage.save();
    }
  })

server.listen(process.env.PORTN,()=>{
  console.log(`chat server started on the port`)
})