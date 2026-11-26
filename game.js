const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const goldEl = document.getElementById('gold');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');
const statusEl = document.getElementById('status');
const startButton = document.getElementById('start-wave');
const railButton = document.getElementById('buy-railgun');
const path = [[-30,470],[120,470],[120,330],[330,330],[330,180],[565,180],[565,410],[760,410],[760,250],[990,250]];
const types = {
  pulse: { cost:100, range:115, damage:12, rate:22, color:'#72f1ff', shot:6 },
  cannon: { cost:160, range:145, damage:38, rate:58, color:'#ffb84d', shot:9 },
  frost: { cost:130, range:125, damage:7, rate:34, color:'#9fafff', shot:5, slow:0.55 },
  rail: { cost:0, range:205, damage:105, rate:78, color:'#ff70df', shot:11 }
};
let coins = 300;
let lives = 20;
let wave = 1;
let enemies = [];
let towers = [];
let shots = [];
let selected = 'pulse';
let running = false;
let paused = false;
let gameOver = false;
let spawnLeft = 0;
let spawnTimer = 0;
let bossPending = false;
let bossTimer = 0;
let railStock = 0;
let mouse = { x:0, y:0 };

function point(t) {
  const scaled = Math.max(0, t) * (path.length - 1);
  const i = Math.min(path.length - 2, Math.floor(scaled));
  const f = scaled - i;
  return { x:path[i][0] + (path[i+1][0] - path[i][0]) * f, y:path[i][1] + (path[i+1][1] - path[i][1]) * f };
}

function canBuild(x, y) {
  if (y < 55 || y > 545) return false;
  for (let i=0; i<path.length-1; i++) {
    const a=path[i], b=path[i+1], dx=b[0]-a[0], dy=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
    if (Math.hypot(x-(a[0]+t*dx),y-(a[1]+t*dy))<38) return false;
  }
  return true;
}

function updateUI() {
  goldEl.textContent = coins;
  livesEl.textContent = lives;
  waveEl.textContent = wave;
  document.getElementById('rail-stock').textContent = `×${railStock}`;
  railButton.querySelector('small').textContent = railStock ? 'Click to buy another • 350 coins' : 'Buy one • 350 coins';
}

canvas.addEventListener('mousemove', event => {
  const rect=canvas.getBoundingClientRect();
  mouse.x=(event.clientX-rect.left)*canvas.width/rect.width;
  mouse.y=(event.clientY-rect.top)*canvas.height/rect.height;
});

canvas.addEventListener('click', () => {
  if (gameOver) return;
  if (!canBuild(mouse.x,mouse.y)) { statusEl.textContent='Cannot build on the enemy route.'; return; }
  if (towers.some(t=>Math.hypot(t.x-mouse.x,t.y-mouse.y)<44)) { statusEl.textContent='Defense slot occupied.'; return; }
  if (selected==='rail') {
    if (railStock<1) { statusEl.textContent='Buy a railgun before placing it.'; return; }
    railStock--;
  } else {
    const cost=types[selected].cost;
    if (coins<cost) { statusEl.textContent='Not enough coins for that defense.'; return; }
    coins-=cost;
  }
  towers.push({type:selected,x:mouse.x,y:mouse.y,cool:0,angle:-Math.PI/2});
  updateUI();
});

document.querySelectorAll('.tower-card[data-type]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelector('.tower-card.selected')?.classList.remove('selected');
    button.classList.add('selected');
    selected=button.dataset.type;
    statusEl.textContent=`${selected.toUpperCase()} selected. Click open terrain to place it.`;
  });
});

railButton.addEventListener('click', () => {
  if (coins<350) { statusEl.textContent='You need 350 coins to buy a railgun.'; return; }
  coins-=350;
  railStock++;
  document.querySelector('.tower-card.selected')?.classList.remove('selected');
  selected='rail';
  updateUI();
  statusEl.textContent='Railgun purchased! Click open terrain to deploy it.';
});

startButton.addEventListener('click', () => {
  if (running || gameOver) return;
  running=true;
  spawnLeft=5+wave*2;
  spawnTimer=0;
  bossPending=wave%10===0;
  bossTimer=0;
  startButton.disabled=true;
  statusEl.textContent=bossPending ? `Wave ${wave}: boss signal detected!` : `Wave ${wave} incoming`;
});

document.getElementById('pause').addEventListener('click', event => {
  if (gameOver) return;
  paused=!paused;
  event.currentTarget.textContent=paused?'▶ RESUME':'Ⅱ PAUSE';
});

function spawnEnemy(isBoss=false) {
  const hp=(48+wave*18)*(isBoss?12:1);
  enemies.push({t:0,x:path[0][0],y:path[0][1],hp,maxHp:hp,speed:isBoss?0.0019:0.0038+wave*0.00012,slow:1,radius:isBoss?25:12,isBoss,color:isBoss?'#ff4d9d':'#ff7a91'});
}

function damageEnemy(enemy, damage) {
  if (!enemies.includes(enemy)) return;
  enemy.hp-=damage;
  if (enemy.hp<=0) {
    const reward=enemy.isBoss ? 250+wave*10 : 15+Math.floor(wave/3);
    coins+=reward;
    if (enemy.isBoss) statusEl.textContent=`BOSS DEFEATED! +${reward} coins`;
    enemies=enemies.filter(item=>item!==enemy);
    updateUI();
  }
}

function update() {
  if (paused || gameOver) return;
  if (running && spawnLeft>0 && ++spawnTimer>=40) {
    spawnTimer=0;
    spawnLeft--;
    spawnEnemy();
  }
  if (running && spawnLeft===0 && bossPending && enemies.length===0) {
    if (++bossTimer>50) { spawnEnemy(true); bossPending=false; statusEl.textContent=`BOSS INCOMING — wave ${wave}!`; }
  }

  for (const enemy of enemies) {
    enemy.t+=enemy.speed*enemy.slow;
    enemy.slow+=(1-enemy.slow)*0.035;
    const p=point(enemy.t);
    enemy.x=p.x; enemy.y=p.y;
  }
  for (let i=enemies.length-1;i>=0;i--) {
    if (enemies[i].t>=1) {
      lives-=enemies[i].isBoss?5:1;
      enemies.splice(i,1);
      if (lives<=0) {
        lives=0; gameOver=true; running=false;
        statusEl.textContent='CORE DESTROYED — refresh to restart';
        startButton.disabled=true;
      }
    }
  }

  for (const tower of towers) {
    tower.cool--;
    let target=null,furthest=-1;
    for (const enemy of enemies) {
      if (Math.hypot(enemy.x-tower.x,enemy.y-tower.y)<types[tower.type].range && enemy.t>furthest) { target=enemy; furthest=enemy.t; }
    }
    if (target && tower.cool<=0) {
      const spec=types[tower.type];
      shots.push({x:tower.x,y:tower.y,target,speed:tower.type==='rail'?18:14,color:spec.color,damage:spec.damage,slow:spec.slow||1,radius:spec.shot});
      tower.cool=spec.rate;
      tower.angle=Math.atan2(target.y-tower.y,target.x-tower.x);
    }
  }

  for (let i=shots.length-1;i>=0;i--) {
    const shot=shots[i], target=shot.target;
    if (!enemies.includes(target)) { shots.splice(i,1); continue; }
    const dx=target.x-shot.x,dy=target.y-shot.y,distance=Math.hypot(dx,dy);
    if (distance<shot.speed+target.radius) {
      damageEnemy(target,shot.damage);
      target.slow=Math.min(target.slow,shot.slow);
      shots.splice(i,1);
    } else { shot.x+=dx/distance*shot.speed; shot.y+=dy/distance*shot.speed; }
  }

  if (running && spawnLeft===0 && !bossPending && enemies.length===0) {
    running=false;
    const bonus=50+wave*10;
    coins+=bonus;
    statusEl.textContent=`Sector secured. +${bonus} wave bonus. Wave ${wave+1} ready.`;
    wave++;
    startButton.disabled=false;
  }
  updateUI();
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#091423'; ctx.fillRect(0,0,960,600);
  ctx.strokeStyle='#1b2b43'; ctx.lineWidth=2;
  for(let x=0;x<960;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,600);ctx.stroke();}
  for(let y=0;y<600;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke();}
  ctx.strokeStyle='#263956';ctx.lineWidth=68;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(path[0][0],path[0][1]);path.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));ctx.stroke();
  ctx.strokeStyle='#304963';ctx.lineWidth=2;ctx.setLineDash([12,14]);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#72f1ff';ctx.beginPath();ctx.arc(path[0][0]+10,path[0][1],12,0,7);ctx.fill();
  ctx.fillStyle='#ff4d9d';ctx.fillRect(930,215,30,70);

  for(const tower of towers){
    ctx.save();ctx.translate(tower.x,tower.y);ctx.fillStyle='#101b2c';ctx.beginPath();ctx.arc(0,0,22,0,7);ctx.fill();
    ctx.strokeStyle=types[tower.type].color;ctx.lineWidth=3;ctx.stroke();ctx.rotate(tower.angle);ctx.fillStyle=types[tower.type].color;ctx.fillRect(0,-4,30,8);ctx.restore();
  }
  for(const enemy of enemies){
    ctx.fillStyle='#070b14';ctx.beginPath();ctx.arc(enemy.x,enemy.y,enemy.radius+4,0,7);ctx.fill();
    ctx.fillStyle=enemy.color;ctx.beginPath();ctx.arc(enemy.x,enemy.y,enemy.radius,0,7);ctx.fill();
    const barWidth=enemy.radius*2;
    ctx.fillStyle='#401c32';ctx.fillRect(enemy.x-enemy.radius,enemy.y-enemy.radius-9,barWidth,4);
    ctx.fillStyle=enemy.isBoss?'#ff4d9d':'#ff5b75';ctx.fillRect(enemy.x-enemy.radius,enemy.y-enemy.radius-9,barWidth*Math.max(0,enemy.hp/enemy.maxHp),4);
    if(enemy.isBoss){ctx.fillStyle='#fff';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('BOSS',enemy.x,enemy.y-enemy.radius-15);}
  }
  for(const shot of shots){ctx.fillStyle=shot.color;ctx.beginPath();ctx.arc(shot.x,shot.y,shot.radius/2,0,7);ctx.fill();}
  const affordable=selected==='rail'?railStock>0:coins>=types[selected].cost;
  ctx.strokeStyle=!canBuild(mouse.x,mouse.y)||towers.some(t=>Math.hypot(t.x-mouse.x,t.y-mouse.y)<44)||!affordable?'#ff4d9d88':types[selected].color+'88';
  ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(mouse.x,mouse.y,types[selected].range,0,7);ctx.stroke();ctx.setLineDash([]);
}

function loop(){update();draw();requestAnimationFrame(loop);}
updateUI();
loop();
