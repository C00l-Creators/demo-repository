const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const goldEl=document.getElementById('gold');
const livesEl=document.getElementById('lives');
const waveEl=document.getElementById('wave');
const statusEl=document.getElementById('status');
const startButton=document.getElementById('start-wave');
const towerList=document.getElementById('tower-list');
const path=[[-30,470],[120,470],[120,330],[330,330],[330,180],[565,180],[565,410],[760,410],[760,250],[990,250]];

// Twenty-four unlock-free defenses with different prices and combat specialties.
const types={
  pulse:{name:'Pulse',icon:'◆',cost:100,range:115,damage:12,rate:22,color:'#72f1ff',shot:6,desc:'Fast starter'},
  cannon:{name:'Cannon',icon:'⬢',cost:160,range:145,damage:38,rate:58,color:'#ffb84d',shot:9,desc:'Heavy impact',splash:35},
  frost:{name:'Frost',icon:'✦',cost:130,range:125,damage:7,rate:34,color:'#9fafff',shot:5,desc:'Chills enemies',slow:.5},
  rail:{name:'Railgun',icon:'➤',cost:350,range:205,damage:105,rate:78,color:'#ff70df',shot:11,desc:'Long-range punch'},
  minigun:{name:'Minigun',icon:'▤',cost:220,range:105,damage:5,rate:6,color:'#ffcf56',shot:4,desc:'Extreme fire rate'},
  sniper:{name:'Sniper',icon:'⌖',cost:280,range:250,damage:92,rate:86,color:'#c2f970',shot:8,desc:'Very long range'},
  flame:{name:'Flamethrower',icon:'♨',cost:240,range:82,damage:4,rate:8,color:'#ff704d',shot:8,splash:29,desc:'Close-range burn'},
  tesla:{name:'Tesla Coil',icon:'ϟ',cost:310,range:130,damage:24,rate:38,color:'#bb85ff',shot:7,splash:48,desc:'Arcing area damage'},
  mortar:{name:'Mortar',icon:'◉',cost:330,range:190,damage:58,rate:78,color:'#ff9d59',shot:10,splash:58,desc:'Big splash shells'},
  venom:{name:'Venom Spitter',icon:'☣',cost:210,range:120,damage:9,rate:28,color:'#79e86b',shot:6,slow:.72,desc:'Toxic slow'},
  laser:{name:'Laser',icon:'━',cost:390,range:175,damage:28,rate:15,color:'#ff557a',shot:8,desc:'Rapid beam shots'},
  bee:{name:'Drone Hive',icon:'✿',cost:270,range:145,damage:13,rate:17,color:'#f5e663',shot:5,desc:'Swarm of drones'},
  shatter:{name:'Shatter Cannon',icon:'❄',cost:360,range:135,damage:45,rate:48,color:'#8ee8ff',shot:9,splash:40,slow:.8,desc:'Explosive ice'},
  plasma:{name:'Plasma',icon:'●',cost:420,range:155,damage:54,rate:49,color:'#ff63e6',shot:10,splash:24,desc:'Hot plasma burst'},
  repeater:{name:'Repeater',icon:'»',cost:185,range:120,damage:10,rate:13,color:'#68ffd0',shot:5,desc:'Balanced rapid fire'},
  guardian:{name:'Guardian',icon:'✚',cost:460,range:165,damage:32,rate:26,color:'#a0b6ff',shot:8,desc:'Reliable all-rounder'},
  shockwave:{name:'Shockwave',icon:'◎',cost:510,range:110,damage:28,rate:42,color:'#ff89aa',shot:11,splash:72,slow:.8,desc:'Huge blast radius'},
  accelerator:{name:'Accelerator',icon:'⇢',cost:560,range:220,damage:38,rate:12,color:'#79d8ff',shot:8,desc:'Fast long-range fire'},
  sun:{name:'Solar Array',icon:'☀',cost:620,range:150,damage:76,rate:58,color:'#ffe46b',shot:10,splash:35,desc:'Radiant blast'},
  void:{name:'Void Siphon',icon:'◌',cost:700,range:170,damage:65,rate:45,color:'#bd72ff',shot:11,splash:42,desc:'Heavy void damage'},
  cryo:{name:'Cryo Launcher',icon:'❉',cost:490,range:160,damage:18,rate:31,color:'#7cf4ff',shot:8,slow:.32,desc:'Deep freeze'},
  meteor:{name:'Meteor',icon:'☄',cost:780,range:180,damage:120,rate:94,color:'#ff795e',shot:13,splash:70,desc:'Massive slow blast'},
  prism:{name:'Prism',icon:'◇',cost:850,range:195,damage:43,rate:18,color:'#ff8afa',shot:7,splash:30,desc:'Prismatic rapid fire'},
  omega:{name:'OMEGA Core',icon:'★',cost:1200,range:235,damage:175,rate:53,color:'#ffffff',shot:14,splash:64,desc:'Ultimate defense'}
};
let coins=300,lives=100,wave=1,enemies=[],towers=[],shots=[],selected='pulse';
let running=false,paused=false,gameOver=false,spawnLeft=0,spawnTimer=0,bossPending=false,bossTimer=0;
let mouse={x:0,y:0};

function point(t){const scaled=Math.max(0,t)*(path.length-1),i=Math.min(path.length-2,Math.floor(scaled)),f=scaled-i;return{x:path[i][0]+(path[i+1][0]-path[i][0])*f,y:path[i][1]+(path[i+1][1]-path[i][1])*f}}
function canBuild(x,y){if(y<55||y>545)return false;for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));if(Math.hypot(x-(a[0]+t*dx),y-(a[1]+t*dy))<38)return false}return true}

function buildShop(){
  towerList.innerHTML='';
  for(const [id,spec] of Object.entries(types)){
    const button=document.createElement('button');
    button.className=`tower-card${id===selected?' selected':''}`;
    button.dataset.type=id;
    button.style.setProperty('--tower-color',spec.color);
    button.innerHTML=`<span class="icon">${spec.icon}</span><span><strong>${spec.name}</strong><small>${spec.desc} · ${spec.cost} coins</small></span>`;
    button.addEventListener('click',()=>selectTower(id));
    towerList.appendChild(button);
  }
}
function selectTower(id){selected=id;document.querySelectorAll('.tower-card').forEach(button=>button.classList.toggle('selected',button.dataset.type===id));statusEl.textContent=`${types[id].name} selected (${types[id].cost} coins). Click open terrain to place it.`}
function updateUI(){goldEl.textContent=coins;livesEl.textContent=lives;waveEl.textContent=wave}

canvas.addEventListener('mousemove',event=>{const rect=canvas.getBoundingClientRect();mouse.x=(event.clientX-rect.left)*canvas.width/rect.width;mouse.y=(event.clientY-rect.top)*canvas.height/rect.height});
canvas.addEventListener('click',()=>{
  if(gameOver)return;
  if(!canBuild(mouse.x,mouse.y)){statusEl.textContent='Cannot build on the enemy route.';return}
  if(towers.some(t=>Math.hypot(t.x-mouse.x,t.y-mouse.y)<44)){statusEl.textContent='Defense slot occupied.';return}
  const spec=types[selected];
  if(coins<spec.cost){statusEl.textContent=`Not enough coins. ${spec.name} costs ${spec.cost}.`;return}
  coins-=spec.cost;towers.push({type:selected,x:mouse.x,y:mouse.y,cool:0,angle:-Math.PI/2});updateUI();
});
startButton.addEventListener('click',()=>{
  if(running||gameOver)return;
  running=true;spawnLeft=5+wave*2;spawnTimer=0;bossPending=wave%10===0;bossTimer=0;startButton.disabled=true;
  statusEl.textContent=bossPending?`Wave ${wave}: boss signal detected!`:`Wave ${wave} incoming`;
});
document.getElementById('pause').addEventListener('click',event=>{if(gameOver)return;paused=!paused;event.currentTarget.textContent=paused?'▶ RESUME':'Ⅱ PAUSE'});

function spawnEnemy(isBoss=false){const hp=(48+wave*18)*(isBoss?12:1);enemies.push({t:0,x:path[0][0],y:path[0][1],hp,maxHp:hp,speed:isBoss?.0019:.0038+wave*.00012,slow:1,radius:isBoss?25:12,isBoss,color:isBoss?'#ff4d9d':'#ff7a91'})}
function damageEnemy(enemy,damage){if(!enemies.includes(enemy))return;enemy.hp-=damage;if(enemy.hp<=0){const reward=enemy.isBoss?250+wave*10:15+Math.floor(wave/3);coins+=reward;if(enemy.isBoss)statusEl.textContent=`BOSS DEFEATED! +${reward} coins`;enemies=enemies.filter(item=>item!==enemy);updateUI()}}
function hitEnemy(target,damage,splash,slow){
  const victims=splash?enemies.filter(enemy=>Math.hypot(enemy.x-target.x,enemy.y-target.y)<=splash):[target];
  for(const enemy of victims){damageEnemy(enemy,enemy===target?damage:Math.ceil(damage*.55));if(enemies.includes(enemy)&&slow<1)enemy.slow=Math.min(enemy.slow,slow)}
}
function update(){
  if(paused||gameOver)return;
  if(running&&spawnLeft>0&&++spawnTimer>=40){spawnTimer=0;spawnLeft--;spawnEnemy()}
  if(running&&spawnLeft===0&&bossPending&&enemies.length===0&&++bossTimer>50){spawnEnemy(true);bossPending=false;statusEl.textContent=`BOSS INCOMING — wave ${wave}!`}
  for(const enemy of enemies){enemy.t+=enemy.speed*enemy.slow;enemy.slow+=(1-enemy.slow)*.035;const p=point(enemy.t);enemy.x=p.x;enemy.y=p.y}
  for(let i=enemies.length-1;i>=0;i--)if(enemies[i].t>=1){lives-=enemies[i].isBoss?12:1;enemies.splice(i,1);if(lives<=0){lives=0;gameOver=true;running=false;statusEl.textContent='CORE DESTROYED — refresh to restart';startButton.disabled=true}}
  for(const tower of towers){tower.cool--;let target=null,furthest=-1;for(const enemy of enemies)if(Math.hypot(enemy.x-tower.x,enemy.y-tower.y)<types[tower.type].range&&enemy.t>furthest){target=enemy;furthest=enemy.t}if(target&&tower.cool<=0){const spec=types[tower.type];shots.push({x:tower.x,y:tower.y,target,speed:tower.type==='rail'||tower.type==='sniper'||tower.type==='accelerator'?18:14,color:spec.color,damage:spec.damage,slow:spec.slow||1,splash:spec.splash||0,radius:spec.shot});tower.cool=spec.rate;tower.angle=Math.atan2(target.y-tower.y,target.x-tower.x)}}
  for(let i=shots.length-1;i>=0;i--){const shot=shots[i],target=shot.target;if(!enemies.includes(target)){shots.splice(i,1);continue}const dx=target.x-shot.x,dy=target.y-shot.y,distance=Math.hypot(dx,dy);if(distance<shot.speed+target.radius){hitEnemy(target,shot.damage,shot.splash,shot.slow);shots.splice(i,1)}else{shot.x+=dx/distance*shot.speed;shot.y+=dy/distance*shot.speed}}
  if(running&&spawnLeft===0&&!bossPending&&enemies.length===0){running=false;const bonus=50+wave*10;coins+=bonus;statusEl.textContent=`Sector secured. +${bonus} wave bonus. Wave ${wave+1} ready.`;wave++;startButton.disabled=false}
  updateUI();
}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#091423';ctx.fillRect(0,0,960,600);ctx.strokeStyle='#1b2b43';ctx.lineWidth=2;
  for(let x=0;x<960;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,600);ctx.stroke()}for(let y=0;y<600;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke()}
  ctx.strokeStyle='#263956';ctx.lineWidth=68;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(path[0][0],path[0][1]);path.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));ctx.stroke();ctx.strokeStyle='#304963';ctx.lineWidth=2;ctx.setLineDash([12,14]);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#72f1ff';ctx.beginPath();ctx.arc(path[0][0]+10,path[0][1],12,0,7);ctx.fill();ctx.fillStyle='#ff4d9d';ctx.fillRect(930,215,30,70);
  for(const tower of towers){const spec=types[tower.type];ctx.save();ctx.translate(tower.x,tower.y);ctx.fillStyle='#101b2c';ctx.beginPath();ctx.arc(0,0,22,0,7);ctx.fill();ctx.strokeStyle=spec.color;ctx.lineWidth=3;ctx.stroke();ctx.rotate(tower.angle);ctx.fillStyle=spec.color;ctx.fillRect(0,-4,30,8);ctx.restore()}
  for(const enemy of enemies){ctx.fillStyle='#070b14';ctx.beginPath();ctx.arc(enemy.x,enemy.y,enemy.radius+4,0,7);ctx.fill();ctx.fillStyle=enemy.color;ctx.beginPath();ctx.arc(enemy.x,enemy.y,enemy.radius,0,7);ctx.fill();const w=enemy.radius*2;ctx.fillStyle='#401c32';ctx.fillRect(enemy.x-enemy.radius,enemy.y-enemy.radius-9,w,4);ctx.fillStyle=enemy.isBoss?'#ff4d9d':'#ff5b75';ctx.fillRect(enemy.x-enemy.radius,enemy.y-enemy.radius-9,w*Math.max(0,enemy.hp/enemy.maxHp),4);if(enemy.isBoss){ctx.fillStyle='#fff';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('BOSS',enemy.x,enemy.y-enemy.radius-15)}}
  for(const shot of shots){ctx.fillStyle=shot.color;ctx.beginPath();ctx.arc(shot.x,shot.y,shot.radius/2,0,7);ctx.fill()}
  const spec=types[selected],affordable=coins>=spec.cost;ctx.strokeStyle=!canBuild(mouse.x,mouse.y)||towers.some(t=>Math.hypot(t.x-mouse.x,t.y-mouse.y)<44)||!affordable?'#ff4d9d88':spec.color+'88';ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(mouse.x,mouse.y,spec.range,0,7);ctx.stroke();ctx.setLineDash([]);
}
function loop(){update();draw();requestAnimationFrame(loop)}
buildShop();updateUI();loop();
