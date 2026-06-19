const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3000 });

let rooms = []; // 房间池

function rand(){
  return Math.floor(Math.random()*13)+1;
}

// 创建房间
function createRoom(){
  return {
    players: [],
    cards: {},
    started: false
  };
}

// 发牌
function deal(room){
  let cards = {};

  room.players.forEach(p=>{
    cards[p.id] = [rand(),rand(),rand()];
  });

  return cards;
}

// 广播
function broadcast(room,msg){
  room.players.forEach(p=>{
    if(p.ws.readyState === 1){
      p.ws.send(JSON.stringify(msg));
    }
  });
}

// 找房间
function findRoom(){
  let room = rooms.find(r => r.players.length < 6 && !r.started);

  if(!room){
    room = createRoom();
    rooms.push(room);
  }

  return room;
}

wss.on("connection",(ws)=>{

  let room = findRoom();

  let player = {
    id: room.players.length,
    ws,
    fold:false
  };

  room.players.push(player);

  ws.send(JSON.stringify({
    type:"join",
    id: player.id
  }));

  console.log("玩家加入:", player.id);

  // 满6人开局
  if(room.players.length === 6){

    room.started = true;
    room.cards = deal(room);

    broadcast(room,{
      type:"deal",
      cards: room.cards
    });

    console.log("游戏开始");
  }

  ws.on("message",(msg)=>{

    let data = JSON.parse(msg);

    // 弃牌
    if(data.type === "fold"){
      player.fold = true;
    }

    // 结算
    if(data.type === "showdown"){

      let best = -1;
      let winner = 0;

      room.players.forEach(p=>{
        if(p.fold) return;

        let c = room.cards[p.id];
        let s = c.reduce((a,b)=>a+b,0);

        if(s > best){
          best = s;
          winner = p.id;
        }
      });

      broadcast(room,{
        type:"result",
        winner
      });

      // 清空房间
      room.players = [];
      room.started = false;
    }

  });

});

console.log("🚀 云服务器启动 ws://localhost:3000");