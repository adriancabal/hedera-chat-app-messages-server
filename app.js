const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { Client,  TopicMessageQuery } = require("@hashgraph/sdk");
let client;
require("dotenv").config();

const port = process.env.PORT || 5003;
const index = require("./routes/index");

const app = express();
app.use(index);

const server = http.createServer(app);
let topicSubscription;
const MessageType = {
    DM: 0,
    GROUP: 1,
};

const io = socketIo(server,  {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["hedera-chat-message"],
    credentials: true,
  }
});

io.on("connection", (socket) => {
    console.log(`User Connected: " ${socket.id}`);
//   console.log("New client connected");
    // hederaChatTopic(socket);

    // socket.on("join_room", (room) => {
    //     socket.join(room);
    //     console.log(`User with ID: ${socket.id} joined room: ${room}`)

    // });
    // socket.on("get_init_msg_load", (data) => {
    //     socket.join(data.user);
    //     getInitMessages(socket, data);
    //     // socket.broadcast.emit("get_init_msg_load_resp", user);
    // });
    
    socket.on("join_chat_room", (user) => {
        socket.join(user);
        console.log(`${user} joined isolated chat room`);
    });

    socket.on("send_message_dm", (data) => {
        console.log(`to: ${data.dmUser}, ${data.messageString}` );
        socket.to(data.dmUser).emit("receive_message", data.messageString);
        // socket.broadcast.emit("receive_message", data);
    });

    socket.on("get_dm_channel_messages", (data) => {
        // socket.join(data.user);
        console.log("@get_dm_channel_messages");
        getDmChannelMessages(socket, data);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected");
        if(topicSubscription){
            topicSubscription.unsubscribe();
        }
    });
});

const startTime = new Date('June 12, 2022 22:00:00');

const getInitMessages = (socket, data) => {
    console.log("getInitMessages");
    // Setup CLient
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    if (myAccountId == null ||
        myPrivateKey == null ) {
        throw new Error("Environment variables myAccountId and myPrivateKey must be present");
    }
    if(!client){
        client = Client.forTestnet();
        client.setOperator(myAccountId, myPrivateKey);
    }

    console.log("getInitMessages: data: ", data);
    const channelMap = data.channels;
    // const channelList = data.channels.map(channelObj => channelObj.channel);
    // const isChannelValid = (channel) => {
    //     for(let i = 0; i<channelList.length; i++){
    //         if(channel === channelList[i]){
    //             return true;
    //         }
    //     }
    //     return false;
    // }
    // const dataTopicId = "0.0.34717180";
    const chatMessageTopicId = "0.0.34717181";
    
    let myMessages = {};
    let seqNum = 0;
    const waitTime = 6;
    try {
        new TopicMessageQuery()
        .setTopicId(chatMessageTopicId)
        // 'May 7, 2022 10:15:30'
        // 'May 18, 2022 13:50:30'
        .setStartTime(new Date('May 23, 2022 17:25:00'))
        .setEndTime(new Date().getTime())
        // .setEndTime(new Date())
        .subscribe(client, null, (message) => {
            seqNum = message.sequenceNumber;
            setTimeout(() => {
                // console.log(`${seqNum} : ${message.sequenceNumber} `);
                if(seqNum === message.sequenceNumber){
                    // if(!hasBeenEmmited){
                    // console.log("$myMessages: ", myMessages);
                    console.log(`emit get_init_msg_load_response to ${data.user}: `, myMessages);
                    // socket.to(data.user).emit("get_init_msg_load_response", myMessages );
                    socket.emit("get_init_msg_load_response", myMessages );
                    // query.unsubscribe();
                }
            }, waitTime);
            
            
            // console.log("seqNum: " + seqNum);
            

            // let messageAsString = Buffer.from(message.contents, "utf8").toString();
            const msgObj = JSON.parse(messageAsString);
            const msgType = msgObj.type;
            const sender = msgObj.sender;
            const channel = msgObj.channel;
            const index = msgObj.index;
            const msg = msgObj.message;
            const timestamp = msgObj.timestamp
            
            let messageAsString = Buffer.from(message.contents, "utf8").toString();
            console.log(`${message.consensusTimestamp.toDate()} Received: ${messageAsString}`);

            // console.log(`${data.user}:${seqNum}: ${msg}`);
            if(msgType === MessageType.DM && channelMap[channel]){
                if(channel === 3){
                    console.log("!myMessages[channel]: ", !myMessages[channel]);
                }
                if(!myMessages[channel]){
                    console.log("channel doesn't exist yet");
                    console.log("new channel: " + channel);
                    myMessages[channel] = {
                        msgMap: {},
                        msgList: [],
                        type: MessageType.DM,
                        unread: 0,
                    };
                    myMessages[channel].msgMap[index] = {
                        timestamp: timestamp,
                        msg: msg,
                        sender: sender,
                    };
                    myMessages[channel].msgList.unshift(index);
                } 
                else {
                    myMessages[channel].msgMap[index] = {
                        timestamp: timestamp,
                        msg: msg,
                        sender: sender,
                    }
                    myMessages[channel].msgList.unshift(index);
                }
                console.log("myMessages ", myMessages);
                // if(!myMessages[channel].msgMap[index]) {
                //     myMessages[channel].msgMap[index] = {
                //         timestamp: timestamp,
                //         msg: msg,
                //         sender: sender,
                //     }
                //     // console.log("index: " + index);
                //     myMessages[channel].msgList.unshift(index);
                // }
                
                // setMyMessages(_myMessages);
                
            }
            
        });
    }
    catch(err){
        console.log("err!: ", err);
    }
  }

  const getDmChannelMessages = (socket, data) => {
    console.log("getDmChannelMessages");
    // Setup CLient
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    if (myAccountId == null ||
        myPrivateKey == null ) {
        throw new Error("Environment variables myAccountId and myPrivateKey must be present");
    }
    if(!client){
        client = Client.forTestnet();
        client.setOperator(myAccountId, myPrivateKey);
    }

    console.log("getDmChannelMessages: data: ", data);
    const dmChannel= data.channel;
    const chatMessageTopicId = "0.0.34717181";
    
    let dmChannelMessages = {};
    let seqNum = 0;
    const waitTime = 4;
    try {
        let query = new TopicMessageQuery()
        .setTopicId(chatMessageTopicId)
        // 'May 7, 2022 10:15:30'
        // 'May 18, 2022 13:50:30'
        // .setStartTime(new Date('May 23, 2022 17:25:00'))
        .setStartTime(startTime)
        // .setStartTime(new Date('June 6, 2022 17:25:00'))
        .setEndTime(new Date().getTime())
        // .setEndTime(new Date())
        .subscribe(client, null, (message) => {
            
            setTimeout(() => {
                // console.log(`${seqNum} : ${message.sequenceNumber} `);
                if(seqNum === message.sequenceNumber){
                    // if(!hasBeenEmmited){
                    // console.log("$myMessages: ", myMessages);
                    console.log(`emit getDmChannelMessagesResponse ${data.user}: `, dmChannelMessages);
                    // socket.to(data.user).emit("get_init_msg_load_response", myMessages );
                    socket.emit("getDmChannelMessagesResponse", dmChannelMessages );
                    setTimeout(() => {
                        query.unsubscribe();
                    }, 50);
                    // query.unsubscribe();
                }
            }, waitTime);
            
            // console.log("seqNum: " + seqNum);
            

            let messageAsString = Buffer.from(message.contents, "utf8").toString();
            const msgObj = JSON.parse(messageAsString);
            const msgType = msgObj.type;
            const sender = msgObj.sender;
            const channel = msgObj.channel;
            const index = msgObj.index;
            const msg = msgObj.message;
            const timestamp = msgObj.timestamp
            console.log(`${message.consensusTimestamp.toDate()} Received: ${messageAsString}`);

            // console.log(`${data.user}:${seqNum}: ${msg}`);

            if(msgType === MessageType.DM){
                // if(channel === 3){
                //     console.log("!myMessages[channel]: ", !myMessages[channel]);
                // }
                console.log("dmChannel: " + dmChannel);
                if(channel === dmChannel && !dmChannelMessages[index]){
                    dmChannelMessages[index] = {
                        timestamp: timestamp,
                        msg: msg,
                        sender: sender,
                    }
                }
            }

            seqNum = message.sequenceNumber;
            
        });

        // setTimeout(() => {
        //         query.unsubscribe();
        // }, 250);
    }
    catch(err){
        console.log("err!: ", err);
    }
  }

// const hederaChatTopic = (socket) => {
//     // Setup CLient
//     const myAccountId = process.env.MY_ACCOUNT_ID;
//     const myPrivateKey = process.env.MY_PRIVATE_KEY;

//     if (myAccountId == null ||
//         myPrivateKey == null ) {
//         throw new Error("Environment variables myAccountId and myPrivateKey must be present");
//     }

//     if(!client){
//         client = Client.forTestnet();
//         client.setOperator(myAccountId, myPrivateKey);
//     }
//     // const dataTopicId = "0.0.34717180";
//     const chatMessageTopicId = "0.0.34717181";
//     try {
//         topicSubscription = new TopicMessageQuery()
//         .setTopicId(chatMessageTopicId)
//         // 'May 7, 2022 10:15:30'
//         // 'May 18, 2022 13:50:30'
//         .setStartTime(new Date('May 23, 2022 17:25:00'))
//         .setEndTime(new Date())
//         .subscribe(client, null, (message) => {
//             let messageAsString = Buffer.from(message.contents, "utf8").toString();
//             console.log("ChatMessage: ", messageAsString);
//             socket.broadcast.emit("ChatMessages", message);
//             // socket.emit("ChatMessages", messageAsString);
//             // console.log(`${message.consensusTimestamp.toDate()} Received: ${messageAsString}`);
//         });
//     }
//     catch(err){
//         console.log("err!: ", err);
//     }
//   }


server.listen(port, () => console.log(`Listening on port ${port}`));